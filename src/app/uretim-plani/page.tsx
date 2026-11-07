'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/lib/store';
import { AppShell } from '@/components/shell/AppShell';
import { EnterpriseBadge } from '@/components/ui/EnterpriseBadge';
import { EnterpriseDataGrid, GridColumn } from '@/components/ui/EnterpriseDataGrid';
import { EnterpriseModal } from '@/components/ui/EnterpriseModal';
import { EnterpriseFormField } from '@/components/ui/EnterpriseFormField';
import { EnterpriseInput } from '@/components/ui/EnterpriseInput';
import { ProductionPlanItem } from '@/lib/types';
import { formatNumber, formatAdet, formatDateTR } from '@/lib/formatters';

export default function UretimPlaniPage() {
  const { productionPlans, updateProductionPlanItem } = useApp();

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [activePlanItem, setActivePlanItem] = useState<ProductionPlanItem | null>(null);

  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductionPlanItem | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editMachine, setEditMachine] = useState('');
  const [editShift, setEditShift] = useState('');
  const [editUnits, setEditUnits] = useState('0');
  const [editStatus, setEditStatus] = useState<any>('ready');

  // Open edit modal
  const handleOpenEdit = (item: ProductionPlanItem) => {
    setEditingItem(item);
    setEditDate(item.finish_date);
    setEditMachine(item.machine || 'Tüp Gövde Üretim Hattı (Tek Makine)');
    setEditShift(item.shift || 'Vardiya-1 (08:00 - 16:00)');
    setEditUnits(item.planned_units.toString());
    setEditStatus(item.material_status);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    updateProductionPlanItem(editingItem.id, {
      finish_date: editDate,
      machine: editMachine,
      shift: editShift,
      planned_units: parseInt(editUnits, 10) || editingItem.planned_units,
      material_status: editStatus,
    });

    setIsEditModalOpen(false);
  };

  // Group by date for calendar view
  const calendarGroups = useMemo(() => {
    const map = new Map<string, ProductionPlanItem[]>();
    productionPlans.forEach((p) => {
      const arr = map.get(p.finish_date) || [];
      arr.push(p);
      map.set(p.finish_date, arr);
    });
    // Sort dates
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [productionPlans]);

  // Total planned units
  const totalPlannedUnits = useMemo(() => {
    return productionPlans.reduce((sum, p) => sum + p.planned_units, 0);
  }, [productionPlans]);

  // Columns definition
  const columns: GridColumn<ProductionPlanItem>[] = [
    {
      key: 'week_source',
      label: 'Hafta',
      width: '110px',
      render: (val) => <span className="font-mono text-slate-400 text-xs">{val}</span>,
    },
    {
      key: 'finish_date',
      label: 'Bitiş Tarihi',
      width: '100px',
      render: (val) => <span className="font-mono text-sky-400 font-semibold">{formatDateTR(val)}</span>,
    },
    {
      key: 'consumption_name',
      label: 'Tüketim Adı (Ürün Tanımı)',
      render: (val, item) => (
        <div>
          <div className="font-medium text-slate-200 line-clamp-1">{val}</div>
          <div className="text-[10px] font-mono text-slate-500">{item.consumption_code}</div>
        </div>
      ),
    },
    {
      key: 'tube_size',
      label: 'Çap ve Boy',
      width: '95px',
      render: (val) => (
        <span className="font-mono text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
          {val}
        </span>
      ),
    },
    {
      key: 'planned_units',
      label: 'Üretilecek Miktar',
      align: 'right',
      width: '130px',
      render: (val) => (
        <span className="font-mono font-bold text-white text-xs bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
          {formatNumber(val)}
        </span>
      ),
    },
    {
      key: 'machine',
      label: 'Atanan Hat',
      width: '150px',
      render: (val) => (
        <span className="font-mono text-slate-300 text-xs">
          {val || 'Atanmadı'}
        </span>
      ),
    },
    {
      key: 'shift',
      label: 'Vardiya',
      width: '170px',
      render: (val) => <span className="text-[11px] text-slate-400">{val || 'Standart'}</span>,
    },
    {
      key: 'material_status',
      label: 'Malzeme Durumu',
      width: '140px',
      render: (val) => {
        if (val === 'ready') return <EnterpriseBadge variant="success">Levha Hazır</EnterpriseBadge>;
        if (val === 'awaiting_quality') return <EnterpriseBadge variant="warning">Kalite Onayında</EnterpriseBadge>;
        if (val === 'awaiting_print') return <EnterpriseBadge variant="info">Matbaa Bekliyor</EnterpriseBadge>;
        return <EnterpriseBadge variant="critical">Ham Levha Eksik</EnterpriseBadge>;
      },
    },
    {
      key: 'actions',
      label: 'İşlem',
      width: '70px',
      align: 'center',
      sortable: false,
      render: (_, item) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleOpenEdit(item);
          }}
          className="text-sky-400 hover:text-sky-300 font-mono text-xs"
        >
          Düzenle
        </button>
      ),
    },
  ];

  return (
    <AppShell pageTitle="Teneke Üretim Planı">
      {/* Invariant & Disclaimer Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-base">🏭</span>
          <div>
            <span className="font-bold text-sky-300">REFERANS ÜRETİM PLANI VERİLERİ: </span>
            <span className="text-slate-300">
              Bu satırlar kaynak görseldeki 20 adet 2026 Kasım üretim plan satırıdır. Hat/makine kısıtları ve termin optimizasyonu Faz 5 konusudur.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-slate-400 font-mono text-xs">
            Toplam: <b className="text-white">{formatAdet(totalPlannedUnits)}</b>
          </span>
          <div className="bg-slate-950 border border-slate-800 rounded p-0.5 flex">
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                viewMode === 'list' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Liste Görünümü
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                viewMode === 'calendar' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Haftalık Takvim
            </button>
          </div>
        </div>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          <EnterpriseDataGrid
            data={productionPlans}
            columns={columns}
            keyField="id"
            searchPlaceholder="Tüketim adı, kodu veya ebat ara..."
            pageSize={15}
            onRowClick={(item) => setActivePlanItem(item)}
          />
        </div>
      )}

      {/* Weekly Calendar View */}
      {viewMode === 'calendar' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {calendarGroups.map(([date, items]) => (
              <div
                key={date}
                className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-2 flex flex-col"
              >
                {/* Day Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div>
                    <div className="text-xs font-bold text-sky-400 font-mono">{formatDateTR(date)}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{items[0]?.week_source}</div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {items.length} İş Emri
                  </span>
                </div>

                {/* Day Jobs List */}
                <div className="space-y-2 flex-1 overflow-y-auto max-h-[380px]">
                  {items.map((job) => (
                    <div
                      key={job.id}
                      onClick={() => handleOpenEdit(job)}
                      className="p-2.5 rounded bg-slate-950/70 border border-slate-800 hover:border-sky-500/80 cursor-pointer transition-colors space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-semibold text-slate-200 text-xs line-clamp-1">
                          {job.consumption_name.split(')-')[1] || job.consumption_name}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 bg-slate-900 px-1 py-0.2 rounded border border-slate-800 shrink-0">
                          {job.tube_size}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-sky-300 font-bold">{formatNumber(job.planned_units)} Ad.</span>
                        <span className="text-[10px] text-slate-400 truncate max-w-[100px]">{job.machine}</span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-850">
                        <span className="text-slate-500 font-mono truncate">{job.shift?.split(' (')[0]}</span>
                        <EnterpriseBadge
                          variant={job.material_status === 'ready' ? 'success' : 'warning'}
                          size="xs"
                        >
                          {job.material_status === 'ready' ? 'Hazır' : 'Kalitede'}
                        </EnterpriseBadge>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Day Total Units */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Günlük Toplam:</span>
                  <span className="font-bold text-white">
                    {formatNumber(items.reduce((s, i) => s + i.planned_units, 0))} Adet
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plan Detail Modal */}
      {activePlanItem && (
        <EnterpriseModal
          isOpen={!!activePlanItem}
          onClose={() => setActivePlanItem(null)}
          title={`Üretim İşi Detayı: ${activePlanItem.consumption_code}`}
          subtitle={activePlanItem.consumption_name}
          footer={
            <>
              <button
                onClick={() => {
                  const it = activePlanItem;
                  setActivePlanItem(null);
                  handleOpenEdit(it);
                }}
                className="px-3 py-1.5 rounded bg-sky-600 text-white text-xs font-semibold"
              >
                Planı Düzenle
              </button>
              <button
                onClick={() => setActivePlanItem(null)}
                className="px-3 py-1.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-xs"
              >
                Kapat
              </button>
            </>
          }
        >
          <div className="space-y-3 font-mono">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">PLAN BİTİŞ TARİHİ</span>
                <span className="font-bold text-slate-200">{formatDateTR(activePlanItem.finish_date)}</span>
                <span className="text-[10px] text-slate-400 block">{activePlanItem.week_source}</span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">ÜRETİLECEK MİKTAR</span>
                <span className="font-bold text-sky-300 text-sm">{formatAdet(activePlanItem.planned_units)}</span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">ATANAN HAT / MAKİNE</span>
                <span className="font-bold text-slate-200">{activePlanItem.machine || 'Atanmadı'}</span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">VARDİYA</span>
                <span className="text-slate-300">{activePlanItem.shift || 'Standart'}</span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 col-span-2">
                <span className="text-[10px] text-slate-500 block">KAYNAK BİLGİSİ</span>
                <span className="text-[11px] text-slate-400">{activePlanItem.source}</span>
                <span className="text-[10px] text-slate-500 block">
                  Tür: {activePlanItem.record_kind}
                </span>
              </div>
            </div>
          </div>
        </EnterpriseModal>
      )}

      {/* Edit Date / Machine Modal */}
      {isEditModalOpen && editingItem && (
        <EnterpriseModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Üretim İşini Düzenle (Demo Simülasyonu)"
          subtitle={editingItem.consumption_name}
        >
          <form onSubmit={handleSaveEdit} className="space-y-3 font-sans">
            <EnterpriseFormField label="Plan Bitiş Tarihi" required>
              <EnterpriseInput
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                required
              />
            </EnterpriseFormField>

            <EnterpriseFormField label="Atanan Üretim Hattı" required>
              <select
                value={editMachine}
                onChange={(e) => setEditMachine(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded px-3 py-1.5"
              >
                <option value="Tüp Gövde Üretim Hattı (Tek Makine)">Tüp Gövde Üretim Hattı (Tek Makine)</option>
              </select>
            </EnterpriseFormField>

            <EnterpriseFormField label="Vardiya" required>
              <select
                value={editShift}
                onChange={(e) => setEditShift(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded px-3 py-1.5"
              >
                <option value="Vardiya-1 (08:00 - 16:00)">Vardiya-1 (08:00 - 16:00)</option>
                <option value="Vardiya-2 (16:00 - 24:00)">Vardiya-2 (16:00 - 24:00)</option>
                <option value="Vardiya-3 (00:00 - 08:00)">Vardiya-3 (00:00 - 08:00)</option>
              </select>
            </EnterpriseFormField>

            <EnterpriseFormField label="Üretilecek Miktar (Adet)" required>
              <EnterpriseInput
                type="number"
                value={editUnits}
                onChange={(e) => setEditUnits(e.target.value)}
                required
              />
            </EnterpriseFormField>

            <EnterpriseFormField label="Malzeme Yeterlilik Durumu">
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded px-3 py-1.5"
              >
                <option value="ready">Levha Hazır (Üretime Uygun)</option>
                <option value="awaiting_quality">Kalite Onayında</option>
                <option value="awaiting_print">Matbaa Bekliyor</option>
                <option value="missing_raw_sheet">Ham Levha Eksik</option>
              </select>
            </EnterpriseFormField>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                İptal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold rounded bg-sky-600 hover:bg-sky-500 text-white"
              >
                Değişiklikleri Kaydet
              </button>
            </div>
          </form>
        </EnterpriseModal>
      )}
    </AppShell>
  );
}
