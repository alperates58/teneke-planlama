/**
 * Otomatik Birim Testleri: Kombinasyon ve Renk Hesaplama Motoru
 * AGENTS.md ve Faz 0-1 Kabul Koşulları Doğrulaması
 */

import { validateAndCalculateCombination, CombinationItemInput } from '../src/lib/combination-calculator';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`TEST BAŞARISIZ: ${message}`);
  }
  console.log(`✓ GEÇTİ: ${message}`);
}

export function runTests() {
  console.log('\n=== TENEKE PLANLAMA HESAPLAMA MOTORU TESTLERİ BAŞLIYOR ===\n');

  // 1. SOFT 4-8-8 Referans Hesabı Testi
  const softItems: CombinationItemInput[] = [
    {
      productId: 'DEM-001',
      stockCode: '511109010910-1001',
      stockName: 'VANILLA',
      tubeSize: '52x195',
      diameterMm: 52,
      heightMm: 195,
      rawSheetCode: '500011000004-1206',
      printSurface: 'EMAYE',
      colors: ['C', 'M', 'Y', 'K'],
      netDemand: 5000,
      repeatsPerSheet: 4,
    },
    {
      productId: 'DEM-002',
      stockCode: '511109010910-1002',
      stockName: 'OCEANIC',
      tubeSize: '52x195',
      diameterMm: 52,
      heightMm: 195,
      rawSheetCode: '500011000004-1206',
      printSurface: 'EMAYE',
      colors: ['C', 'M', 'Y', 'K'],
      netDemand: 10000,
      repeatsPerSheet: 8,
    },
    {
      productId: 'DEM-003',
      stockCode: '511109010910-1003',
      stockName: 'LAVENDER',
      tubeSize: '52x195',
      diameterMm: 52,
      heightMm: 195,
      rawSheetCode: '500011000004-1206',
      printSurface: 'EMAYE',
      colors: ['C', 'M', 'Y', 'K'],
      netDemand: 10000,
      repeatsPerSheet: 8,
    },
  ];

  const softResult = validateAndCalculateCombination(softItems, 20, 1250, 6, 1250);

  assert(softResult.result.isValid === true, 'SOFT montajı geçerli olmalıdır');
  assert(softResult.result.totalRepeats === 20, 'SOFT toplam tekrar 20 olmalıdır');
  assert(softResult.result.capacity === 20, '52x195 levha kapasitesi 20 olmalıdır');
  assert(softResult.result.remainingCapacity === 0, 'Boş kapasite 0 olmalıdır');
  assert(softResult.calculatedItems[0].theoretical_units === 5000, 'Vanilla teorik adet 5.000 olmalıdır (4 x 1.250)');
  assert(softResult.calculatedItems[1].theoretical_units === 10000, 'Oceanic teorik adet 10.000 olmalıdır (8 x 1.250)');
  assert(softResult.calculatedItems[2].theoretical_units === 10000, 'Lavender teorik adet 10.000 olmalıdır (8 x 1.250)');
  assert(softResult.result.colorCount === 4, 'CMYK renk sayısı 4 olmalıdır');

  // 2. 6 Renk Birleşimi Testi (CMYK + 368C + 357C)
  const sixColorItems: CombinationItemInput[] = [
    {
      productId: 'P1',
      stockCode: 'C1',
      stockName: 'PROD-A',
      tubeSize: '52x234',
      diameterMm: 52,
      heightMm: 234,
      rawSheetCode: '500011000004-1208',
      printSurface: 'EMAYE',
      colors: ['C', 'M', 'Y', 'K', '368C'],
      netDemand: 10000,
      repeatsPerSheet: 8,
    },
    {
      productId: 'P2',
      stockCode: 'C2',
      stockName: 'PROD-B',
      tubeSize: '52x234',
      diameterMm: 52,
      heightMm: 234,
      rawSheetCode: '500011000004-1208',
      printSurface: 'EMAYE',
      colors: ['C', 'M', 'Y', 'K', '357C'],
      netDemand: 8750,
      repeatsPerSheet: 7,
    },
  ];

  const sixColorRes = validateAndCalculateCombination(sixColorItems, 15, 1250, 6, 1250);
  assert(sixColorRes.result.colorCount === 6, 'Benzersiz renk sayısı 6 olmalıdır');
  assert(sixColorRes.result.colorLimitSatisfied === true, '6 renk sınırı GEÇERLİ olmalıdır');

  // 3. 7 Renk İhlali Testi (CMYK + 368C + 357C + 185C)
  const sevenColorItems: CombinationItemInput[] = [
    ...sixColorItems,
    {
      productId: 'P3',
      stockCode: 'C3',
      stockName: 'PROD-C',
      tubeSize: '52x234',
      diameterMm: 52,
      heightMm: 234,
      rawSheetCode: '500011000004-1208',
      printSurface: 'EMAYE',
      colors: ['C', 'M', 'Y', 'K', '185C'],
      netDemand: 5000,
      repeatsPerSheet: 3,
    },
  ];

  const sevenColorRes = validateAndCalculateCombination(sevenColorItems, 18, 1250, 6, 1250);
  assert(sevenColorRes.result.colorCount === 7, 'Benzersiz renk sayısı 7 olmalıdır');
  assert(sevenColorRes.result.colorLimitSatisfied === false, '7 renk sınırı İHLAL edilmelidir');
  assert(sevenColorRes.result.isValid === false, '7 renkli montaj geçersiz olmalıdır');

  // 4. Minimum Baskı Altı (500 Levha) Testi
  const minSheetRes = validateAndCalculateCombination(softItems, 20, 500, 6, 1250);
  assert(minSheetRes.result.minSheetSatisfied === false, '500 levha minimum baskı altında (1.250) uyarısı vermelidir');

  // 5. Ebat ve Zemin Uyuşmazlığı Testi
  const mismatchItems: CombinationItemInput[] = [
    softItems[0], // 52x195, EMAYE
    {
      productId: 'MIS-1',
      stockCode: 'MIS-C',
      stockName: 'MISMATCH',
      tubeSize: '65x104', // Farklı ebat
      diameterMm: 65,
      heightMm: 104,
      rawSheetCode: '500011000004-1408', // Farklı ham levha
      printSurface: 'METALİK', // Farklı zemin
      colors: ['C', 'M', 'Y', 'K'],
      netDemand: 10000,
      repeatsPerSheet: 5,
    },
  ];

  const mismatchRes = validateAndCalculateCombination(mismatchItems, 20, 1250, 6, 1250);
  assert(mismatchRes.result.sizeMatch === false, 'Farklı ebatlar uyuşmazlık vermelidir');
  assert(mismatchRes.result.surfaceMatch === false, 'Farklı zeminler uyuşmazlık vermelidir');
  assert(mismatchRes.result.rawSheetMatch === false, 'Farklı ham levhalar uyuşmazlık vermelidir');
  assert(mismatchRes.result.isValid === false, 'Uyuşmayan montaj geçersiz olmalıdır');

  // 6. Kapasite Aşımı Testi
  const overCapacityItems: CombinationItemInput[] = [
    { ...softItems[0], repeatsPerSheet: 12 },
    { ...softItems[1], repeatsPerSheet: 12 }, // Total 24 > 20
  ];
  const overCapacityRes = validateAndCalculateCombination(overCapacityItems, 20, 1250, 6, 1250);
  assert(overCapacityRes.result.capacitySatisfied === false, 'Kapasite aşımı tespit edilmelidir (24 > 20)');
  assert(overCapacityRes.result.isValid === false, 'Kapasite aşılan montaj geçersiz olmalıdır');

  console.log('\n=== TÜM TESTLER BAŞARIYLA TAMAMLANDI (6/6 KABUL SENARYOSU DOĞRULANDI) ===\n');
}
