'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store';
import { AppShell } from '@/components/shell/AppShell';
import { EnterpriseBadge } from '@/components/ui/EnterpriseBadge';
import { EnterpriseFormField } from '@/components/ui/EnterpriseFormField';
import { EnterpriseInput } from '@/components/ui/EnterpriseInput';
import { EnterpriseModal } from '@/components/ui/EnterpriseModal';

export default function EntegrasyonPage() {
  const { integrationSettings, updateIntegrationSettings } = useApp();

  const [host, setHost] = useState(integrationSettings.server_host);
  const [port, setPort] = useState(integrationSettings.server_port.toString());
  const [db, setDb] = useState(integrationSettings.database_name);
  const [user, setUser] = useState(integrationSettings.username);
  const [demandView, setDemandView] = useState(integrationSettings.demand_view_name);
  const [stockView, setStockView] = useState(integrationSettings.stock_view_name);
  const [demandMode, setDemandMode] = useState(integrationSettings.demand_calculation_mode);

  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isSavedMessage, setIsSavedMessage] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateIntegrationSettings({
      server_host: host,
      server_port: parseInt(port, 10) || 1433,
      database_name: db,
      username: user,
      demand_view_name: demandView,
      stock_view_name: stockView,
      demand_calculation_mode: demandMode,
    });
    setIsSavedMessage(true);
    setTimeout(() => setIsSavedMessage(false), 3000);
  };

  const columnMappings = [
    { erpColumn: 'SIPARIS_NO / REF_NO', domainField: 'reference_no', sample: 'SIP-2026-SOFT-01', desc: 'Sipariş tekil referans numarası' },
    { erpColumn: 'STOK_KODU', domainField: 'stock_code', sample: '511109010910-1001', desc: 'ERP mamul stok kodu' },
    { erpColumn: 'STOK_ADI', domainField: 'stock_name', sample: 'TUP-SOFT ODA SPR 300 ml...', desc: 'Ürün ticari unvanı' },
    { erpColumn: 'EBAT_KODU', domainField: 'tube_size', sample: '52x195', desc: 'Çap x boy parametresi' },
    { erpColumn: 'DOLUM_TERMINI', domainField: 'due_date', sample: '2026-11-06', desc: 'Dolum planı hedef tarihi' },
    { erpColumn: 'TALEP_MIKTARI', domainField: 'gross_quantity', sample: '6.200', desc: 'ERP ihtiyaç görünümündeki miktar' },
    { erpColumn: 'DEPO_STOK_TUP', domainField: 'available_stock', sample: '1.200', desc: 'Teneke ambarındaki sağlam stok' },
  ];

  return (
    <AppShell pageTitle="Entegrasyon & Ayarlar">
      {/* Invariant Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-base">🔌</span>
          <div>
            <span className="font-bold text-sky-300">FAZ 1 ENTEGRASYON TASLAĞI: </span>
            <span className="text-slate-300">
              Bu ekranda SQL Server view parametreleri ve kolon eşleme taslakları yapılandırılır. Gerçek veritabanı bağlantısı Faz 3'te IT yetkilendirmesiyle devreye alınacaktır; sahte bağlantı başarısı üretilmez.
            </span>
          </div>
        </div>
        <EnterpriseBadge variant="neutral">Faz 3 Hazırlık</EnterpriseBadge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Form: Server & View Parameters */}
        <form onSubmit={handleSaveSettings} className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              SQL SERVER BAĞLANTI PARAMETRELERİ
            </h3>
            <EnterpriseBadge variant="info">Salt-Okunur View</EnterpriseBadge>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <EnterpriseFormField label="Sunucu IP / Host Adresi" required>
                <EnterpriseInput
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="sql01.fabrika.local"
                  required
                />
              </EnterpriseFormField>
            </div>
            <div>
              <EnterpriseFormField label="Port" required>
                <EnterpriseInput
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  required
                />
              </EnterpriseFormField>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <EnterpriseFormField label="Veritabanı Adı" required>
              <EnterpriseInput
                value={db}
                onChange={(e) => setDb(e.target.value)}
                required
              />
            </EnterpriseFormField>

            <EnterpriseFormField label="Kullanıcı Adı" required>
              <EnterpriseInput
                value={user}
                onChange={(e) => setUser(e.target.value)}
                required
              />
            </EnterpriseFormField>
          </div>

          <EnterpriseFormField label="Parola (ERP Salt-Okunur)" hint="Faz 3'te şifrelenmiş sunucu ortamında tutulacaktır.">
            <EnterpriseInput
              type="password"
              placeholder="••••••••••••"
              disabled
            />
          </EnterpriseFormField>

          <div className="pt-2 border-t border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">
              HEDEF VIEW ADLARI
            </h4>

            <EnterpriseFormField label="İhtiyaç / Talep View'ı" hint="Satış ve dolum planından gelen teneke talepleri">
              <EnterpriseInput
                value={demandView}
                onChange={(e) => setDemandView(e.target.value)}
                required
              />
            </EnterpriseFormField>

            <EnterpriseFormField label="Stok / Ambar View'ı" hint="Teneke, laklı ve kesik levha depo stokları">
              <EnterpriseInput
                value={stockView}
                onChange={(e) => setStockView(e.target.value)}
                required
              />
            </EnterpriseFormField>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">
              İHTİYAÇ VIEW KAPSAMI POLİTİKASI
            </h4>
            <div className="space-y-2 text-xs font-mono">
              <label className="flex items-start gap-2 p-2.5 rounded bg-slate-950/70 border border-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="demandMode"
                  value="net_already_deducted"
                  checked={demandMode === 'net_already_deducted'}
                  onChange={() => setDemandMode('net_already_deducted')}
                  className="mt-0.5 text-sky-500"
                />
                <div>
                  <span className="font-bold text-slate-200">İhtiyaç View'ı Zaten Net Taleptir</span>
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                    Mevcut Excel/ERP sistemi stokları ve açık işleri zaten düşmüştür; uygulama aynı stoğu ikinci kez düşmez.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2 p-2.5 rounded bg-slate-950/70 border border-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="demandMode"
                  value="gross_needs_system_netting"
                  checked={demandMode === 'gross_needs_system_netting'}
                  onChange={() => setDemandMode('gross_needs_system_netting')}
                  className="mt-0.5 text-sky-500"
                />
                <div>
                  <span className="font-bold text-slate-200">İhtiyaç View'ı Brüt Taleptir</span>
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                    Uygulama tanımlı depo/kalite stoğunu okuyarak net üretim ihtiyacını kendisi hesaplar.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsTestModalOpen(true)}
              className="px-3 py-1.5 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              Bağlantıyı Test Et
            </button>
            <div className="flex items-center gap-2">
              {isSavedMessage && (
                <span className="text-xs text-emerald-400 font-mono">Kaydedildi!</span>
              )}
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-colors"
              >
                Ayarları Kaydet
              </button>
            </div>
          </div>
        </form>

        {/* Right Preview: Column Mapping */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                KOLON EŞLEME ÖNİZLEMESİ (VW_DOLUM_TUP_TALEP)
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">ERP Eşlemesi</span>
            </div>
            <p className="text-xs text-slate-400">
              SQL Server view kolonları uygulamanın domain model alanlarıyla bu sözleşmeye göre eşleştirilir.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] font-mono text-slate-400 uppercase">
                    <th className="py-2 px-2.5">ERP View Kolonu</th>
                    <th className="py-2 px-2">Sistem Alanı</th>
                    <th className="py-2 px-2">Örnek Veri</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {columnMappings.map((cm, idx) => (
                    <tr key={idx} className="hover:bg-slate-850/50">
                      <td className="py-2 px-2.5 font-bold text-slate-300">{cm.erpColumn}</td>
                      <td className="py-2 px-2 text-sky-400">{cm.domainField}</td>
                      <td className="py-2 px-2 text-slate-400 text-[11px]">{cm.sample}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-2 text-xs">
            <span className="font-bold text-slate-200 uppercase tracking-wide block">
              GÜVENLİK VE ERİŞİM İLKELERİ
            </span>
            <ul className="text-slate-400 space-y-1 font-mono text-[11px]">
              <li>• Uygulama SQL Server'a ASLA yazma yapmaz (Salt-Okunur SELECT).</li>
              <li>• Parolalar istemci kodunda veya localStorage'da tutulmaz.</li>
              <li>• IT tarafından onaylanan IP ve servis kullanıcısı Faz 3'te tanımlanır.</li>
              <li>• ERP'de stok/üretim hareketi Nitrojen/mevcut ERP üzerinden operatörce yürütülür.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Connection Test Info Modal */}
      {isTestModalOpen && (
        <EnterpriseModal
          isOpen={isTestModalOpen}
          onClose={() => setIsTestModalOpen(false)}
          title="Bağlantı Testi Durumu"
          subtitle="Faz 0–1 Kapsam Bildirimi"
          footer={
            <button
              onClick={() => setIsTestModalOpen(false)}
              className="px-3.5 py-1.5 rounded bg-sky-600 text-white text-xs font-semibold"
            >
              Anlaşıldı
            </button>
          }
        >
          <div className="space-y-3 font-sans">
            <div className="p-3 rounded bg-amber-950/40 border border-amber-800/80 text-amber-300 text-xs flex items-start gap-2">
              <span className="text-base">⚠️</span>
              <div>
                <span className="font-bold">Bağlantı Henüz Aktif Değildir: </span>
                SQL Server entegrasyonu Faz 3 kapsamındadır. Gerçek bağlantı parametreleri ve IP izinleri fabrika IT departmanı ile belirlendikten sonra devreye alınacaktır.
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              AGENTS.md ve Ana Yol Haritası kuralları gereği Faz 0–1 kapsamında sahte bağlantı başarısı üretilmez. Şu an sistem yerel JSON veri adaptörü üzerinden eksiksiz çalışmaktadır.
            </p>
          </div>
        </EnterpriseModal>
      )}
    </AppShell>
  );
}
