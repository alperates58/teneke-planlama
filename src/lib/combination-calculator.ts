/**
 * Teneke Planlama - Kombinasyon ve Baskı Hesaplama Motoru (Faz 0, 1 ve 2)
 *
 * KESİN KURALLAR:
 * 1. Levha kapasitesi hesaplanmaz; gerçek levha oranı ve kullanıcı tarafından tanımlanmış montaj düzeni görselleştirilir.
 * 2. Geometrik sığdırma veya nesting YAPILMAZ.
 * 3. Alternatif ham levha önerisi YAPILMAZ.
 * 4. Çap, boy, tanımlı ham levha ve aynı zemin eşitliği montaj şartıdır.
 * 5. Benzersiz renklerin birleşimi sayılır. Varsayılan sınır 6'dır.
 * 6. Varsayılan minimum baskı 1.250 levhadır.
 * 7. Ürün Tekrar Adımı Kuralı (Faz 2):
 *    Her ürünün tekrar sayısı, ilgili ebadın "Ürün Tekrar Adımı" değerinin pozitif tam katı olmalıdır.
 *    Kapasite = Montaj Grubu Sayısı × Ürün Tekrar Adımı.
 * 8. Teorik Adet = Tekrar × Levha Adedi.
 */

import {
  CombinationWorkbenchItem,
  CombinationValidationResult,
  SheetLayout,
  RecordKind,
  PrintingPressRule,
  LayoutRuleValidationResult,
  ProductCombinationRule
} from './types';
import { resolvePrintingRule, validateAndArrangePrintingGrid, INITIAL_PRINTING_PRESS_RULES } from './printing-press-rules';
import { evaluateMultiProductCompatibility, INITIAL_COMBINATION_RULES } from './combination-rules';

export const CAPACITY_STEP_LOOKUP: Record<string, { capacity: number; groups: number; step: number }> = {
  '45x100': { capacity: 48, groups: 8, step: 6 },
  '45x140': { capacity: 36, groups: 6, step: 6 },
  '45x175': { capacity: 30, groups: 6, step: 5 },
  '52x90':  { capacity: 45, groups: 9, step: 5 },
  '52x105': { capacity: 40, groups: 8, step: 5 },
  '52x132': { capacity: 30, groups: 6, step: 5 },
  '52x161': { capacity: 25, groups: 5, step: 5 },
  '52x165': { capacity: 25, groups: 5, step: 5 },
  '52x195': { capacity: 20, groups: 5, step: 4 },
  '52x214': { capacity: 20, groups: 5, step: 4 },
  '52x234': { capacity: 15, groups: 5, step: 3 },
  '65x104': { capacity: 32, groups: 8, step: 4 },
  '65x165': { capacity: 20, groups: 5, step: 4 },
  '65x195': { capacity: 16, groups: 4, step: 4 },
  '65x234': { capacity: 12, groups: 3, step: 4 },
  '65x240': { capacity: 12, groups: 3, step: 4 },
  '65x270': { capacity: 12, groups: 3, step: 4 },
  '65x300': { capacity: 12, groups: 3, step: 4 },
};

export interface CombinationItemInput {
  productId: string;
  stockCode: string;
  stockName: string;
  tubeSize: string;
  diameterMm: number;
  heightMm: number;
  rawSheetCode: string;
  printSurface: string;
  varnish?: string;
  lacquer?: string;
  insideCoating?: string;
  colors: string[];
  netDemand: number;
  repeatsPerSheet: number;
  recordKind?: RecordKind;
}

export function validateAndCalculateCombination(
  items: CombinationItemInput[],
  sheetCapacity: number,
  sheetCount: number = 1250,
  maxUniqueColors: number = 6,
  minPrintSheets: number = 1250,
  sheetLayout?: SheetLayout | null,
  capacityDetails?: { repeatStep: number; assemblyGroupCount: number } | null,
  printingPressRules?: PrintingPressRule[],
  combinationRules?: ProductCombinationRule[]
): {
  result: CombinationValidationResult;
  calculatedItems: CombinationWorkbenchItem[];
} {
  const messages: Array<{ type: 'success' | 'warning' | 'error' | 'info'; text: string }> = [];

  const firstSize = items.length > 0 ? items[0].tubeSize : '52x195';
  const lookup = CAPACITY_STEP_LOOKUP[firstSize];

  const repeatStep = capacityDetails?.repeatStep || lookup?.step || 0;
  const assemblyGroupCount = capacityDetails?.assemblyGroupCount || lookup?.groups || 0;

  if (items.length === 0) {
    return {
      result: {
        isValid: false,
        sizeMatch: true,
        surfaceMatch: true,
        rawSheetMatch: true,
        colorCount: 0,
        colorLimitSatisfied: true,
        uniqueColors: [],
        capacity: sheetCapacity,
        totalRepeats: 0,
        capacitySatisfied: true,
        isFullCapacity: false,
        remainingCapacity: sheetCapacity,
        minSheetSatisfied: sheetCount >= minPrintSheets,
        repeatStep,
        assemblyGroupCount,
        repeatStepMatch: true,
        repeatStepErrors: [],
        productionApprovalReady: false,
        layoutStatus: sheetLayout
          ? {
              isDefined: true,
              layout: sheetLayout,
              isConsistentWithCapacity: sheetLayout.rows * sheetLayout.cols === sheetCapacity,
              layoutSlots: sheetLayout.rows * sheetLayout.cols,
              message:
                sheetLayout.rows * sheetLayout.cols === sheetCapacity
                  ? `Tanımlı Düzen: ${sheetLayout.rows} × ${sheetLayout.cols} (${sheetLayout.rows * sheetLayout.cols} yuva)`
                  : `Düzen Uyuşmazlığı: ${sheetLayout.rows} × ${sheetLayout.cols} = ${sheetLayout.rows * sheetLayout.cols} yuva ≠ ${sheetCapacity} kapasite`,
            }
          : {
              isDefined: false,
              isConsistentWithCapacity: false,
              layoutSlots: 0,
              message: 'Montaj düzeni tanımlanmamış (fiziksel kalıp parametreleri bekleniyor).',
            },
        messages: [{ type: 'info', text: 'Kombinasyon için ürün seçiniz.' }],
      },
      calculatedItems: [],
    };
  }

  // 1. Çap ve Boy Eşitliği Kontrolü
  const sizeMatch = items.every((i) => i.tubeSize === firstSize);
  if (!sizeMatch) {
    const sizes = Array.from(new Set(items.map((i) => i.tubeSize))).join(', ');
    messages.push({
      type: 'error',
      text: `Ebat Uyuşmazlığı: Farklı ebatlardaki ürünler (${sizes}) aynı montaja konamaz. Tüm ürünlerin çap ve boyu eşit olmalıdır.`,
    });
  }

  // 2. Tanımlı Ham Levha Uygunluğu Kontrolü
  const firstRawSheet = items[0].rawSheetCode;
  const rawSheetMatch = items.every((i) => i.rawSheetCode === firstRawSheet);
  if (!rawSheetMatch) {
    const sheets = Array.from(new Set(items.map((i) => i.rawSheetCode || 'Tanımsız'))).join(', ');
    messages.push({
      type: 'error',
      text: `Ham Levha Uyuşmazlığı: Ürünlerin tanımlı ham levhaları eşleşmiyor (${sheets}).`,
    });
  }

  // 3. Aynı Zemin Koşulu Kontrolü
  const firstSurface = items[0].printSurface;
  const surfaceMatch = items.every((i) => i.printSurface === firstSurface);
  if (!surfaceMatch) {
    const surfaces = Array.from(new Set(items.map((i) => i.printSurface))).join(', ');
    messages.push({
      type: 'error',
      text: `Zemin Uyuşmazlığı: Farklı zeminler (${surfaces}) birlikte basılamaz (Metalik ile Emaye ayrı basılmalıdır).`,
    });
  }

  // 4. Benzersiz Renk Sayımı (Renk Birleşimi)
  const uniqueColorSet = new Set<string>();
  items.forEach((item) => {
    item.colors.forEach((c) => {
      const clean = c.trim().toUpperCase();
      if (clean) uniqueColorSet.add(clean);
    });
  });
  const uniqueColors = Array.from(uniqueColorSet);
  const colorCount = uniqueColors.length;
  const colorLimitSatisfied = colorCount <= maxUniqueColors;

  if (!colorLimitSatisfied) {
    messages.push({
      type: 'error',
      text: `Renk Sınırı Aşıldı: Montajdaki benzersiz renk sayısı ${colorCount}, izin verilen sınır ise ${maxUniqueColors} renktir! (${uniqueColors.join(', ')})`,
    });
  } else {
    messages.push({
      type: 'success',
      text: `Renk Uygun: Toplam ${colorCount} / ${maxUniqueColors} benzersiz renk (${uniqueColors.join(', ')}).`,
    });
  }

  // 5. ÜRÜN TEKRAR ADIMI DENETİMİ (Faz 2 Kesin İş Kuralı)
  const repeatStepErrors: Array<{
    productId: string;
    stockName: string;
    repeats: number;
    expectedStep: number;
    message: string;
  }> = [];

  if (repeatStep <= 0) {
    messages.push({
      type: 'error',
      text: `Montaj Parametreleri Eksik: ${firstSize} ebadı için montaj grubu sayısı ve ürün tekrar adımı parametresi tanımlanmamış.`,
    });
  } else {
    items.forEach((item) => {
      const r = Number(item.repeatsPerSheet) || 0;
      if (r <= 0) {
        repeatStepErrors.push({
          productId: item.productId,
          stockName: item.stockName,
          repeats: r,
          expectedStep: repeatStep,
          message: `${item.stockName}: Tekrar sayısı pozitif bir tam sayı olmalıdır.`,
        });
      } else if (r % repeatStep !== 0) {
        repeatStepErrors.push({
          productId: item.productId,
          stockName: item.stockName,
          repeats: r,
          expectedStep: repeatStep,
          message: `${item.tubeSize} için ürün tekrarları ${repeatStep}’in katı olmalıdır. Girilen tekrar: ${r}.`,
        });
      }
    });
  }

  const repeatStepMatch = repeatStep > 0 && repeatStepErrors.length === 0;

  if (!repeatStepMatch && repeatStep > 0) {
    repeatStepErrors.forEach((err) => {
      messages.push({
        type: 'error',
        text: err.message,
      });
    });
  } else if (repeatStepMatch) {
    messages.push({
      type: 'success',
      text: `Tekrar Adımı Uygun: Tüm ürün tekrarları ${repeatStep} tüplük grup adımının pozitif tam katıdır.`,
    });
  }

  // 6. Kapasite ve Tekrar Hesabı
  const totalRepeats = items.reduce((sum, i) => sum + (Number(i.repeatsPerSheet) || 0), 0);
  const remainingCapacity = sheetCapacity - totalRepeats;
  const capacitySatisfied = totalRepeats <= sheetCapacity;
  const isFullCapacity = totalRepeats === sheetCapacity;

  if (totalRepeats > sheetCapacity) {
    messages.push({
      type: 'error',
      text: `Kapasite Aşıldı: Toplam tekrar adedi (${totalRepeats}), levha kapasitesini (${sheetCapacity}) aşıyor! Fazlalık: ${totalRepeats - sheetCapacity} tekrar.`,
    });
  } else if (remainingCapacity > 0) {
    messages.push({
      type: 'warning',
      text: `Boş Kapasite: Levhada ${remainingCapacity} adet boş tüp yeri mevcuttur (Toplam ${totalRepeats}/${sheetCapacity}). Kısmi dolulukla taslak deneme yapılabilir; ancak tam kapasite veya üretime uygun gösterilemez.`,
    });
  } else {
    messages.push({
      type: 'success',
      text: `Tam Kapasite: Levha kapasitesi (${sheetCapacity}/${sheetCapacity}) eksiksiz dolduruldu.`,
    });
  }

  // 7. Minimum Baskı Levha Kontrolü
  const minSheetSatisfied = sheetCount >= minPrintSheets;
  if (!minSheetSatisfied) {
    messages.push({
      type: 'warning',
      text: `Minimum Baskı Uyarısı: Girilen ${sheetCount} levha, varsayılan minimum baskı sınırı olan ${minPrintSheets} levhanın altındadır.`,
    });
  }

  // 8. Montaj Düzeni Tutarlılık Denetimi (Fiziksel Düzen)
  let layoutStatus: CombinationValidationResult['layoutStatus'] = undefined;
  if (sheetLayout) {
    const layoutSlots = sheetLayout.rows * sheetLayout.cols;
    const isConsistent = layoutSlots === sheetCapacity;
    layoutStatus = {
      isDefined: true,
      layout: sheetLayout,
      isConsistentWithCapacity: isConsistent,
      layoutSlots,
      message: isConsistent
        ? `Kullanıcı tanımlı montaj düzeni (${sheetLayout.rows} × ${sheetLayout.cols} = ${layoutSlots} yuva) kapasiteyle tam uyumlu.`
        : `Düzen Uyuşmazlığı: Tanımlı montaj düzeni (${sheetLayout.rows} × ${sheetLayout.cols} = ${layoutSlots} yuva), hazır levha kapasitesi (${sheetCapacity} tüp) ile eşleşmiyor! Kapasite otomatik değiştirilmez.`,
    };

    if (!isConsistent) {
      messages.push({
        type: 'warning',
        text: `Düzen Uyuşmazlığı: Tanımlı montaj düzeni (${sheetLayout.rows} × ${sheetLayout.cols} = ${layoutSlots} yuva), hazır kapasite (${sheetCapacity}) ile uyuşmuyor.`,
      });
    }
  } else {
    layoutStatus = {
      isDefined: false,
      isConsistentWithCapacity: false,
      layoutSlots: 0,
      message: 'Fiziksel yerleşim tanımı eksik (CTP/kalıp montaj düzeni bekleniyor). Sahte hücre dizilimi üretilmez.',
    };
  }

  // 9. Teorik Ürün Çıktısı ve İhtiyaç Farkı Hesaplaması
  const calculatedItems: CombinationWorkbenchItem[] = items.map((item) => {
    const repeats = Number(item.repeatsPerSheet) || 0;
    const theoretical_units = repeats * sheetCount;
    const difference = theoretical_units - item.netDemand;
    const assigned_groups = repeatStep > 0 && repeats % repeatStep === 0 ? repeats / repeatStep : undefined;

    return {
      product_id: item.productId,
      stock_code: item.stockCode,
      stock_name: item.stockName,
      tube_size: item.tubeSize,
      print_surface: item.printSurface,
      varnish: item.varnish,
      lacquer: item.lacquer,
      inside_coating: item.insideCoating,
      colors: item.colors,
      net_demand: item.netDemand,
      repeats_per_sheet: repeats,
      assigned_groups,
      theoretical_units,
      difference,
      record_kind: item.recordKind || 'synthetic_demo',
    };
  });

  // 10. Matbaa Yerleşim Kuralları Çözümleme ve Izgara Doğrulaması
  const { rule: resolvedPrintingRule, isException: isPrintingException } = resolvePrintingRule(
    firstSize,
    items[0]?.diameterMm,
    items[0]?.heightMm,
    printingPressRules || INITIAL_PRINTING_PRESS_RULES
  );

  let printingRuleResult: LayoutRuleValidationResult | undefined = undefined;
  if (sheetLayout) {
    printingRuleResult = validateAndArrangePrintingGrid(sheetLayout, items, resolvedPrintingRule);
    if (!printingRuleResult.isValid) {
      printingRuleResult.violationMessages.forEach((msg) => {
        messages.push({ type: 'error', text: msg });
      });
      if (layoutStatus) {
        layoutStatus.message = `Matbaa Kuralı İhlali: ${printingRuleResult.violationMessages[0]}`;
      }
    } else {
      messages.push({
        type: 'success',
        text: `Matbaa Yerleşim Kuralı Uygun: [${resolvedPrintingRule.code} - ${resolvedPrintingRule.name}] ${
          resolvedPrintingRule.rule_type === 'SAME_VARIANT_PER_ROW' ? 'Satır' : 'Sütun'
        } homojenliği tam sağlandı (${
          resolvedPrintingRule.rule_type === 'SAME_VARIANT_PER_ROW'
            ? `${printingRuleResult.homogeneousRowsCount}/${printingRuleResult.totalRows} Satır`
            : `${printingRuleResult.homogeneousColsCount}/${printingRuleResult.totalCols} Sütun`
        }).`,
      });
    }
  }

  // 11. Parametrik Lak ve Ürün Kombinasyon Kuralları Değerlendirmesi
  const combinationRuleResult = evaluateMultiProductCompatibility(
    items.map((i) => ({
      productId: i.productId,
      stockCode: i.stockCode,
      stockName: i.stockName,
      tubeSize: i.tubeSize,
      diameterMm: i.diameterMm,
      heightMm: i.heightMm,
      lacquer: i.lacquer,
      printSurface: i.printSurface,
      colors: i.colors,
      repeatsPerSheet: i.repeatsPerSheet,
    })),
    combinationRules || INITIAL_COMBINATION_RULES
  );

  if (!combinationRuleResult.isCompatible) {
    combinationRuleResult.violationReasons.forEach((vr) => {
      messages.push({ type: 'error', text: vr });
    });
  } else {
    combinationRuleResult.passedRules.forEach((pr) => {
      messages.push({ type: 'success', text: `Kombinasyon Kuralı Uygun: ${pr}` });
    });
  }

  // Çakışan kurallar varsa açık yasak uygulandığı kullanıcıya açıkça gösterilir
  if (combinationRuleResult.conflicts.length > 0) {
    combinationRuleResult.conflicts.forEach((c) => {
      messages.push({
        type: 'warning',
        text: `Kural Çakışması [${c.ruleACode} vs ${c.ruleBCode}]: ${c.resolution}`,
      });
    });
  }

  // Genel Geçerlilik: Tüm kurallar + tekrar adımı kuralı + kapasiteyi aşmama + matbaa yerleşim + ürün kombinasyon kuralları
  const isValid =
    sizeMatch &&
    rawSheetMatch &&
    surfaceMatch &&
    colorLimitSatisfied &&
    capacitySatisfied &&
    repeatStepMatch &&
    totalRepeats > 0 &&
    (printingRuleResult ? printingRuleResult.isValid : true) &&
    combinationRuleResult.isCompatible;

  // Üretime Onaylanabilirlik: Geçerli ve tam dolu olmalıdır!
  const productionApprovalReady = isValid && isFullCapacity;

  return {
    result: {
      isValid,
      sizeMatch,
      surfaceMatch,
      rawSheetMatch,
      colorCount,
      colorLimitSatisfied,
      uniqueColors,
      capacity: sheetCapacity,
      totalRepeats,
      capacitySatisfied,
      isFullCapacity,
      remainingCapacity,
      minSheetSatisfied,
      repeatStep,
      assemblyGroupCount,
      repeatStepMatch,
      repeatStepErrors,
      productionApprovalReady,
      printingRuleResult,
      combinationRuleResult,
      layoutStatus,
      messages,
    },
    calculatedItems,
  };
}

export interface CandidateEvaluationLog {
  candidateId: string;
  candidateName: string;
  itemStockCodes: string[];
  tubeSize: string;
  resolvedPrintingRule: PrintingPressRule;
  combinationRulePassed: boolean;
  printingRulePassed: boolean;
  repeatStepPassed: boolean;
  isFullCapacity: boolean;
  status: 'ACCEPTED' | 'REJECTED';
  reasons: string[];
  rulesPassed: string[];
}

export interface OptimizationRunResult {
  success: boolean;
  message: string;
  bestLayout?: {
    tubeSize: string;
    rawSheetCode: string;
    items: CombinationItemInput[];
    printingRule: PrintingPressRule;
    gridResult?: LayoutRuleValidationResult;
  };
  evaluations: CandidateEvaluationLog[];
}

/**
 * Optimizasyon Arama ve Kural Denetleme Motoru:
 * 1. Yerleşim yönü kuralını çözer (standart sütun, istisnalar satır).
 * 2. Kombinasyona aday ürünlerin lak ve özel kurallarını değerlendirir.
 * 3. Uygun adaylardan kombinasyonlar oluşturur.
 * 4. Mevcut fiziksel yuva ve tekrar adımı parametrelerini uygular.
 * 5. Geçersiz kombinasyonları eler ve neden reddedildiğini kaydeder.
 * 6. En uygun montajı hesaplar; uygun çözüm yoksa açıkça belirtir.
 */
export function findOptimalSheetCombinations(
  candidateDemands: CombinationItemInput[],
  sheetLayouts: SheetLayout[],
  printingRules: PrintingPressRule[] = INITIAL_PRINTING_PRESS_RULES,
  combinationRules: ProductCombinationRule[] = INITIAL_COMBINATION_RULES
): OptimizationRunResult {
  const evaluations: CandidateEvaluationLog[] = [];

  if (candidateDemands.length === 0) {
    return {
      success: false,
      message: 'Optimizasyon için aday ürün bulunamadı.',
      evaluations: [],
    };
  }

  // 1. Teknik gruplama: Aynı ebat, aynı baskı yüzeyi ve aynı ham levha kodu
  const groupMap = new Map<string, CombinationItemInput[]>();
  for (const item of candidateDemands) {
    const key = `${item.tubeSize}__${item.printSurface}__${item.rawSheetCode || 'NO_SHEET'}`;
    const list = groupMap.get(key) || [];
    list.push(item);
    groupMap.set(key, list);
  }

  let bestAccepted: OptimizationRunResult['bestLayout'] | undefined = undefined;

  for (const [groupKey, groupItems] of groupMap.entries()) {
    const [tubeSize, surface, rawSheetCode] = groupKey.split('__');
    const layout = sheetLayouts.find((l) => l.tube_size === tubeSize);
    const lookup = CAPACITY_STEP_LOOKUP[tubeSize];
    const capacity = lookup?.capacity || (layout ? layout.rows * layout.cols : 20);
    const step = lookup?.step || (layout ? (layout.rows * layout.cols) / 5 : 4);

    const { rule: resolvedPrintingRule } = resolvePrintingRule(
      tubeSize,
      groupItems[0]?.diameterMm,
      groupItems[0]?.heightMm,
      printingRules
    );

    // Alt küme kombinasyonları (tekli, ikili, üçlü)
    const candidateSubsets: CombinationItemInput[][] = [];
    // Tekli
    groupItems.forEach((i) => candidateSubsets.push([i]));
    // İkili
    for (let i = 0; i < groupItems.length; i++) {
      for (let j = i + 1; j < groupItems.length; j++) {
        candidateSubsets.push([groupItems[i], groupItems[j]]);
      }
    }
    // Üçlü
    for (let i = 0; i < groupItems.length; i++) {
      for (let j = i + 1; j < groupItems.length; j++) {
        for (let k = j + 1; k < groupItems.length; k++) {
          candidateSubsets.push([groupItems[i], groupItems[j], groupItems[k]]);
        }
      }
    }

    for (let idx = 0; idx < candidateSubsets.length; idx++) {
      const subset = candidateSubsets[idx];
      const candidateId = `CAND-${tubeSize}-${idx + 1}`;
      const candidateName = subset.map((s) => s.stockName).join(' + ');
      const stockCodes = subset.map((s) => s.stockCode);

      // 2. Lak ve Özel Kombinasyon Kuralları Değerlendirmesi
      const combResult = evaluateMultiProductCompatibility(
        subset.map((s) => ({
          productId: s.productId,
          stockCode: s.stockCode,
          stockName: s.stockName,
          tubeSize: s.tubeSize,
          diameterMm: s.diameterMm,
          heightMm: s.heightMm,
          lacquer: s.lacquer,
          printSurface: s.printSurface,
          colors: s.colors,
        })),
        combinationRules
      );

      if (!combResult.isCompatible) {
        evaluations.push({
          candidateId,
          candidateName,
          itemStockCodes: stockCodes,
          tubeSize,
          resolvedPrintingRule,
          combinationRulePassed: false,
          printingRulePassed: false,
          repeatStepPassed: false,
          isFullCapacity: false,
          status: 'REJECTED',
          reasons: combResult.violationReasons,
          rulesPassed: combResult.passedRules,
        });
        continue;
      }

      // 3. Tekrar adımları ve fiziksel kapasite kontrolü
      // Eşit veya orantılı tekrar dağılımı denemesi (örneğin 2 ürün için yarı yarıya)
      let allocatedRepeats: number[] = [];
      const numItems = subset.length;

      if (numItems === 1) {
        allocatedRepeats = [capacity];
      } else if (numItems === 2) {
        const half = Math.floor(capacity / 2);
        const r1 = Math.round(half / step) * step;
        const r2 = capacity - r1;
        if (r1 > 0 && r2 > 0 && r2 % step === 0) {
          allocatedRepeats = [r1, r2];
        }
      } else if (numItems === 3) {
        // e.g. 52x195: 4 + 8 + 8 = 20
        const r1 = step;
        const remaining = capacity - r1;
        const r2 = Math.round(remaining / 2 / step) * step;
        const r3 = capacity - r1 - r2;
        if (r1 > 0 && r2 > 0 && r3 > 0 && r3 % step === 0) {
          allocatedRepeats = [r1, r2, r3];
        }
      }

      if (allocatedRepeats.length !== numItems || allocatedRepeats.reduce((a, b) => a + b, 0) !== capacity) {
        evaluations.push({
          candidateId,
          candidateName,
          itemStockCodes: stockCodes,
          tubeSize,
          resolvedPrintingRule,
          combinationRulePassed: true,
          printingRulePassed: false,
          repeatStepPassed: false,
          isFullCapacity: false,
          status: 'REJECTED',
          reasons: [`Kapasite tam doldurulamadı veya tekrar adımı (${step}) katları oluşturulamadı.`],
          rulesPassed: combResult.passedRules,
        });
        continue;
      }

      // 4. Matbaa Yerleşim Izgarası Doğrulaması
      const simulatedItems: CombinationItemInput[] = subset.map((s, i) => ({
        ...s,
        repeatsPerSheet: allocatedRepeats[i],
      }));

      let gridResult: LayoutRuleValidationResult | undefined = undefined;
      let gridValid = true;

      if (layout) {
        gridResult = validateAndArrangePrintingGrid(layout, simulatedItems, resolvedPrintingRule);
        gridValid = gridResult.isValid;
      }

      if (!gridValid) {
        evaluations.push({
          candidateId,
          candidateName,
          itemStockCodes: stockCodes,
          tubeSize,
          resolvedPrintingRule,
          combinationRulePassed: true,
          printingRulePassed: false,
          repeatStepPassed: true,
          isFullCapacity: true,
          status: 'REJECTED',
          reasons: gridResult ? gridResult.violationMessages : ['Matbaa yerleşim ızgara kuralı ihlali.'],
          rulesPassed: combResult.passedRules,
        });
        continue;
      }

      // Başarılı Aday
      evaluations.push({
        candidateId,
        candidateName,
        itemStockCodes: stockCodes,
        tubeSize,
        resolvedPrintingRule,
        combinationRulePassed: true,
        printingRulePassed: true,
        repeatStepPassed: true,
        isFullCapacity: true,
        status: 'ACCEPTED',
        reasons: [],
        rulesPassed: [
          ...combResult.passedRules,
          `Matbaa Kuralı: ${resolvedPrintingRule.code} [${resolvedPrintingRule.rule_type === 'SAME_VARIANT_PER_ROW' ? 'Satır' : 'Sütun'} Homojenliği Sağlandı]`,
          `Kapasite: ${capacity} tüp (%100 Doluluk)`,
        ],
      });

      if (!bestAccepted) {
        bestAccepted = {
          tubeSize,
          rawSheetCode,
          items: simulatedItems,
          printingRule: resolvedPrintingRule,
          gridResult,
        };
      }
    }
  }

  const success = !!bestAccepted;
  const message = success
    ? `Optimizasyon Başarılı: [${bestAccepted?.tubeSize}] ebadında ${bestAccepted?.items.length} çeşit ürün için geçerli montaj yerleşimi hesaplandı.`
    : `Kombinasyon kısıtları, matbaa yerleşim kuralı veya kapasite uyuşmazlığı nedeniyle uygun geçerli montaj bulunamadı. (${evaluations.length} aday elendi)`;

  return {
    success,
    message,
    bestLayout: bestAccepted,
    evaluations,
  };
}
