'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/lib/store';
import { AppShell } from '@/components/shell/AppShell';
import { EnterpriseBadge } from '@/components/ui/EnterpriseBadge';
import { ColorChip } from '@/components/ui/ColorChip';
import { validateAndCalculateCombination, CombinationItemInput } from '@/lib/combination-calculator';
import { formatNumber } from '@/lib/formatters';

const PRODUCT_PALETTES = [
  {
    bg: 'bg-amber-100',
    border: 'border-amber-400',
    text: 'text-amber-950',
    chip: 'bg-amber-500 text-white',
    badge: 'border-amber-400 bg-amber-50 text-amber-900',
  },
  {
    bg: 'bg-sky-100',
    border: 'border-sky-400',
    text: 'text-sky-950',
    chip: 'bg-sky-500 text-white',
    badge: 'border-sky-400 bg-sky-50 text-sky-900',
  },
  {
    bg: 'bg-purple-100',
    border: 'border-purple-400',
    text: 'text-purple-950',
    chip: 'bg-purple-500 text-white',
    badge: 'border-purple-400 bg-purple-50 text-purple-900',
  },
  {
    bg: 'bg-emerald-100',
    border: 'border-emerald-400',
    text: 'text-emerald-950',
    chip: 'bg-emerald-500 text-white',
    badge: 'border-emerald-400 bg-emerald-50 text-emerald-900',
  },
  {
    bg: 'bg-rose-100',
    border: 'border-rose-400',
    text: 'text-rose-950',
    chip: 'bg-rose-500 text-white',
    badge: 'border-rose-400 bg-rose-50 text-rose-900',
  },
  {
    bg: 'bg-teal-100',
    border: 'border-teal-400',
    text: 'text-teal-950',
    chip: 'bg-teal-500 text-white',
    badge: 'border-teal-400 bg-teal-50 text-teal-900',
  },
];

export default function KombinasyonPage() {
  const {
    demands,
    capacities,
    rawSheets,
    sheetLayouts,
    selectedDemandIds,
    setSelectedDemandIds,
    currentRole,
  } = useApp();

  // Workbench parameters
  const [sheetCount, setSheetCount] = useState<number>(1250);
  const [minPrintSheets, setMinPrintSheets] = useState<number>(1250);
  const [maxColors, setMaxColors] = useState<number>(6);

  // Active items in combination workbench
  const [workbenchItems, setWorkbenchItems] = useState<CombinationItemInput[]>([]);

  // Initialize workbench from selected demands or default to SOFT
  useEffect(() => {
    if (workbenchItems.length === 0) {
      if (selectedDemandIds.length > 0) {
        const initial = demands
          .filter((d) => selectedDemandIds.includes(d.id))
          .map((d) => ({
            productId: d.id,
            stockCode: d.stock_code,
            stockName: d.stock_name,
            tubeSize: d.tube_size,
            diameterMm: d.diameter_mm,
            heightMm: d.height_mm,
            rawSheetCode: d.raw_sheet_code,
            printSurface: d.print_surface,
            varnish: d.varnish,
            lacquer: d.lacquer,
            insideCoating: d.inside_coating,
            colors: d.colors,
            netDemand: d.net_quantity,
            repeatsPerSheet: d.tube_size === '52x195' ? (d.stock_name.includes('VANILLA') ? 4 : 8) : 4,
            recordKind: d.record_kind,
          }));
        setWorkbenchItems(initial);
      } else {
        loadScenarioSoft();
      }
    }
  }, [demands, selectedDemandIds]);

  // Lookup tube capacity from ready capacity parameters
  const activeTubeSize = workbenchItems.length > 0 ? workbenchItems[0].tubeSize : '52x195';
  const matchedCapacity = useMemo(() => {
    const found = capacities.find((c) => c.tube_size === activeTubeSize);
    return found ? found.units_per_sheet : 20;
  }, [capacities, activeTubeSize]);

  // Match active raw sheet
  const activeRawSheetCode = workbenchItems.length > 0 ? workbenchItems[0].rawSheetCode : '500011000004-1206';
  const matchedRawSheet = useMemo(() => {
    return rawSheets.find((r) => r.stock_code === activeRawSheetCode || r.tube_size === activeTubeSize);
  }, [rawSheets, activeRawSheetCode, activeTubeSize]);

  // Lookup user-defined sheet layout
  const matchedLayout = useMemo(() => {
    return sheetLayouts.find(
      (l) => l.tube_size === activeTubeSize && (!matchedRawSheet || l.raw_sheet_code === matchedRawSheet.stock_code)
    );
  }, [sheetLayouts, activeTubeSize, matchedRawSheet]);

  // Calculation results
  const { result, calculatedItems } = useMemo(() => {
    return validateAndCalculateCombination(
      workbenchItems,
      matchedCapacity,
      sheetCount,
      maxColors,
      minPrintSheets,
      matchedLayout
    );
  }, [workbenchItems, matchedCapacity, sheetCount, maxColors, minPrintSheets, matchedLayout]);

  // Aspect ratio calculation for physical sheet boundary
  const sheetAspectRatio = useMemo(() => {
    if (matchedRawSheet && matchedRawSheet.height_mm > 0) {
      return matchedRawSheet.width_mm / matchedRawSheet.height_mm;
    }
    return 832 / 800; // default 1.04
  }, [matchedRawSheet]);

  // Handler for repeat changes
  const handleRepeatChange = (productId: string, val: number) => {
    setWorkbenchItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, repeatsPerSheet: Math.max(0, val) } : item
      )
    );
  };

  // Remove item from workbench
  const handleRemoveItem = (productId: string) => {
    setWorkbenchItems((prev) => prev.filter((i) => i.productId !== productId));
    setSelectedDemandIds(selectedDemandIds.filter((id) => id !== productId));
  };

  // Add demand item from dropdown
  const handleAddFromDemand = (demandId: string) => {
    const demand = demands.find((d) => d.id === demandId);
    if (!demand) return;
    if (workbenchItems.some((i) => i.productId === demandId)) return;

    const newItem: CombinationItemInput = {
      productId: demand.id,
      stockCode: demand.stock_code,
      stockName: demand.stock_name,
      tubeSize: demand.tube_size,
      diameterMm: demand.diameter_mm,
      heightMm: demand.height_mm,
      rawSheetCode: demand.raw_sheet_code,
      printSurface: demand.print_surface,
      varnish: demand.varnish,
      lacquer: demand.lacquer,
      insideCoating: demand.inside_coating,
      colors: demand.colors,
      netDemand: demand.net_quantity,
      repeatsPerSheet: 2,
      recordKind: demand.record_kind,
    };
    setWorkbenchItems([...workbenchItems, newItem]);
    if (!selectedDemandIds.includes(demandId)) {
      setSelectedDemandIds([...selectedDemandIds, demandId]);
    }
  };

  // Presets
  const loadScenarioSoft = () => {
    setSheetCount(1250);
    const softDemands = demands.filter((d) =>
      ['DEM-001', 'DEM-002', 'DEM-003'].includes(d.id)
    );
    setWorkbenchItems([
      {
        productId: 'DEM-001',
        stockCode: '511109010910-1001',
        stockName: 'TUP-SOFT ODA SPR 300 ml (52x195)-VANILLA',
        tubeSize: '52x195',
        diameterMm: 52,
        heightMm: 195,
        rawSheetCode: '500011000004-1206',
        printSurface: 'EMAYE',
        varnish: 'BELİRTİLMEMİŞ',
        lacquer: 'BELİRTİLMEMİŞ',
        insideCoating: 'GOLD',
        colors: ['C', 'M', 'Y', 'K'],
        netDemand: 5000,
        repeatsPerSheet: 4,
        recordKind: 'synthetic_demo',
      },
      {
        productId: 'DEM-002',
        stockCode: '511109010910-1002',
        stockName: 'TUP-SOFT ODA SPR 300 ml (52x195)-OCEANIC',
        tubeSize: '52x195',
        diameterMm: 52,
        heightMm: 195,
        rawSheetCode: '500011000004-1206',
        printSurface: 'EMAYE',
        varnish: 'BELİRTİLMEMİŞ',
        lacquer: 'BELİRTİLMEMİŞ',
        insideCoating: 'GOLD',
        colors: ['C', 'M', 'Y', 'K'],
        netDemand: 10000,
        repeatsPerSheet: 8,
        recordKind: 'synthetic_demo',
      },
      {
        productId: 'DEM-003',
        stockCode: '511109010910-1003',
        stockName: 'TUP-SOFT ODA SPR 300 ml (52x195)-LAVENDER',
        tubeSize: '52x195',
        diameterMm: 52,
        heightMm: 195,
        rawSheetCode: '500011000004-1206',
        printSurface: 'EMAYE',
        varnish: 'BELİRTİLMEMİŞ',
        lacquer: 'BELİRTİLMEMİŞ',
        insideCoating: 'GOLD',
        colors: ['C', 'M', 'Y', 'K'],
        netDemand: 10000,
        repeatsPerSheet: 8,
        recordKind: 'synthetic_demo',
      },
    ]);
  };

  const loadScenarioColor6 = () => {
    setSheetCount(1250);
    setWorkbenchItems([
      {
        productId: 'DEM-007',
        stockCode: '511109010910-7284',
        stockName: 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-CITRUS FEST',
        tubeSize: '52x234',
        diameterMm: 52,
        heightMm: 234,
        rawSheetCode: '500011000004-1208',
        printSurface: 'EMAYE',
        varnish: 'PARLAK',
        lacquer: 'LAKLI',
        insideCoating: 'BELİRTİLMEMİŞ',
        colors: ['C', 'M', 'Y', 'K', '368C', '357C'],
        netDemand: 18750,
        repeatsPerSheet: 7,
        recordKind: 'source_transcription',
      },
      {
        productId: 'DEM-008',
        stockCode: '511109010910-7285',
        stockName: 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-ELEGANT AMBER',
        tubeSize: '52x234',
        diameterMm: 52,
        heightMm: 234,
        rawSheetCode: '500011000004-1208',
        printSurface: 'EMAYE',
        varnish: 'PARLAK',
        lacquer: 'LAKLI',
        insideCoating: 'BELİRTİLMEMİŞ',
        colors: ['C', 'M', 'Y', 'K', '368C', '357C'],
        netDemand: 18750,
        repeatsPerSheet: 8,
        recordKind: 'source_transcription',
      },
    ]);
  };

  const loadScenarioColor7Violation = () => {
    setSheetCount(1250);
    setWorkbenchItems([
      {
        productId: 'DEM-007',
        stockCode: '511109010910-7284',
        stockName: 'TUP-GW-MS ODA ALKOL-400 ml (52x234)-CITRUS FEST',
        tubeSize: '52x234',
        diameterMm: 52,
        heightMm: 234,
        rawSheetCode: '500011000004-1208',
        printSurface: 'EMAYE',
        varnish: 'PARLAK',
        lacquer: 'LAKLI',
        insideCoating: 'BELİRTİLMEMİŞ',
        colors: ['C', 'M', 'Y', 'K', '368C', '357C'],
        netDemand: 18750,
        repeatsPerSheet: 7,
        recordKind: 'source_transcription',
      },
      {
        productId: 'DEM-EXTRA-185',
        stockCode: '511109010910-EXTRA',
        stockName: 'TUP-TEST ODA SPR (52x234)-RED ACCENT',
        tubeSize: '52x234',
        diameterMm: 52,
        heightMm: 234,
        rawSheetCode: '500011000004-1208',
        printSurface: 'EMAYE',
        varnish: 'PARLAK',
        lacquer: 'LAKLI',
        insideCoating: 'BELİRTİLMEMİŞ',
        colors: ['C', 'M', 'Y', 'K', '185C'],
        netDemand: 10000,
        repeatsPerSheet: 8,
        recordKind: 'synthetic_demo',
      },
    ]);
  };

  const loadScenarioUndefinedLayout = () => {
    setSheetCount(1250);
    setWorkbenchItems([
      {
        productId: 'DEM-021',
        stockCode: '519999010001',
        stockName: 'TUP-DENEME ODOR SPR 200 ml (45x100)-MISSING-SHEET',
        tubeSize: '45x100',
        diameterMm: 45,
        heightMm: 100,
        rawSheetCode: '',
        printSurface: 'EMAYE',
        varnish: 'PARLAK',
        lacquer: 'LAKLI',
        insideCoating: 'STANDART',
        colors: ['C', 'M', 'Y', 'K'],
        netDemand: 30000,
        repeatsPerSheet: 10,
        recordKind: 'synthetic_demo',
      },
    ]);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Kombinasyon ve Baskı Çalışma Alanı
              </h1>
              <EnterpriseBadge variant="neutral" size="sm">
                Faz 2
              </EnterpriseBadge>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Fiziksel ham levha oranına ve kullanıcı tanımlı montaj düzenine göre manuel dağılım ve teorik adet hesabı.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-500">Hazır Senaryolar:</span>
            <button
              onClick={loadScenarioSoft}
              className="px-2.5 py-1 text-xs font-mono bg-sky-50 text-sky-700 hover:bg-sky-100 rounded border border-sky-300 transition-colors"
            >
              SOFT 4-8-8
            </button>
            <button
              onClick={loadScenarioColor6}
              className="px-2.5 py-1 text-xs font-mono bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-300 transition-colors"
            >
              6 Renk Uygun
            </button>
            <button
              onClick={loadScenarioColor7Violation}
              className="px-2.5 py-1 text-xs font-mono bg-rose-50 text-rose-700 hover:bg-rose-100 rounded border border-rose-300 transition-colors"
            >
              7 Renk İhlali
            </button>
            <button
              onClick={loadScenarioUndefinedLayout}
              className="px-2.5 py-1 text-xs font-mono bg-amber-50 text-amber-700 hover:bg-amber-100 rounded border border-amber-300 transition-colors"
            >
              Tanımsız Düzen
            </button>
          </div>
        </div>

        {/* Global Mandatory Rule Reminder */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
          <span className="text-amber-600 font-bold">ℹ</span>
          <div className="flex-1 space-y-0.5">
            <p className="font-semibold">
              İlke: Levha kapasitesi hesaplanmaz; gerçek levha oranı ve kullanıcı tarafından tanımlanmış montaj düzeni görselleştirilir.
            </p>
            <p className="text-[11px] text-amber-800">
              Bu ekran manuel deneme alanıdır; optimizasyon veya otomatik dağılım uygulanmamıştır. Çıkan sonuçlar fiziksel montaj ve CTP doğrulaması yapılmadan onaylı üretim planı sayılamaz.
            </p>
          </div>
        </div>

        {/* Grid Layout: Left 2 Cols (Workbench & Visualizer), Right 1 Col (Validation) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Top Toolbar: Global Parameters */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <label className="text-[11px] font-mono text-slate-500 block">Basılacak Levha Adedi:</label>
                  <div className="flex items-center gap-2 mt-0.5">
                    <input
                      type="number"
                      min="1"
                      step="50"
                      value={sheetCount}
                      onChange={(e) => setSheetCount(Math.max(1, parseInt(e.target.value, 10) || 0))}
                      className="w-28 bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold text-sm px-2.5 py-1 rounded focus:border-sky-500 outline-none"
                    />
                    <span className="text-xs text-slate-500 font-mono">Levha</span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-500 block">Levha Kapasitesi (Hazır):</label>
                  <div className="mt-0.5">
                    <span className="bg-slate-100 border border-slate-300 text-sky-800 font-mono font-bold text-sm px-3 py-1 rounded inline-block">
                      {matchedCapacity} Tüp / Levha
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-500 block">Bağlı Ham Levha:</label>
                  <div className="mt-0.5 text-xs font-mono text-slate-700">
                    {matchedRawSheet ? (
                      <span>
                        <b>{matchedRawSheet.width_mm} × {matchedRawSheet.height_mm} mm</b> (Kalınlık: {matchedRawSheet.thickness_source_value} mm)
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold">Tanımlı Ham Levha Yok</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick add product dropdown */}
              <div className="w-full sm:w-auto">
                <label className="text-[11px] font-mono text-slate-500 block">Taleplerden Ürün Ekle:</label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddFromDemand(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="mt-0.5 w-full sm:w-60 bg-white border border-slate-300 text-slate-800 text-xs rounded px-2 py-1 outline-none focus:border-sky-500 shadow-xs"
                >
                  <option value="">+ İhtiyaç Havuzundan Seç...</option>
                  {demands.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.tube_size} | {d.stock_name.slice(0, 32)}...
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Workbench Table */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
              <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  MONTAJDAKİ ÜRÜNLER VE TEKRAR DAĞILIMI ({workbenchItems.length} Kalem)
                </span>
                <span className="text-[11px] font-mono text-slate-600">
                  Toplam Tekrar: <b className="text-slate-900">{result.totalRepeats}</b> / {result.capacity}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-semibold uppercase tracking-wider text-slate-600 text-[10px]">
                      <th className="py-2.5 px-3">Ürün / Stok Kodu</th>
                      <th className="py-2.5 px-2">Ebat</th>
                      <th className="py-2.5 px-2">Zemin</th>
                      <th className="py-2.5 px-2">İç Kaplama</th>
                      <th className="py-2.5 px-2">Renkler</th>
                      <th className="py-2.5 px-2 text-right">Net Talep</th>
                      <th className="py-2.5 px-2 text-center w-28">Tekrar / Levha</th>
                      <th className="py-2.5 px-2 text-right">Teorik Çıktı</th>
                      <th className="py-2.5 px-2 text-right">İhtiyaç Farkı</th>
                      <th className="py-2.5 px-2 text-center w-10">Sil</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {calculatedItems.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-10 text-center text-slate-400 font-mono">
                          Montaja eklenmiş ürün yok. Yukarıdaki senaryolardan birini seçin veya ihtiyaç havuzundan ürün aktarın.
                        </td>
                      </tr>
                    ) : (
                      calculatedItems.map((item, idx) => {
                        const palette = PRODUCT_PALETTES[idx % PRODUCT_PALETTES.length];
                        return (
                          <tr key={item.product_id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full flex-shrink-0 ${palette.chip}`} />
                                <span className="font-semibold text-slate-900 line-clamp-1">{item.stock_name}</span>
                              </div>
                              <div className="text-[10px] font-mono text-slate-500 pl-5">
                                {item.stock_code} {item.record_kind === 'synthetic_demo' && <span className="text-amber-600">(Temsili Demo)</span>}
                              </div>
                            </td>
                            <td className="py-2.5 px-2 font-mono text-slate-700">{item.tube_size}</td>
                            <td className="py-2.5 px-2">
                              <EnterpriseBadge variant={item.print_surface === 'METALİK' ? 'purple' : 'neutral'} size="sm">
                                {item.print_surface}
                              </EnterpriseBadge>
                            </td>
                            <td className="py-2.5 px-2">
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                                item.inside_coating === 'GOLD'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                                {item.inside_coating || 'BELİRTİLMEMİŞ'}
                              </span>
                            </td>
                            <td className="py-2.5 px-2">
                              <div className="flex flex-wrap gap-1">
                                {item.colors.map((c, i) => (
                                  <ColorChip key={i} color={c} />
                                ))}
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono text-slate-600">
                              {formatNumber(item.net_demand)}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <div className="inline-flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max={matchedCapacity}
                                  value={item.repeats_per_sheet}
                                  onChange={(e) =>
                                    handleRepeatChange(item.product_id, parseInt(e.target.value, 10) || 0)
                                  }
                                  className="w-14 bg-white border border-slate-300 text-sky-700 font-mono font-bold text-center rounded py-1 focus:border-sky-500 outline-none shadow-xs"
                                />
                                <span className="text-[10px] text-slate-500 font-mono">tekrar</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">
                              {formatNumber(item.theoretical_units)}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono">
                              {item.difference > 0 ? (
                                <span className="text-amber-700 font-semibold" title="Baskı fazlası ürün">
                                  +{formatNumber(item.difference)}
                                </span>
                              ) : item.difference < 0 ? (
                                <span className="text-rose-700 font-semibold" title="İhtiyacı karşılamayan eksik">
                                  {formatNumber(item.difference)}
                                </span>
                              ) : (
                                <span className="text-emerald-700 font-bold">Tam (0)</span>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <button
                                onClick={() => handleRemoveItem(item.product_id)}
                                className="text-slate-400 hover:text-rose-600 font-mono p-1"
                                title="Montajdan Çıkar"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer Totals */}
              {calculatedItems.length > 0 && (
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                  <div className="flex items-center gap-4">
                    <div>
                      Toplam Çıktı:{' '}
                      <b className="text-slate-900">
                        {formatNumber(
                          calculatedItems.reduce((acc, i) => acc + i.theoretical_units, 0)
                        )}{' '}
                        Tüp
                      </b>
                    </div>
                    <div>
                      Toplam Levha: <b className="text-sky-700">{formatNumber(sheetCount)} Adet</b>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">Kapasite Doluluğu:</span>
                    <EnterpriseBadge
                      variant={
                        result.totalRepeats === result.capacity
                          ? 'success'
                          : result.totalRepeats > result.capacity
                          ? 'critical'
                          : 'warning'
                      }
                    >
                      {result.totalRepeats} / {result.capacity} Tekrar
                    </EnterpriseBadge>
                  </div>
                </div>
              )}
            </div>

            {/* GERÇEK LEVHA GÖRÜNÜMÜ & MONTAJ GÖRSELLEŞTİRİCİSİ */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      FİZİKSEL LEVHA VE MONTAJ GÖRÜNÜMÜ
                    </span>
                    {matchedLayout && (
                      <EnterpriseBadge
                        variant={
                          matchedLayout.verification_status === 'verified'
                            ? 'success'
                            : matchedLayout.verification_status === 'provisional'
                            ? 'warning'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {matchedLayout.verification_status === 'verified'
                          ? 'Doğrulanmış Düzen'
                          : matchedLayout.verification_status === 'provisional'
                          ? 'Geçici Montaj Taslağı'
                          : 'Doğrulanmamış'}
                      </EnterpriseBadge>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                    {matchedRawSheet ? (
                      <span>
                        Ölçüler: <b>{matchedRawSheet.width_mm} × {matchedRawSheet.height_mm} mm</b> (En × Boy) | Oran: <b>{sheetAspectRatio.toFixed(2)}:1</b> | Kalınlık: {matchedRawSheet.thickness_source_value} mm
                      </span>
                    ) : (
                      <span>Ham levha ölçüsü bulunamadı</span>
                    )}
                  </div>
                </div>

                <div className="text-[11px] font-mono text-slate-500">
                  {matchedLayout ? (
                    <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200">
                      Tanımlı: <b>{matchedLayout.rows} Satır × {matchedLayout.cols} Sütun</b> ({matchedLayout.rows * matchedLayout.cols} Yuva) | Yön: {matchedLayout.orientation === 'landscape' ? 'Yatay' : 'Dikey'}
                    </span>
                  ) : (
                    <span className="text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                      Montaj düzeni tanımlanmamış
                    </span>
                  )}
                </div>
              </div>

              {/* Layout Mismatch Warning if rows * cols != capacity */}
              {matchedLayout && matchedLayout.rows * matchedLayout.cols !== matchedCapacity && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900 flex items-start gap-2">
                  <span className="text-amber-600 font-bold">⚠️</span>
                  <div>
                    <span className="font-bold">Düzen Uyuşmazlığı:</span> Tanımlı montaj düzeni ({matchedLayout.rows} × {matchedLayout.cols} = {matchedLayout.rows * matchedLayout.cols} yuva), hazır levha kapasitesi ({matchedCapacity} tüp) ile eşleşmiyor! Kapasite değeri otomatik değiştirilmez.
                  </div>
                </div>
              )}

              {/* Physical Sheet Outer Container */}
              <div className="bg-slate-100 p-4 rounded-lg border border-slate-200 overflow-x-auto flex justify-center">
                {matchedLayout ? (
                  /* Fixed Grid Container with exact physical aspect ratio and consistent layout across screen sizes */
                  <div
                    className="relative bg-white border-2 border-slate-800 rounded shadow-md p-3 flex flex-col justify-between"
                    style={{
                      aspectRatio: `${sheetAspectRatio}`,
                      width: '100%',
                      maxWidth: '640px',
                      minWidth: '420px',
                      minHeight: '260px',
                    }}
                  >
                    {/* Raw sheet dimension indicators */}
                    <div className="absolute top-1 left-2 text-[9px] font-mono text-slate-500">
                      {matchedRawSheet?.width_mm} mm (En)
                    </div>
                    <div className="absolute bottom-1 right-2 text-[9px] font-mono text-slate-500">
                      {matchedRawSheet?.height_mm} mm (Boy)
                    </div>

                    {/* Fixed row/column layout */}
                    <div
                      className="w-full h-full pt-4 pb-4"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${matchedLayout.cols}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${matchedLayout.rows}, minmax(0, 1fr))`,
                        gap: `${matchedLayout.gap_mm || 4}px`,
                      }}
                    >
                      {/* Render assigned slots based on workbench repeats */}
                      {(() => {
                        const totalSlots = matchedLayout.rows * matchedLayout.cols;
                        const renderedSlots = [];

                        // Build slot assignments
                        let slotIdx = 0;
                        calculatedItems.forEach((item, itemIdx) => {
                          const palette = PRODUCT_PALETTES[itemIdx % PRODUCT_PALETTES.length];
                          for (let r = 0; r < item.repeats_per_sheet; r++) {
                            if (slotIdx < totalSlots) {
                              const shortName = item.stock_name.split(')-')[1] || item.stock_name.split(' ')[0];
                              renderedSlots.push(
                                <div
                                  key={`slot-${slotIdx}`}
                                  className={`rounded border p-1 text-center flex flex-col items-center justify-center transition-all ${palette.bg} ${palette.border} ${palette.text}`}
                                  title={`${item.stock_name} (Tekrar ${r + 1}/${item.repeats_per_sheet})`}
                                >
                                  <div className="text-[10px] font-bold font-mono truncate w-full">
                                    {shortName}
                                  </div>
                                  <div className="text-[8px] font-mono opacity-80">
                                    #{r + 1}
                                  </div>
                                </div>
                              );
                              slotIdx++;
                            }
                          }
                        });

                        // Remaining empty slots
                        while (slotIdx < totalSlots) {
                          renderedSlots.push(
                            <div
                              key={`empty-${slotIdx}`}
                              className="rounded border border-dashed border-slate-300 bg-slate-50 text-center text-slate-400 flex items-center justify-center text-[9px] font-mono"
                            >
                              BOŞ
                            </div>
                          );
                          slotIdx++;
                        }

                        return renderedSlots;
                      })()}
                    </div>
                  </div>
                ) : (
                  /* Undefined Layout Display: Aspect ratio box without fake slots */
                  <div
                    className="relative bg-white border-2 border-dashed border-slate-400 rounded-lg p-6 flex flex-col items-center justify-center text-center shadow-inner"
                    style={{
                      aspectRatio: `${sheetAspectRatio}`,
                      width: '100%',
                      maxWidth: '560px',
                      minHeight: '240px',
                    }}
                  >
                    <div className="text-2xl mb-1">📐</div>
                    <div className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Montaj Düzeni Tanımlanmamış
                    </div>
                    <p className="text-[11px] text-slate-500 max-w-sm mt-1">
                      Bu ham levha ({matchedRawSheet?.stock_name || activeTubeSize}) için kullanıcı tarafından verilmiş satır/sütun kalıp düzeni bulunmamaktadır.
                      Hazır levha kapasitesi <b>{matchedCapacity} tüp/levha</b>'dır; geometrik nesting veya hücre yerleşimi varsayımla üretilmez.
                    </p>
                    <div className="mt-3 text-[10px] font-mono text-sky-800 bg-sky-50 px-3 py-1.5 rounded border border-sky-200">
                      Teknik Tanımlar &gt; Montaj Görünümü sekmesinden kalıp düzeni tanımlayabilirsiniz.
                    </div>
                  </div>
                )}
              </div>

              {/* Lejant (Açıklama Anahtarı) ve Renk Tablosu */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="text-[10px] font-bold font-mono text-slate-500 uppercase flex items-center justify-between">
                  <span>AÇIKLAMA ANAHTARI (LEJANT)</span>
                  <span className="text-slate-400 font-normal">Görsel temsil amaçlıdır — fiziksel montaj ve bıçak uygunluğu ajans/matbaa CTP onayı ile belirlenir.</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {calculatedItems.map((item, idx) => {
                    const palette = PRODUCT_PALETTES[idx % PRODUCT_PALETTES.length];
                    const sharePct = result.capacity > 0 ? ((item.repeats_per_sheet / result.capacity) * 100).toFixed(0) : '0';
                    return (
                      <div
                        key={item.product_id}
                        className={`p-2 rounded border flex items-center justify-between text-xs ${palette.badge}`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className={`w-3 h-3 rounded-full flex-shrink-0 ${palette.chip}`} />
                          <div className="truncate font-semibold text-[11px]">{item.stock_name}</div>
                        </div>
                        <div className="text-right font-mono text-[10px] flex-shrink-0 pl-2">
                          <b>{item.repeats_per_sheet}</b>/{result.capacity} (%{sharePct})
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (1 Col): Validation Checks & Color Analysis */}
          <div className="space-y-4">
            {/* Validation Status Card */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  MONTAJ UYGUNLUK DENETİMİ
                </h3>
                <EnterpriseBadge variant={result.isValid ? 'success' : 'critical'} size="sm">
                  {result.isValid ? 'GEÇERLİ' : 'UYGUNSUZ'}
                </EnterpriseBadge>
              </div>

              {/* Validation Messages List */}
              <div className="space-y-2">
                {result.messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded border text-xs font-mono flex items-start gap-2 ${
                      msg.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : msg.type === 'error'
                        ? 'bg-rose-50 border-rose-200 text-rose-800'
                        : msg.type === 'warning'
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <span className="text-sm select-none">
                      {msg.type === 'success'
                        ? '✓'
                        : msg.type === 'error'
                        ? '⛔'
                        : msg.type === 'warning'
                        ? '⚠️'
                        : 'ℹ'}
                    </span>
                    <span className="flex-1 leading-relaxed">{msg.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Color Combination & Limit Analysis */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  RENK BİRLEŞİMİ ANALİZİ
                </h3>
                <EnterpriseBadge
                  variant={result.colorLimitSatisfied ? 'success' : 'critical'}
                  size="sm"
                >
                  {result.colorCount} / {maxColors} Renk
                </EnterpriseBadge>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-[11px] font-mono text-slate-500 mb-1.5">
                    Benzersiz Renkler ({result.uniqueColors.length} adet):
                  </div>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded border border-slate-200 min-h-[38px] items-center">
                    {result.uniqueColors.length === 0 ? (
                      <span className="text-xs text-slate-400 font-mono">Renk yok</span>
                    ) : (
                      result.uniqueColors.map((color, idx) => (
                        <ColorChip key={idx} color={color} />
                      ))
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 space-y-1">
                  <div className="flex justify-between font-mono">
                    <span>Varsayılan Renk Sınırı:</span>
                    <b className="text-slate-800">{maxColors} Renk</b>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>Sınır Durumu:</span>
                    <b
                      className={
                        result.colorLimitSatisfied ? 'text-emerald-700' : 'text-rose-700'
                      }
                    >
                      {result.colorLimitSatisfied
                        ? `Uygun (${maxColors - result.colorCount} renk payı var)`
                        : `Aşıldı (${result.colorCount - maxColors} fazla renk)`}
                    </b>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Summary Card */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2 shadow-sm text-xs font-mono">
              <div className="font-bold text-slate-800 border-b border-slate-200 pb-1 uppercase tracking-wider text-[11px]">
                MONTAJ ÖZETİ
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Ürün Sayısı:</span>
                <b className="text-slate-800">{calculatedItems.length} Kalem</b>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Kapasite:</span>
                <b className="text-slate-800">{matchedCapacity} Tüp / Levha</b>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Toplam Tekrar:</span>
                <b className="text-slate-800">{result.totalRepeats} / {matchedCapacity}</b>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Baskı Levha:</span>
                <b className="text-slate-800">{formatNumber(sheetCount)} Adet</b>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Toplam Teorik Tüp:</span>
                <b className="text-sky-700">
                  {formatNumber(calculatedItems.reduce((acc, i) => acc + i.theoretical_units, 0))} Adet
                </b>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
