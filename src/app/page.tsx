'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/lib/store';
import { AppShell } from '@/components/shell/AppShell';
import { EnterpriseBadge } from '@/components/ui/EnterpriseBadge';
import { formatNumber, formatAdet, formatLevha } from '@/lib/formatters';

export default function OverviewPage() {
  const { demands, products, rawSheets, productionPlans } = useApp();

  // Metrics derived strictly from the active dataset
  const totalNetDemand = demands.reduce((acc, d) => acc + d.net_quantity, 0);
  const totalGrossDemand = demands.reduce((acc, d) => acc + d.gross_quantity, 0);
  const totalAvailableStock = demands.reduce((acc, d) => acc + d.available_stock, 0);

  const printPendingCount = demands.filter((d) => d.net_quantity > 0).length;
  const missingDefinitionsCount = demands.filter(
    (d) => d.definition_status === 'missing_raw_sheet' || !d.raw_sheet_code
  ).length;
  const verificationNeededCount = demands.filter(
    (d) => d.definition_status === 'requires_verification'
  ).length;

  // Near due date risk (< 2026-11-06)
  const nearTermRiskCount = demands.filter((d) => d.due_date <= '2026-11-06').length;

  // Breakdown by tube diameter
  const diameterBreakdown = demands.reduce((acc, d) => {
    const key = `Ø${d.diameter_mm} mm`;
    acc[key] = (acc[key] || 0) + d.net_quantity;
    return acc;
  }, {} as Record<string, number>);

  // Breakdown by print surface
  const surfaceBreakdown = demands.reduce((acc, d) => {
    const key = d.print_surface || 'Bilinmiyor';
    acc[key] = (acc[key] || 0) + d.net_quantity;
    return acc;
  }, {} as Record<string, number>);

  return (
    <AppShell pageTitle="Planlama Özeti">
      {/* Disclaimer / Invariant Banner */}
      <div className="bg-sky-950/30 border border-sky-800/60 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-base">📌</span>
          <div>
            <span className="font-bold text-sky-300">FAZ 0–1 KAPSAMI: </span>
            <span className="text-slate-300">
              Bu ekranlar sağlanan kaynak JSON verileriyle beslenmektedir. Levhaya geometrik sığdırma ve alternatif levha önerisi yapılmaz; tüp/levha hazır parametredir.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <EnterpriseBadge variant="info">Parametrik Model</EnterpriseBadge>
          <EnterpriseBadge variant="neutral">Yerel Veri Adaptörü</EnterpriseBadge>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Net Demand */}
        <Link
          href="/talep-havuzu"
          className="bg-slate-900 border border-slate-800 hover:border-sky-500 rounded-lg p-4 transition-all hover:bg-slate-850 group cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-1">
            <span>AÇIK NET İHTİYAÇ</span>
            <EnterpriseBadge variant="info">Toplam</EnterpriseBadge>
          </div>
          <div className="text-2xl font-black font-mono text-white tracking-tight group-hover:text-sky-300">
            {formatNumber(totalNetDemand)} <span className="text-xs font-normal text-slate-400">Tüp</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 font-mono flex items-center justify-between border-t border-slate-800 pt-2">
            <span>Brüt: {formatNumber(totalGrossDemand)}</span>
            <span className="text-emerald-400">Stok: -{formatNumber(totalAvailableStock)}</span>
          </div>
        </Link>

        {/* KPI 2: Print Pending Jobs */}
        <Link
          href="/kombinasyon"
          className="bg-slate-900 border border-slate-800 hover:border-amber-500 rounded-lg p-4 transition-all hover:bg-slate-850 group cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-1">
            <span>BASKI BEKLEYEN İŞLER</span>
            <EnterpriseBadge variant="warning">{printPendingCount} Sipariş</EnterpriseBadge>
          </div>
          <div className="text-2xl font-black font-mono text-amber-300 tracking-tight">
            {printPendingCount} <span className="text-xs font-normal text-slate-400">Kalem</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 font-mono flex items-center justify-between border-t border-slate-800 pt-2">
            <span>Montaja Aktarılabilir</span>
            <span className="text-amber-400">Min 1.250 Levha</span>
          </div>
        </Link>

        {/* KPI 3: Missing / Verification Definitions */}
        <Link
          href="/teknik-tanimlar"
          className="bg-slate-900 border border-slate-800 hover:border-rose-500 rounded-lg p-4 transition-all hover:bg-slate-850 group cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-1">
            <span>EKSİK TEKNİK VERİLER</span>
            <EnterpriseBadge variant={missingDefinitionsCount > 0 ? 'critical' : 'success'}>
              {missingDefinitionsCount} Eksik
            </EnterpriseBadge>
          </div>
          <div className="text-2xl font-black font-mono text-rose-400 tracking-tight">
            {missingDefinitionsCount + verificationNeededCount}{' '}
            <span className="text-xs font-normal text-slate-400">Kalem Uyarısı</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 font-mono flex items-center justify-between border-t border-slate-800 pt-2">
            <span>Eksik Levha: {missingDefinitionsCount}</span>
            <span className="text-amber-400">ERP Onay Bekleyen: {verificationNeededCount}</span>
          </div>
        </Link>

        {/* KPI 4: Near Due Date Risk */}
        <Link
          href="/uretim-plani"
          className="bg-slate-900 border border-slate-800 hover:border-indigo-500 rounded-lg p-4 transition-all hover:bg-slate-850 group cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-1">
            <span>TEMSİLİ TERMİN RİSKİ</span>
            <EnterpriseBadge variant="purple">Bu Hafta</EnterpriseBadge>
          </div>
          <div className="text-2xl font-black font-mono text-indigo-300 tracking-tight">
            {nearTermRiskCount} <span className="text-xs font-normal text-slate-400">Sipariş Satırı</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 font-mono flex items-center justify-between border-t border-slate-800 pt-2">
            <span>2026 Hafta 45 Hedefi</span>
            <span className="text-indigo-400">Acil Dolum</span>
          </div>
        </Link>
      </div>

      {/* Two Column Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Demand Breakdown by Diameter & Surface */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              ÇAP VE ZEMİN BAZINDA NET İHTİYAÇ DAĞILIMI
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">Türetilen Veri</span>
          </div>

          {/* Diameter breakdown */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono text-slate-400">Tüp Çapı (Gövde)</div>
            <div className="space-y-2">
              {Object.entries(diameterBreakdown).map(([diameter, qty]) => {
                const pct = Math.round((qty / totalNetDemand) * 100);
                return (
                  <div key={diameter} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-semibold text-slate-200">{diameter}</span>
                      <span className="text-slate-400">
                        {formatAdet(qty)} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-sky-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Surface breakdown */}
          <div className="space-y-2 pt-3 border-t border-slate-800">
            <div className="text-[11px] font-mono text-slate-400">Baskı Zemini (Montaj Koşulu)</div>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(surfaceBreakdown).map(([surface, qty]) => (
                <div
                  key={surface}
                  className="bg-slate-950/60 border border-slate-800 rounded p-2.5 flex flex-col justify-between"
                >
                  <div className="text-[10px] font-mono uppercase text-slate-400">{surface} ZEMİN</div>
                  <div className="text-base font-bold font-mono text-slate-100 mt-1">
                    {formatNumber(qty)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {Math.round((qty / totalNetDemand) * 100)}% Pay
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 2: Quick Workflow Guidance */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              FAZ 0–1 KULLANIM AKIŞI
            </h3>
            <span className="text-[10px] text-sky-400 font-mono">Hızlı Geçiş</span>
          </div>

          <div className="space-y-3 text-xs">
            <Link
              href="/talep-havuzu"
              className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <div className="p-2 rounded bg-sky-950/80 border border-sky-800 text-sky-400 font-mono font-bold">
                1
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-200 flex items-center justify-between">
                  <span>İhtiyaç Havuzunu İncele ve Seç</span>
                  <span className="text-slate-500 font-mono">21 Kalem</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Çap, boy ve zemin filtreleriyle aynı gruptaki tüpleri işaretle. "Kombinasyona Aktar" ile çalışma masasına gönder.
                </div>
              </div>
            </Link>

            <Link
              href="/kombinasyon"
              className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <div className="p-2 rounded bg-amber-950/80 border border-amber-800 text-amber-400 font-mono font-bold">
                2
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-200 flex items-center justify-between">
                  <span>Manuel Kombinasyon Denemesi Yap</span>
                  <EnterpriseBadge variant="warning">SOFT 4-8-8 Hazır</EnterpriseBadge>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Tekrar sayılarını gir, 6 renk sınırını ve tüp/levha kapasitesini anlık kontrol et. SOFT referans hesabı 5.000 / 10.000 / 10.000 çıktısını üretir.
                </div>
              </div>
            </Link>

            <Link
              href="/uretim-plani"
              className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <div className="p-2 rounded bg-indigo-950/80 border border-indigo-800 text-indigo-400 font-mono font-bold">
                3
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-200 flex items-center justify-between">
                  <span>Teneke Üretim Takvimini İncele</span>
                  <span className="text-slate-500 font-mono">20 Satır Referans</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Haftalık takvim ve hat bazlı çizelgeyi görüntüle. Demo hat ve tarih değişikliklerini dene.
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
