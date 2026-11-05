'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import { AppShell } from '@/components/shell/AppShell';
import { EnterpriseBadge } from '@/components/ui/EnterpriseBadge';
import { EnterpriseDataGrid, GridColumn } from '@/components/ui/EnterpriseDataGrid';
import { EnterpriseModal } from '@/components/ui/EnterpriseModal';
import { ColorChip } from '@/components/ui/ColorChip';
import { DemandItem } from '@/lib/types';
import { formatNumber, formatDateTR } from '@/lib/formatters';

export default function TalepHavuzuPage() {
  const router = useRouter();
  const { demands, selectedDemandIds, setSelectedDemandIds, toggleDemandSelection, updateDemand, addDemand, currentRole } = useApp();

  // Filters
  const [selectedSizeFilter, setSelectedSizeFilter] = useState<string>('ALL');
  const [selectedSurfaceFilter, setSelectedSurfaceFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Detail Modal
  const [activeItem, setActiveItem] = useState<DemandItem | null>(null);

  // New Item Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStockCode, setNewStockCode] = useState('');
  const [newStockName, setNewStockName] = useState('');
  const [newSize, setNewSize] = useState('52x195');
  const [newGross, setNewGross] = useState('10000');
  const [newStock, setNewStock] = useState('0');
  const [newSurface, setNewSurface] = useState('EMAYE');
  const [newVarnish, setNewVarnish] = useState('BELİRTİLMEMİŞ');
  const [newLacquer, setNewLacquer] = useState('BELİRTİLMEMİŞ');
  const [newInsideCoating, setNewInsideCoating] = useState('GOLD');
  const [newColors, setNewColors] = useState('C, M, Y, K');
  const [newDate, setNewDate] = useState('2026-11-15');

  // Unique filter values
  const sizes = useMemo(() => Array.from(new Set(demands.map((d) => d.tube_size))), [demands]);
  const surfaces = useMemo(() => Array.from(new Set(demands.map((d) => d.print_surface))), [demands]);

  // Filtered dataset
  const filteredDemands = useMemo(() => {
    return demands.filter((item) => {
      if (selectedSizeFilter !== 'ALL' && item.tube_size !== selectedSizeFilter) return false;
      if (selectedSurfaceFilter !== 'ALL' && item.print_surface !== selectedSurfaceFilter) return false;
      if (selectedStatusFilter !== 'ALL' && item.definition_status !== selectedStatusFilter) return false;
      return true;
    });
  }, [demands, selectedSizeFilter, selectedSurfaceFilter, selectedStatusFilter]);

  // Transfer to combination workspace
  const handleTransferToCombination = () => {
    if (selectedDemandIds.length === 0) {
      alert('Lütfen kombinasyon masasına aktarmak için en az bir sipariş satırı seçiniz.');
      return;
    }
    router.push('/kombinasyon');
  };

  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStockCode.trim() || !newStockName.trim()) {
      alert('Lütfen stok kodu ve adını doldurunuz.');
      return;
    }
    const gross = parseInt(newGross, 10) || 0;
    const stock = parseInt(newStock, 10) || 0;
    const net = Math.max(0, gross - stock);
    const [dMm, hMm] = newSize.split('x').map((n) => parseInt(n, 10) || 0);

    const created: DemandItem = {
      id: `DEM-CUSTOM-${Date.now()}`,
      reference_no: `SIP-MANUEL-${Date.now().toString().slice(-4)}`,
      stock_code: newStockCode.trim(),
      stock_name: newStockName.trim(),
      tube_size: newSize,
      diameter_mm: dMm,
      height_mm: hMm,
      due_date: newDate,
      gross_quantity: gross,
      available_stock: stock,
      net_quantity: net,
      raw_sheet_code: '500011000004-1206',
      raw_sheet_desc: `HAM LEVHA - ${newSize}`,
      print_surface: newSurface,
      varnish: newVarnish,
      lacquer: newLacquer,
      inside_coating: newInsideCoating,
      colors: newColors.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean),
      definition_status: 'complete',
      order_type: 'YENI',
      scope_note: 'Kullanıcı tarafından manuel eklenen talep.',
      record_kind: 'synthetic_demo',
    };

    addDemand(created);
    setIsAddModalOpen(false);
    setNewStockCode('');
    setNewStockName('');
  };

  // Data grid columns
  const columns: GridColumn<DemandItem>[] = [
    {
      key: 'reference_no',
      label: 'Sipariş No',
      width: '130px',
      render: (val, item) => (
        <div>
          <span className="font-mono font-bold text-sky-700">{val}</span>
          {item.order_type && (
            <span className="block text-[9px] text-slate-500 font-mono uppercase">{item.order_type}</span>
          )}
        </div>
      ),
    },
    {
      key: 'stock_name',
      label: 'Tüp Kodu ve Açıklaması',
      render: (val, item) => (
        <div>
          <div className="font-medium text-slate-900 line-clamp-1">{val}</div>
          <div className="text-[10px] font-mono text-slate-500">{item.stock_code}</div>
        </div>
      ),
    },
    {
      key: 'tube_size',
      label: 'Ebat',
      width: '90px',
      render: (val) => (
        <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
          {val}
        </span>
      ),
    },
    {
      key: 'due_date',
      label: 'İhtiyaç Tarihi',
      width: '100px',
      render: (val) => <span className="font-mono text-slate-700">{formatDateTR(val)}</span>,
    },
    {
      key: 'gross_quantity',
      label: 'Brüt İhtiyaç',
      align: 'right',
      width: '100px',
      render: (val) => <span className="font-mono text-slate-600">{formatNumber(val)}</span>,
    },
    {
      key: 'available_stock',
      label: 'Ambar Stok',
      align: 'right',
      width: '95px',
      render: (val) => (
        <span className={`font-mono ${val > 0 ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
          {val > 0 ? `-${formatNumber(val)}` : '0'}
        </span>
      ),
    },
    {
      key: 'net_quantity',
      label: 'Net İhtiyaç',
      align: 'right',
      width: '110px',
      render: (val) => (
        <span className="font-mono font-bold text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {formatNumber(val)}
        </span>
      ),
    },
    {
      key: 'print_surface',
      label: 'Zemin',
      width: '85px',
      render: (val) => (
        <EnterpriseBadge variant={val === 'METALİK' ? 'purple' : 'neutral'} size="sm">
          {val}
        </EnterpriseBadge>
      ),
    },
    {
      key: 'inside_coating',
      label: 'İç Kaplama',
      width: '95px',
      render: (val) => (
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
          val === 'GOLD'
            ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
            : 'bg-slate-100 text-slate-600 border-slate-200'
        }`}>
          {val || 'BELİRTİLMEMİŞ'}
        </span>
      ),
    },
    {
      key: 'colors',
      label: 'Renkler',
      width: '150px',
      render: (val: string[]) => (
        <div className="flex flex-wrap gap-1">
          {val.map((c, i) => (
            <ColorChip key={i} color={c} />
          ))}
        </div>
      ),
    },
    {
      key: 'record_kind',
      label: 'Kayıt Türü',
      width: '110px',
      render: (val) => (
        val === 'source_transcription' ? (
          <EnterpriseBadge variant="success" size="sm">KAYNAK</EnterpriseBadge>
        ) : (
          <EnterpriseBadge variant="warning" size="sm">DEMO</EnterpriseBadge>
        )
      ),
    },
    {
      key: 'definition_status',
      label: 'Tanım Durumu',
      width: '120px',
      render: (val) => {
        if (val === 'complete') {
          return <EnterpriseBadge variant="success" size="sm">Tam Tanımlı</EnterpriseBadge>;
        }
        if (val === 'requires_verification') {
          return (
            <EnterpriseBadge variant="warning" size="sm" title="ERP levha kodu doğrulaması gerektirir">
              ERP Onay
            </EnterpriseBadge>
          );
        }
        return <EnterpriseBadge variant="critical" size="sm">Eksik Levha</EnterpriseBadge>;
      },
    },
  ];

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Header Info Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              DOLUM VE SATIŞ TÜP İHTİYAÇLARI (BRÜT / STOK / NET DÖKÜMÜ)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              İhtiyaç view'ındaki talepler ambar stoğuyla karşılaştırılarak netleştirilmiştir. Satırları seçip kombinasyon çalışma alanına aktarabilirsiniz.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              + Manuel Talep Ekle
            </button>
            <button
              onClick={handleTransferToCombination}
              className="px-3.5 py-1.5 text-xs font-bold rounded bg-sky-600 border border-sky-500 text-white hover:bg-sky-700 shadow-sm transition-colors flex items-center gap-1.5"
            >
              <span>🧩 Kombinasyona Aktar</span>
              <span className="bg-sky-800 px-1.5 py-0.2 rounded text-[10px] font-mono">
                {selectedDemandIds.length}
              </span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg text-xs font-mono shadow-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">EBAT:</span>
            <select
              value={selectedSizeFilter}
              onChange={(e) => setSelectedSizeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 rounded px-2 py-1 text-xs focus:border-sky-500 outline-none"
            >
              <option value="ALL">Tümü ({demands.length})</option>
              {sizes.map((s) => (
                <option key={s} value={s}>
                  {s} ({demands.filter((d) => d.tube_size === s).length})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">ZEMİN:</span>
            <select
              value={selectedSurfaceFilter}
              onChange={(e) => setSelectedSurfaceFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 rounded px-2 py-1 text-xs focus:border-sky-500 outline-none"
            >
              <option value="ALL">Tüm Zeminler</option>
              {surfaces.map((sf) => (
                <option key={sf} value={sf}>
                  {sf} ({demands.filter((d) => d.print_surface === sf).length})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">TANIM DURUMU:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 rounded px-2 py-1 text-xs focus:border-sky-500 outline-none"
            >
              <option value="ALL">Tüm Durumlar</option>
              <option value="complete">Tam Tanımlı</option>
              <option value="requires_verification">ERP Onay Bekliyor</option>
              <option value="missing_raw_sheet">Eksik Ham Levha</option>
            </select>
          </div>

          {(selectedSizeFilter !== 'ALL' || selectedSurfaceFilter !== 'ALL' || selectedStatusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSelectedSizeFilter('ALL');
                setSelectedSurfaceFilter('ALL');
                setSelectedStatusFilter('ALL');
              }}
              className="text-sky-700 hover:text-sky-900 font-mono text-xs underline ml-auto"
            >
              Filtreleri Temizle
            </button>
          )}
        </div>

        {/* Data Grid */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <EnterpriseDataGrid
            data={filteredDemands}
            columns={columns}
            keyField="id"
            selectedKeys={selectedDemandIds}
            onSelectionChange={(keys) => setSelectedDemandIds(keys as string[])}
            onRowClick={(item) => setActiveItem(item)}
            emptyMessage="Filtrelere uygun ihtiyaç kalemi bulunamadı."
          />
        </div>

        {/* Detail Modal */}
        <EnterpriseModal
          isOpen={!!activeItem}
          onClose={() => setActiveItem(null)}
          title={`İhtiyaç Detayı: ${activeItem?.reference_no || ''}`}
          size="md"
        >
          {activeItem && (
            <div className="space-y-4 text-xs font-mono">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
                <div className="text-sm font-bold text-slate-900 font-sans">{activeItem.stock_name}</div>
                <div className="text-slate-500">{activeItem.stock_code}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 block">Ebat:</span>
                  <b className="text-slate-800 text-sm">{activeItem.tube_size}</b> (Çap: {activeItem.diameter_mm} mm, Boy: {activeItem.height_mm} mm)
                </div>
                <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 block">İhtiyaç Tarihi:</span>
                  <b className="text-slate-800 text-sm">{formatDateTR(activeItem.due_date)}</b>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="p-2 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 block">Zemin:</span>
                  <b className="text-slate-800">{activeItem.print_surface}</b>
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 block">Vernik:</span>
                  <b className="text-slate-800">{activeItem.varnish}</b>
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 block">Lak:</span>
                  <b className="text-slate-800">{activeItem.lacquer}</b>
                </div>
                <div className="p-2 bg-amber-50 rounded border border-amber-200">
                  <span className="text-amber-700 block">İç Kaplama:</span>
                  <b className="text-amber-900">{activeItem.inside_coating}</b>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
                <span className="text-slate-500 block">Bağlı Ham Levha Tanımı:</span>
                <div className="text-slate-800 font-semibold">{activeItem.raw_sheet_desc || 'Tanımsız'}</div>
                <div className="text-[11px] text-slate-500">Kod: {activeItem.raw_sheet_code || 'Tanımlanmamış'}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
                <span className="text-slate-500 block">Kapsam Notu:</span>
                <p className="text-slate-700 font-sans">{activeItem.scope_note || 'Özel not bulunmamaktadır.'}</p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  onClick={() => {
                    toggleDemandSelection(activeItem.id);
                    setActiveItem(null);
                  }}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded font-mono font-bold"
                >
                  {selectedDemandIds.includes(activeItem.id) ? 'Kombinasyon Seçimini Kaldır' : 'Kombinasyona Ekle'}
                </button>
              </div>
            </div>
          )}
        </EnterpriseModal>

        {/* Modal: Manuel Talep Ekle */}
        <EnterpriseModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Manuel İhtiyaç Kalemi Ekle"
          size="md"
        >
          <form onSubmit={handleAddNewItem} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Stok Kodu:</label>
                <input
                  type="text"
                  required
                  value={newStockCode}
                  onChange={(e) => setNewStockCode(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono outline-none focus:border-sky-500"
                  placeholder="511109010910-..."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Ebat:</label>
                <select
                  value={newSize}
                  onChange={(e) => setNewSize(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono outline-none"
                >
                  {sizes.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Tüp İsmi:</label>
              <input
                type="text"
                required
                value={newStockName}
                onChange={(e) => setNewStockName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs outline-none focus:border-sky-500"
                placeholder="TUP-..."
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Brüt İhtiyaç:</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newGross}
                  onChange={(e) => setNewGross(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Ambar Stok:</label>
                <input
                  type="number"
                  min="0"
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">İhtiyaç Tarihi:</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Zemin:</label>
                <select
                  value={newSurface}
                  onChange={(e) => setNewSurface(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs outline-none"
                >
                  <option value="EMAYE">EMAYE</option>
                  <option value="METALİK">METALİK</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Vernik:</label>
                <select
                  value={newVarnish}
                  onChange={(e) => setNewVarnish(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs outline-none"
                >
                  <option value="BELİRTİLMEMİŞ">BELİRTİLMEMİŞ</option>
                  <option value="PARLAK">PARLAK</option>
                  <option value="MAT">MAT</option>
                  <option value="KISMİ">KISMİ</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Lak:</label>
                <select
                  value={newLacquer}
                  onChange={(e) => setNewLacquer(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs outline-none"
                >
                  <option value="BELİRTİLMEMİŞ">BELİRTİLMEMİŞ</option>
                  <option value="LAKLI">LAKLI</option>
                  <option value="LAKSIZ">LAKSIZ</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">İç Kaplama:</label>
                <select
                  value={newInsideCoating}
                  onChange={(e) => setNewInsideCoating(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs outline-none"
                >
                  <option value="GOLD">GOLD</option>
                  <option value="STANDART">STANDART</option>
                  <option value="BELİRTİLMEMİŞ">BELİRTİLMEMİŞ</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Renkler (Virgülle ayrılmış):</label>
              <input
                type="text"
                value={newColors}
                onChange={(e) => setNewColors(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono outline-none focus:border-sky-500"
                placeholder="C, M, Y, K, 368C"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-3 py-1.5 text-xs font-mono text-slate-600 hover:text-slate-800"
              >
                İptal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-mono font-bold bg-sky-600 text-white rounded hover:bg-sky-700 shadow-xs"
              >
                Talep Havuzuna Ekle
              </button>
            </div>
          </form>
        </EnterpriseModal>
      </div>
    </AppShell>
  );
}
