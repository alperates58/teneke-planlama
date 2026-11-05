/**
 * Teneke Planlama - Parametrik Lak ve Ürün Kombinasyon Kuralları Motoru
 *
 * İŞ KURALLARI VE İLKELER:
 * 1. Ürünlerin lak durumu ayrı ve yönetilebilir bir özelliktir (LAKLI, LAKSIZ, BILINMIYOR).
 * 2. Bilinmeyen lak durumu otomatik olarak laklı veya laksız varsayılmaz.
 * 3. Çakışan kurallarda güvenli davranış uygulanır: açık yasaklar izinlerden önce değerlendirilir.
 *    Kural çakışması sessizce geçiştirilmez, kullanıcıya bildirilir.
 * 4. Kombinasyon uyumluluğu çift yönlü (simetrik) değerlendirilir: A ürünü B'ye izin verse bile
 *    B ürünü A'yı yasaklıyorsa aynı levhada birleştirilemez.
 * 5. Üç veya daha fazla çeşit bulunduğunda tüm ürünlerin kurallara birlikte uygunluğu doğrulanır.
 */

import {
  ProductCombinationRule,
  CombinationRuleType,
  LacquerStatus,
  RuleConflictInfo,
  CombinationRuleEvaluationResult
} from './types';

export interface ProductLike {
  productId?: string;
  stockCode?: string;
  stockName?: string;
  tubeSize?: string;
  diameterMm?: number;
  heightMm?: number;
  productGroup?: string;
  lacquer?: string | null;
  printSurface?: string;
  colors?: string[];
  repeatsPerSheet?: number;
}

export const INITIAL_COMBINATION_RULES: ProductCombinationRule[] = [
  {
    id: 'RULE-KMB-01',
    code: 'KRL-LAK-YASAK',
    name: 'Laklı ve Laksız Karışımı Açık Yasağı (Varsayılan)',
    rule_type: 'FORBID_MIXED_LACQUER',
    target_type: 'GLOBAL',
    priority: 10,
    is_active: true,
    description: 'Fırın kurutma ve vernik/lak hat farklılığı nedeniyle laklı ve laksız ürünler kesinlikle aynı levhada birleştirilemez.',
    is_system_default: true
  },
  {
    id: 'RULE-KMB-02',
    code: 'KRL-LAKSIZ-TEK',
    name: 'Laksız Ürünler Yalnız Laksızlarla Kombine Edilebilir',
    rule_type: 'ONLY_WITH_UNLACQUERED',
    target_type: 'LACQUER_STATUS',
    target_lacquer_status: 'LAKSIZ',
    priority: 20,
    is_active: true,
    description: 'Laksız olarak tanımlanmış ürünlerin montajında yer alacak diğer tüm ürünler de laksız olmalıdır.',
    is_system_default: true
  },
  {
    id: 'RULE-KMB-03',
    code: 'KRL-LAKLI-TEK',
    name: 'Laklı Ürünler Yalnız Laklılarla Kombine Edilebilir',
    rule_type: 'ONLY_WITH_LACQUERED',
    target_type: 'LACQUER_STATUS',
    target_lacquer_status: 'LAKLI',
    priority: 20,
    is_active: true,
    description: 'Laklı olarak tanımlanmış ürünlerin montajında yer alacak diğer tüm ürünler de laklı olmalıdır.',
    is_system_default: true
  },
  {
    id: 'RULE-KMB-04',
    code: 'KRL-SOLO-OZEL',
    name: 'Özel Seri Tek Başına Montaj Kuralı (Örnek Solo İş)',
    rule_type: 'EXCLUSIVE_SOLO_ONLY',
    target_type: 'PRODUCT',
    target_product_code: '519999010001',
    priority: 5,
    is_active: false,
    description: 'Bu ürün hassas formülasyona veya özel kalite kontrol şartına sahiptir; başka hiçbir ürünle birleştirilemez, tek başına basılır.',
    is_system_default: false
  },
  {
    id: 'RULE-KMB-05',
    code: 'KRL-CAPRAZ-KORUMA',
    name: 'Çapraz Bulaşma Koruma Yasağı (Oda Spreyi & Fırın Temizleyici)',
    rule_type: 'FORBIDDEN_WITH_PRODUCTS',
    target_type: 'PRODUCT',
    target_product_code: '511109010910-1001', // Örnek Vanilla Oda Spreyi
    param_product_codes: ['511121010410-5004'], // Newo Fırın Temizleyici
    priority: 15,
    is_active: false,
    description: 'Koku/kimyasal bulaşma riski nedeniyle oda spreyi ile fırın temizleyici formülasyonları aynı levhada basılamaz.',
    is_system_default: false
  }
];

/**
 * Lak durumunu kesin olarak normalize eder.
 * Bilinmeyen lak durumu otomatik laklı veya laksız varsayılmaz.
 */
export function normalizeLacquerStatus(lacquer?: string | null): LacquerStatus {
  if (!lacquer) return 'BILINMIYOR';
  const val = lacquer.trim().toUpperCase();
  if (val.startsWith('LAKLI')) return 'LAKLI';
  if (val.startsWith('LAKSIZ')) return 'LAKSIZ';
  return 'BILINMIYOR';
}

/**
 * Tarih aralığı kontrolü (valid_from / valid_to)
 */
export function isRuleDateActive(rule: ProductCombinationRule, checkDate?: string): boolean {
  if (!checkDate) return true;
  if (rule.valid_from && checkDate < rule.valid_from) return false;
  if (rule.valid_to && checkDate > rule.valid_to) return false;
  return true;
}

/**
 * Kuralın verilen ürünü kapsayıp kapsamadığını kontrol eder.
 */
export function doesRuleApplyToProduct(rule: ProductCombinationRule, product: ProductLike): boolean {
  if (rule.target_type === 'GLOBAL') return true;

  if (rule.target_type === 'PRODUCT') {
    const code = product.stockCode || product.productId;
    return !!(rule.target_product_code && code && rule.target_product_code === code);
  }

  if (rule.target_type === 'PRODUCT_GROUP') {
    return !!(rule.target_product_group && product.productGroup && rule.target_product_group.toLowerCase() === product.productGroup.toLowerCase());
  }

  if (rule.target_type === 'TUBE_SIZE') {
    return !!(rule.target_tube_size && product.tubeSize && rule.target_tube_size === product.tubeSize);
  }

  if (rule.target_type === 'LACQUER_STATUS') {
    const status = normalizeLacquerStatus(product.lacquer);
    return !!(rule.target_lacquer_status && rule.target_lacquer_status === status);
  }

  return false;
}

/**
 * Aktif kurallar içindeki çakışmaları tespit eder.
 * Açık yasaklar izinlerden önce değerlendirilir.
 */
export function detectRuleConflicts(rules: ProductCombinationRule[], checkDate?: string): RuleConflictInfo[] {
  const activeRules = rules
    .filter((r) => r.is_active && isRuleDateActive(r, checkDate))
    .sort((a, b) => a.priority - b.priority);

  const conflicts: RuleConflictInfo[] = [];

  const forbidMixed = activeRules.find((r) => r.rule_type === 'FORBID_MIXED_LACQUER');
  const allowMixed = activeRules.find((r) => r.rule_type === 'ALLOW_MIXED_LACQUER');

  if (forbidMixed && allowMixed) {
    conflicts.push({
      ruleACode: forbidMixed.code,
      ruleBCode: allowMixed.code,
      message: `Lak kuralı çakışması tespit edildi: [${forbidMixed.code}] laklı/laksız karışımını yasaklarken [${allowMixed.code}] izin veriyor.`,
      resolution: `Güvenlik kuralı uygulandı: Açık yasak (${forbidMixed.code}), izin kuralından (${allowMixed.code}) üstün tutuldu ve lak karışımı engellendi.`
    });
  }

  return conflicts;
}

/**
 * İki ürün arasındaki çift yönlü uyumluluğu değerlendirir (A -> B ve B -> A).
 */
export function evaluateProductPairCompatibility(
  productA: ProductLike,
  productB: ProductLike,
  rules: ProductCombinationRule[] = INITIAL_COMBINATION_RULES,
  checkDate?: string
): {
  isCompatible: boolean;
  reasons: string[];
  passedRules: string[];
  conflicts: RuleConflictInfo[];
} {
  const codeA = productA.stockCode || productA.productId || 'A';
  const codeB = productB.stockCode || productB.productId || 'B';

  // Aynı ürün kendi içinde her zaman uyumludur
  if (codeA === codeB) {
    return {
      isCompatible: true,
      reasons: [],
      passedRules: ['Aynı ürün çeşidi kendi içinde uyumludur.'],
      conflicts: []
    };
  }

  const conflicts = detectRuleConflicts(rules, checkDate);
  const activeRules = rules
    .filter((r) => r.is_active && isRuleDateActive(r, checkDate))
    .sort((a, b) => a.priority - b.priority);

  const reasons: string[] = [];
  const passedRules: string[] = [];

  const statusA = normalizeLacquerStatus(productA.lacquer);
  const statusB = normalizeLacquerStatus(productB.lacquer);

  // 1. Bilinmeyen Lak Durumu Denetimi
  // Kullanıcı kuralı: "Bilinmeyen lak durumu otomatik olarak laklı veya laksız varsayılmamalı."
  const hasMixedLacquerRules = activeRules.some(
    (r) => r.rule_type === 'FORBID_MIXED_LACQUER' || r.rule_type === 'ONLY_WITH_LACQUERED' || r.rule_type === 'ONLY_WITH_UNLACQUERED'
  );

  if (hasMixedLacquerRules) {
    if (statusA === 'BILINMIYOR') {
      reasons.push(`[${productA.stockName || codeA}] lak durumu BELİRTİLMEMİŞ / BİLİNMİYOR. Güvenlik gereği otomatik laklı/laksız varsayımı yapılamaz; kombinasyon engellendi.`);
    }
    if (statusB === 'BILINMIYOR') {
      reasons.push(`[${productB.stockName || codeB}] lak durumu BELİRTİLMEMİŞ / BİLİNMİYOR. Güvenlik gereği otomatik laklı/laksız varsayımı yapılamaz; kombinasyon engellendi.`);
    }
  }

  // 2. Laklı vs Laksız Karışım Kuralı (Açık yasaklar izinlerden önce değerlendirilir)
  const forbidMixed = activeRules.find((r) => r.rule_type === 'FORBID_MIXED_LACQUER');
  const allowMixed = activeRules.find((r) => r.rule_type === 'ALLOW_MIXED_LACQUER');

  if (statusA !== 'BILINMIYOR' && statusB !== 'BILINMIYOR') {
    if (statusA !== statusB) {
      if (forbidMixed) {
        reasons.push(`[${forbidMixed.code}] Lak Uyuşmazlığı: Biri laklı (${statusA === 'LAKLI' ? codeA : codeB}), diğeri laksız (${statusA === 'LAKSIZ' ? codeA : codeB}). Açık yasak gereği aynı levhada birleştirilemez.`);
      } else if (!allowMixed) {
        // İzin kuralı da yoksa varsayılan olarak reddet
        reasons.push(`Lak Uyuşmazlığı: ${codeA} (${statusA}) ile ${codeB} (${statusB}) farklı lak durumuna sahip.`);
      } else {
        passedRules.push(`[${allowMixed.code}] Laklı ve laksız karışımına izin kuralı uyarınca izin verildi.`);
      }
    } else {
      passedRules.push(`Lak uyumu sağlandı (Her iki ürün de ${statusA}).`);
    }
  }

  // 3. Tek Başına (EXCLUSIVE_SOLO_ONLY) Kontrolü
  for (const p of [productA, productB]) {
    const soloRule = activeRules.find((r) => r.rule_type === 'EXCLUSIVE_SOLO_ONLY' && doesRuleApplyToProduct(r, p));
    if (soloRule) {
      reasons.push(`[${soloRule.code} - ${soloRule.name}] Ürün (${p.stockName || p.stockCode}) özel solo montaj kuralına sahiptir, başka hiçbir ürünle birleştirilemez.`);
    }
  }

  // 4. Çift Yönlü Ürün ve Ürün Grubu Kuralları (A -> B ve B -> A)
  const evaluateDirectedRules = (source: ProductLike, target: ProductLike) => {
    const srcCode = source.stockCode || source.productId || '';
    const tgtCode = target.stockCode || target.productId || '';
    const tgtGroup = target.productGroup || '';

    for (const rule of activeRules) {
      if (!doesRuleApplyToProduct(rule, source)) continue;

      if (rule.rule_type === 'FORBIDDEN_WITH_PRODUCTS') {
        if (rule.param_product_codes && rule.param_product_codes.includes(tgtCode)) {
          reasons.push(`[${rule.code} - Açık Yasak] ${source.stockName || srcCode} ürünü, ${target.stockName || tgtCode} ürünü ile aynı levhada basılamaz.`);
        }
      } else if (rule.rule_type === 'FORBIDDEN_WITH_PRODUCT_GROUPS') {
        if (rule.param_product_groups && rule.param_product_groups.includes(tgtGroup)) {
          reasons.push(`[${rule.code} - Açık Yasak] ${source.stockName || srcCode} ürünü, [${tgtGroup}] grubundaki ürünlerle birleştirilemez.`);
        }
      } else if (rule.rule_type === 'ALLOWED_ONLY_WITH_PRODUCTS') {
        if (!rule.param_product_codes || !rule.param_product_codes.includes(tgtCode)) {
          reasons.push(`[${rule.code} - Kısıtlı İzin] ${source.stockName || srcCode} ürünü yalnızca izinli ürünlerle basılabilir; ${target.stockName || tgtCode} izinli listede yer almıyor.`);
        }
      } else if (rule.rule_type === 'ALLOWED_ONLY_WITH_PRODUCT_GROUPS') {
        if (!rule.param_product_groups || !rule.param_product_groups.includes(tgtGroup)) {
          reasons.push(`[${rule.code} - Kısıtlı İzin] ${source.stockName || srcCode} ürünü yalnızca izinli gruplarla basılabilir; ${tgtGroup} izinli değil.`);
        }
      } else if (rule.rule_type === 'ONLY_WITH_LACQUERED') {
        if (normalizeLacquerStatus(target.lacquer) !== 'LAKLI') {
          reasons.push(`[${rule.code}] ${source.stockName || srcCode} yalnız laklı ürünlerle basılabilir; ${target.stockName || tgtCode} laklı değildir.`);
        }
      } else if (rule.rule_type === 'ONLY_WITH_UNLACQUERED') {
        if (normalizeLacquerStatus(target.lacquer) !== 'LAKSIZ') {
          reasons.push(`[${rule.code}] ${source.stockName || srcCode} yalnız laksız ürünlerle basılabilir; ${target.stockName || tgtCode} laksız değildir.`);
        }
      }
    }
  };

  evaluateDirectedRules(productA, productB);
  evaluateDirectedRules(productB, productA);

  const isCompatible = reasons.length === 0;

  return {
    isCompatible,
    reasons,
    passedRules,
    conflicts
  };
}

/**
 * Birden fazla ürünün (örneğin 3 veya daha fazla çeşit) tümünün kurallara
 * birlikte uygunluğunu doğrular (Clique / All-Pair + Collective Check).
 */
export function evaluateMultiProductCompatibility(
  products: ProductLike[],
  rules: ProductCombinationRule[] = INITIAL_COMBINATION_RULES,
  checkDate?: string
): CombinationRuleEvaluationResult {
  if (products.length <= 1) {
    const p = products[0];
    const rulesEvaluated: CombinationRuleEvaluationResult['rulesEvaluated'] = [];
    const passedRules: string[] = [];
    const reasons: string[] = [];

    if (p) {
      const activeRules = rules.filter((r) => r.is_active && isRuleDateActive(r, checkDate));
      for (const rule of activeRules) {
        if (doesRuleApplyToProduct(rule, p)) {
          rulesEvaluated.push({
            ruleId: rule.id,
            ruleCode: rule.code,
            ruleName: rule.name,
            ruleType: rule.rule_type,
            status: 'passed',
            message: `Tek ürün (${p.stockName || p.stockCode}) için kural geçerli.`
          });
          passedRules.push(`[${rule.code}] Tek ürün kuralı uygun.`);
        }
      }
    }

    return {
      isCompatible: true,
      rulesEvaluated,
      conflicts: [],
      violationReasons: reasons,
      passedRules,
      unknownLacquerProducts: []
    };
  }

  const conflicts = detectRuleConflicts(rules, checkDate);
  const activeRules = rules
    .filter((r) => r.is_active && isRuleDateActive(r, checkDate))
    .sort((a, b) => a.priority - b.priority);

  const violationReasons: string[] = [];
  const passedRules: string[] = [];
  const rulesEvaluated: CombinationRuleEvaluationResult['rulesEvaluated'] = [];
  const unknownLacquerProducts: string[] = [];

  // 1. Bilinmeyen Lak Durumu Tespiti
  for (const p of products) {
    const st = normalizeLacquerStatus(p.lacquer);
    if (st === 'BILINMIYOR') {
      unknownLacquerProducts.push(p.stockName || p.stockCode || 'Bilinmeyen Ürün');
    }
  }

  // 2. Solo Kuralı Tespiti (Birden çok ürün varsa hiçbiri solo olamaz)
  for (const p of products) {
    const soloRule = activeRules.find((r) => r.rule_type === 'EXCLUSIVE_SOLO_ONLY' && doesRuleApplyToProduct(r, p));
    if (soloRule) {
      violationReasons.push(`[${soloRule.code} - ${soloRule.name}] Ürün [${p.stockName || p.stockCode}] solo üretim kuralına tabidir; başka ürünlerle birleştirilemez.`);
      rulesEvaluated.push({
        ruleId: soloRule.id,
        ruleCode: soloRule.code,
        ruleName: soloRule.name,
        ruleType: soloRule.rule_type,
        status: 'violated',
        message: `Solo kuralı ihlali: Ürün tek başına basılmalıdır.`
      });
    }
  }

  // 3. Kolektif Lak Kontrolü (Gruptaki tüm ürünlerin lak durumları)
  const lacquerStatuses = new Set(products.map((p) => normalizeLacquerStatus(p.lacquer)));
  const forbidMixed = activeRules.find((r) => r.rule_type === 'FORBID_MIXED_LACQUER');
  const allowMixed = activeRules.find((r) => r.rule_type === 'ALLOW_MIXED_LACQUER');

  if (lacquerStatuses.has('LAKLI') && lacquerStatuses.has('LAKSIZ')) {
    if (forbidMixed) {
      violationReasons.push(`[${forbidMixed.code}] Montajda hem LAKLI hem LAKSIZ ürünler bulunmaktadır. Açık yasak kuralı gereği aynı levhada basılamaz.`);
      rulesEvaluated.push({
        ruleId: forbidMixed.id,
        ruleCode: forbidMixed.code,
        ruleName: forbidMixed.name,
        ruleType: forbidMixed.rule_type,
        status: 'violated',
        message: 'Laklı ve laksız ürünlerin karışımı engellendi.'
      });
    } else if (!allowMixed) {
      violationReasons.push(`Montajda hem laklı hem laksız ürünler bulunmaktadır; lak karışımına izin veren aktif bir kural bulunmuyor.`);
    } else {
      passedRules.push(`[${allowMixed.code}] Lak karışımına izin kuralı uyarınca onaylandı.`);
      rulesEvaluated.push({
        ruleId: allowMixed.id,
        ruleCode: allowMixed.code,
        ruleName: allowMixed.name,
        ruleType: allowMixed.rule_type,
        status: 'passed',
        message: 'Lak karışım izni uygulandı.'
      });
    }
  }

  if (unknownLacquerProducts.length > 0) {
    const hasStrictLacquerRules = activeRules.some(
      (r) => r.rule_type === 'FORBID_MIXED_LACQUER' || r.rule_type === 'ONLY_WITH_LACQUERED' || r.rule_type === 'ONLY_WITH_UNLACQUERED'
    );
    if (hasStrictLacquerRules) {
      violationReasons.push(`Bilinmeyen Lak Durumu: ${unknownLacquerProducts.join(', ')} ürünlerinin lak durumu tanımsızdır. Otomatik varsayım yapılmaz; önce lak durumu tanımlanmalıdır.`);
    }
  }

  // 4. Bütün Ürün Çiftlerinin Karşılıklı (Pairwise) Denetimi
  for (let i = 0; i < products.length; i++) {
    for (let j = i + 1; j < products.length; j++) {
      const pairResult = evaluateProductPairCompatibility(products[i], products[j], rules, checkDate);
      if (!pairResult.isCompatible) {
        pairResult.reasons.forEach((r) => {
          if (!violationReasons.includes(r)) violationReasons.push(r);
        });
      }
    }
  }

  // Aktif kuralların kayıt altına alınması
  for (const rule of activeRules) {
    const appliesToAny = products.some((p) => doesRuleApplyToProduct(rule, p));
    if (appliesToAny && !rulesEvaluated.some((e) => e.ruleId === rule.id)) {
      const isViolated = violationReasons.some((vr) => vr.includes(rule.code));
      rulesEvaluated.push({
        ruleId: rule.id,
        ruleCode: rule.code,
        ruleName: rule.name,
        ruleType: rule.rule_type,
        status: isViolated ? 'violated' : 'passed',
        message: isViolated ? 'Kural koşulları sağlanamadı.' : 'Kural başarıyla doğrulandı.'
      });
      if (!isViolated) {
        passedRules.push(`[${rule.code}] ${rule.name}`);
      }
    }
  }

  return {
    isCompatible: violationReasons.length === 0,
    rulesEvaluated,
    conflicts,
    violationReasons,
    passedRules,
    unknownLacquerProducts
  };
}

/**
 * "Bu ürün hangi ürünlerle kombine edilebilir?" sorgulama fonksiyonu.
 * Verilen hedef ürünü, aday havuzundaki tüm ürünlerle tek tek test eder.
 */
export function queryCompatibleProducts(
  targetProduct: ProductLike,
  candidatePool: ProductLike[],
  rules: ProductCombinationRule[] = INITIAL_COMBINATION_RULES,
  checkDate?: string
): Array<{
  candidate: ProductLike;
  isCompatible: boolean;
  status: 'COMPATIBLE' | 'FORBIDDEN' | 'CONFLICT' | 'UNKNOWN_LACQUER';
  reasons: string[];
  passedRules: string[];
  conflicts: RuleConflictInfo[];
}> {
  return candidatePool.map((candidate) => {
    const pair = evaluateProductPairCompatibility(targetProduct, candidate, rules, checkDate);
    let status: 'COMPATIBLE' | 'FORBIDDEN' | 'CONFLICT' | 'UNKNOWN_LACQUER' = 'COMPATIBLE';

    if (!pair.isCompatible) {
      if (pair.reasons.some((r) => r.includes('BİLİNMİYOR') || r.includes('BELİRTİLMEMİŞ'))) {
        status = 'UNKNOWN_LACQUER';
      } else {
        status = 'FORBIDDEN';
      }
    } else if (pair.conflicts.length > 0) {
      status = 'CONFLICT';
    }

    return {
      candidate,
      isCompatible: pair.isCompatible,
      status,
      reasons: pair.reasons,
      passedRules: pair.passedRules,
      conflicts: pair.conflicts
    };
  });
}
