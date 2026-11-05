/**
 * Teneke Planlama - Matbaa Yerleşim Kuralları Çözümleme ve Doğrulama Motoru
 *
 * ZORUNLU MATBAA KISITLARI:
 * 1. Varsayılan Kural: Levha üzerindeki her SÜTUN kendi içinde aynı ürün çeşidinden oluşmalıdır (SAME_VARIANT_PER_COLUMN).
 * 2. İstisnalar:
 *    - Çap 45 × Boy 100 mm (45x100)
 *    - Çap 52 × Boy 105 mm (52x105)
 *    - Çapı 65 mm olan tüm ürünler (boydan bağımsız, örn: 65x104, 65x165, 65x195, 65x234, 65x240, 65x270, 65x300, 65x157)
 *    Bu istisnalarda her SATIR kendi içinde aynı ürün çeşidinden oluşmalıdır (SAME_VARIANT_PER_ROW).
 * 3. Çeşit eşitliği renk veya görünen isimle değil, kesin variantKey (productId / stockCode) üzerinden doğrulanır.
 */

import { PrintingPressRule, PrintingRuleType, SheetLayout, GridCell, LayoutRuleValidationResult } from './types';

export const INITIAL_PRINTING_PRESS_RULES: PrintingPressRule[] = [
  {
    id: 'RULE-PRINT-45-100',
    code: 'KRL-MAT-01',
    name: '45×100 Satır Bazında Tek Çeşit (İstisna)',
    rule_type: 'SAME_VARIANT_PER_ROW',
    applies_to_diameter: 45,
    applies_to_height: 100,
    applies_to_tube_size: '45x100',
    priority: 10,
    is_active: true,
    description: '45×100 ebadındaki levhada her satır kendi içinde tek bir ürün çeşidinden oluşmalıdır.',
    is_system_default: true,
  },
  {
    id: 'RULE-PRINT-52-105',
    code: 'KRL-MAT-02',
    name: '52×105 Satır Bazında Tek Çeşit (İstisna)',
    rule_type: 'SAME_VARIANT_PER_ROW',
    applies_to_diameter: 52,
    applies_to_height: 105,
    applies_to_tube_size: '52x105',
    priority: 10,
    is_active: true,
    description: '52×105 ebadındaki levhada her satır kendi içinde tek bir ürün çeşidinden oluşmalıdır.',
    is_system_default: true,
  },
  {
    id: 'RULE-PRINT-65-ALL',
    code: 'KRL-MAT-03',
    name: 'Çap 65 mm Satır Bazında Tek Çeşit (Boydan Bağımsız İstisna)',
    rule_type: 'SAME_VARIANT_PER_ROW',
    applies_to_diameter: 65,
    applies_to_height: null,
    applies_to_tube_size: '65x*',
    priority: 20,
    is_active: true,
    description: 'Çapı 65 mm olan tüm kutularda (65×104, 65×165, 65×195, 65×234, 65×240, 65×270, 65×300 vb.) her satır kendi içinde tek çeşitten oluşmalıdır.',
    is_system_default: true,
  },
  {
    id: 'RULE-PRINT-DEFAULT',
    code: 'KRL-MAT-04',
    name: 'Varsayılan Sütun Bazında Tek Çeşit Kuralı',
    rule_type: 'SAME_VARIANT_PER_COLUMN',
    applies_to_diameter: null,
    applies_to_height: null,
    applies_to_tube_size: 'DEFAULT',
    priority: 100,
    is_active: true,
    description: 'İstisnalar dışındaki tüm ebatlarda (örn. 52×195, 52×214, 52×234, 45×140) her sütun kendi içinde tek bir ürün çeşidinden oluşmalıdır.',
    is_system_default: true,
  },
];

export interface ParsedTubeSize {
  diameter: number;
  height: number;
}

export function parseTubeDimensions(tubeSize: string): ParsedTubeSize {
  const parts = (tubeSize || '').toLowerCase().replace('çap', '').replace('boy', '').split('x');
  const d = parseInt(parts[0], 10) || 0;
  const h = parseInt(parts[1], 10) || 0;
  return { diameter: d, height: h };
}

/**
 * Verilen ebat için öncelik sırasına göre en uygun aktif matbaa yerleşim kuralını çözer.
 */
export function resolvePrintingRule(
  tubeSize: string,
  diameterParam?: number | null,
  heightParam?: number | null,
  rules: PrintingPressRule[] = INITIAL_PRINTING_PRESS_RULES
): { rule: PrintingPressRule; isException: boolean } {
  const parsed = parseTubeDimensions(tubeSize);
  const diameter = diameterParam != null && diameterParam > 0 ? diameterParam : parsed.diameter;
  const height = heightParam != null && heightParam > 0 ? heightParam : parsed.height;

  // Yalnız aktif kuralları al ve önceliğe göre sırala (küçük sayı = yüksek öncelik)
  const activeRules = rules
    .filter((r) => r.is_active)
    .sort((a, b) => a.priority - b.priority);

  // 1. Doğrudan ebat eşleşmesi (örn: '45x100' veya '52x105')
  const exactSizeRule = activeRules.find(
    (r) => r.applies_to_tube_size && r.applies_to_tube_size.toLowerCase() === tubeSize.toLowerCase()
  );
  if (exactSizeRule) {
    return { rule: exactSizeRule, isException: exactSizeRule.rule_type === 'SAME_VARIANT_PER_ROW' };
  }

  // 2. Çap ve Boy tam sayı eşleşmesi
  const exactDimensionsRule = activeRules.find(
    (r) => r.applies_to_diameter === diameter && r.applies_to_height === height
  );
  if (exactDimensionsRule) {
    return { rule: exactDimensionsRule, isException: exactDimensionsRule.rule_type === 'SAME_VARIANT_PER_ROW' };
  }

  // 3. Yalnız Çap eşleşmesi (örn: Çapı 65 mm olan tüm kutular)
  const diameterWildcardRule = activeRules.find((r) => {
    if (r.applies_to_diameter === diameter && (r.applies_to_height == null || r.applies_to_height === 0)) {
      return true;
    }
    if (r.applies_to_tube_size === `${diameter}x*` || (diameter === 65 && r.applies_to_tube_size === '65x*')) {
      return true;
    }
    return false;
  });
  if (diameterWildcardRule) {
    return { rule: diameterWildcardRule, isException: diameterWildcardRule.rule_type === 'SAME_VARIANT_PER_ROW' };
  }

  // 4. Varsayılan kural (DEFAULT veya en düşük öncelikli kural)
  const defaultRule =
    activeRules.find((r) => r.applies_to_tube_size === 'DEFAULT') ||
    activeRules[activeRules.length - 1] ||
    INITIAL_PRINTING_PRESS_RULES[3];

  return {
    rule: defaultRule,
    isException: defaultRule.rule_type === 'SAME_VARIANT_PER_ROW',
  };
}

export interface MinimalItemInput {
  productId?: string;
  product_id?: string;
  stockCode?: string;
  stock_code?: string;
  stockName?: string;
  stock_name?: string;
  repeats?: number;
  repeatsPerSheet?: number;
  repeats_per_sheet?: number;
}

/**
 * Fiziksel montaj ızgarasını (rows × cols) matbaa kuralına uygun olarak oluşturur ve
 * satır/sütun homojenliğini variantKey (productId/stockCode) üzerinden kesin olarak denetler.
 */
export function validateAndArrangePrintingGrid(
  layout: SheetLayout,
  items: MinimalItemInput[],
  rule: PrintingPressRule
): LayoutRuleValidationResult {
  const rows = layout.rows;
  const cols = layout.cols;
  const totalSlots = rows * cols;
  const violationMessages: string[] = [];

  // 1. Grid matrisini başlat
  const grid: GridCell[][] = [];
  for (let r = 0; r < rows; r++) {
    const rowArr: GridCell[] = [];
    for (let c = 0; c < cols; c++) {
      rowArr.push({
        rowIndex: r,
        colIndex: c,
        slotIndex: r * cols + c,
        productId: null,
        stockCode: null,
        stockName: null,
        variantKey: null,
        paletteIndex: 0,
        repeatIndex: 0,
        isViolated: false,
      });
    }
    grid.push(rowArr);
  }

  // 2. Ürünleri kuralın yönüne göre doldur:
  // SAME_VARIANT_PER_COLUMN -> sütun sütun doldur (Col 0, Col 1, Col 2...)
  // SAME_VARIANT_PER_ROW -> satır satır doldur (Row 0, Row 1, Row 2...)
  const isColumnRule = rule.rule_type === 'SAME_VARIANT_PER_COLUMN';

  if (isColumnRule) {
    let currentCol = 0;
    let currentRow = 0;

    items.forEach((item, itemIdx) => {
      const pid = item.productId || item.product_id || item.stockCode || item.stock_code || `P-${itemIdx}`;
      const scode = item.stockCode || item.stock_code || pid;
      const sname = item.stockName || item.stock_name || scode;
      const repeats = Number(item.repeats ?? item.repeatsPerSheet ?? item.repeats_per_sheet ?? 0);

      for (let rep = 0; rep < repeats; rep++) {
        if (currentCol < cols && currentRow < rows) {
          const cell = grid[currentRow][currentCol];
          cell.productId = pid;
          cell.stockCode = scode;
          cell.stockName = sname;
          cell.variantKey = pid; // Kesin çeşit kimliği
          cell.paletteIndex = itemIdx;
          cell.repeatIndex = rep + 1;

          currentRow++;
          if (currentRow >= rows) {
            currentRow = 0;
            currentCol++;
          }
        }
      }
    });
  } else {
    // SAME_VARIANT_PER_ROW -> Satır satır doldur
    let currentRow = 0;
    let currentCol = 0;

    items.forEach((item, itemIdx) => {
      const pid = item.productId || item.product_id || item.stockCode || item.stock_code || `P-${itemIdx}`;
      const scode = item.stockCode || item.stock_code || pid;
      const sname = item.stockName || item.stock_name || scode;
      const repeats = Number(item.repeats ?? item.repeatsPerSheet ?? item.repeats_per_sheet ?? 0);

      for (let rep = 0; rep < repeats; rep++) {
        if (currentRow < rows && currentCol < cols) {
          const cell = grid[currentRow][currentCol];
          cell.productId = pid;
          cell.stockCode = scode;
          cell.stockName = sname;
          cell.variantKey = pid; // Kesin çeşit kimliği
          cell.paletteIndex = itemIdx;
          cell.repeatIndex = rep + 1;

          currentCol++;
          if (currentCol >= cols) {
            currentCol = 0;
            currentRow++;
          }
        }
      }
    });
  }

  // 3. Kural Doğrulama: Satır veya Sütun Eşitliğini variantKey üzerinden incele
  const violatedRowIndices: number[] = [];
  const violatedColIndices: number[] = [];
  let homogeneousColsCount = 0;
  let homogeneousRowsCount = 0;

  if (isColumnRule) {
    // Sütun bazında tek çeşit kontrolü
    for (let c = 0; c < cols; c++) {
      const variantsInCol = new Set<string>();
      const namesInCol = new Set<string>();

      for (let r = 0; r < rows; r++) {
        const v = grid[r][c].variantKey;
        if (v) {
          variantsInCol.add(v);
          if (grid[r][c].stockName) namesInCol.add(grid[r][c].stockName!);
        }
      }

      if (variantsInCol.size > 1) {
        violatedColIndices.push(c);
        // Sütundaki tüm hücreleri ihlalli olarak işaretle
        for (let r = 0; r < rows; r++) {
          grid[r][c].isViolated = true;
          grid[r][c].violationMessage = `Sütun ${c + 1}'de karışık çeşitler: ${Array.from(namesInCol).join(', ')}`;
        }
        violationMessages.push(
          `Sütun ${c + 1} Kural İhlali: Farklı ürün çeşitleri (${Array.from(namesInCol).join(', ')}) aynı sütuna yerleştirilmiş! Sütun bazında tek çeşit kuralı (${rule.rule_type}) gereği her sütun kendi içinde tek bir çeşitten oluşmalıdır.`
        );
      } else {
        homogeneousColsCount++;
      }
    }
  } else {
    // Satır bazında tek çeşit kontrolü (SAME_VARIANT_PER_ROW)
    for (let r = 0; r < rows; r++) {
      const variantsInRow = new Set<string>();
      const namesInRow = new Set<string>();

      for (let c = 0; c < cols; c++) {
        const v = grid[r][c].variantKey;
        if (v) {
          variantsInRow.add(v);
          if (grid[r][c].stockName) namesInRow.add(grid[r][c].stockName!);
        }
      }

      if (variantsInRow.size > 1) {
        violatedRowIndices.push(r);
        // Satırdaki tüm hücreleri ihlalli olarak işaretle
        for (let c = 0; c < cols; c++) {
          grid[r][c].isViolated = true;
          grid[r][c].violationMessage = `Satır ${r + 1}'de karışık çeşitler: ${Array.from(namesInRow).join(', ')}`;
        }
        violationMessages.push(
          `Satır ${r + 1} Kural İhlali: Farklı ürün çeşitleri (${Array.from(namesInRow).join(', ')}) aynı satıra yerleştirilmiş! Satır bazında tek çeşit kuralı (${rule.rule_type}) gereği her satır kendi içinde tek bir çeşitten oluşmalıdır.`
        );
      } else {
        homogeneousRowsCount++;
      }
    }
  }

  const isValid = isColumnRule
    ? violatedColIndices.length === 0
    : violatedRowIndices.length === 0;

  return {
    ruleApplied: rule,
    isValid,
    ruleType: rule.rule_type,
    isException: rule.rule_type === 'SAME_VARIANT_PER_ROW',
    homogeneousRowsCount,
    homogeneousColsCount,
    totalRows: rows,
    totalCols: cols,
    violatedRowIndices,
    violatedColIndices,
    violationMessages,
    grid,
  };
}
