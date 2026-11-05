'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/store';
import { AppShell } from '@/components/shell/AppShell';
import { EnterpriseBadge } from '@/components/ui/EnterpriseBadge';
import { EnterpriseModal } from '@/components/ui/EnterpriseModal';
import { ColorChip } from '@/components/ui/ColorChip';
import { ProductTechnical, RawSheet, TubeCapacity, SheetLayout, BusinessRule, ProductionLine } from '@/lib/types';
import { formatNumber } from '@/lib/formatters';

type TabType = 'products' | 'raw_sheets' | 'capacities' | 'layouts' | 'rules' | 'lines' | 'roles_audit' | 'excel_import';

export default function TeknikTanimlarPage() {
  const {
    products,
    rawSheets,
    capacities,
    sheetLayouts,
    businessRules,
    productionLines,
    roles,
    currentRole,
    auditLogs,
    setCurrentRole,
    addProduct,
    updateProduct,
    deleteProduct,
    addRawSheet,
    updateRawSheet,
    addSheetLayout,
    updateSheetLayout,
    deleteSheetLayout,
    updateBusinessRule,
    toggleBusinessRuleActive,
    resetAllDemoData,
  } = useApp();

  const [activeTab, setActiveTab] = useState<TabType>('products');

  // Modal states for Product
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductTechnical | null>(null);
  const [productCode, setProductCode] = useState('');
  const [productName, setProductName] = useState('');
  const [productSize, setProductSize] = useState('52x195');
  const [productSurface, setProductSurface] = useState('EMAYE');
  const [productVarnish, setProductVarnish] = useState('BELİRTİLMEMİŞ');
  const [productLacquer, setProductLacquer] = useState('BELİRTİLMEMİŞ');
  const [productInsideCoating, setProductInsideCoating] = useState('BELİRTİLMEMİŞ');
  const [productColors, setProductColors] = useState('C, M, Y, K');
  const [productRawSheetDesc, setProductRawSheetDesc] = useState('');

  // Modal states for Layout
  const [isLayoutModalOpen, setIsLayoutModalOpen] = useState(false);
  const [editingLayout, setEditingLayout] = useState<SheetLayout | null>(null);
  const [layoutTubeSize, setLayoutTubeSize] = useState('52x195');
  const [layoutRawSheetCode, setLayoutRawSheetCode] = useState('500011000004-1206');
  const [layoutRows, setLayoutRows] = useState(4);
  const [layoutCols, setLayoutCols] = useState(5);
  const [layoutOrientation, setLayoutOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [layoutCellOrder, setLayoutCellOrder] = useState<'row_major' | 'column_major'>('row_major');
  const [layoutStatus, setLayoutStatus] = useState<'verified' | 'unverified' | 'provisional'>('verified');
  const [layoutNotes, setLayoutNotes] = useState('');

  // Excel import demo state
  const [importSelectedFile, setImportSelectedFile] = useState('SOFT ODA SPR 300 ML 30.10.2026.xls');
  const [importStatusMessage, setImportStatusMessage] = useState<string | null>(null);

  const isReadOnly = currentRole === 'viewer';

  // Handle open add product
  const handleOpenAddProduct = () => {
    if (isReadOnly) return;
    setEditingProduct(null);
    setProductCode('');
    setProductName('');
    setProductSize('52x195');
    setProductSurface('EMAYE');
    setProductVarnish('BELİRTİLMEMİŞ');
    setProductLacquer('BELİRTİLMEMİŞ');
    setProductInsideCoating('GOLD');
    setProductColors('C, M, Y, K');
    setProductRawSheetDesc('HAM LEVHA-017x832x800- (T 61) -52x195');
    setIsProductModalOpen(true);
  };

  // Handle open edit product
  const handleOpenEditProduct = (item: ProductTechnical) => {
    if (isReadOnly) return;
    setEditingProduct(item);
    setProductCode(item.stock_code);
    setProductName(item.stock_name);
    setProductSize(item.tube_size);
    setProductSurface(item.print_surface);
    setProductVarnish(item.varnish);
    setProductLacquer(item.lacquer);
    setProductInsideCoating(item.inside_coating || 'BELİRTİLMEMİŞ');
    setProductColors(item.colors.join(', '));
    setProductRawSheetDesc(item.raw_sheet_description_source || '');
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!productCode.trim() || !productName.trim()) {
      alert('Stok kodu ve adı zorunludur.');
      return;
    }

    const [d, h] = productSize.split('x').map((n) => parseInt(n, 10) || 0);
    const colorArray = productColors.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean);

    const payload: ProductTechnical = {
      stock_code: productCode.trim(),
      stock_name: productName.trim(),
      tube_size: productSize,
      diameter_mm: d,
      height_mm: h,
      raw_sheet_description_source: productRawSheetDesc,
      raw_sheet_stock_code_candidate: null,
      raw_sheet_code_mapping_status: 'matched',
      print_surface: productSurface,
      varnish: productVarnish,
      lacquer: productLacquer,
      inside_coating: productInsideCoating,
      colors: colorArray,
      special_parameter_source: null,
      record_kind: editingProduct ? editingProduct.record_kind : 'synthetic_demo',
      notes: editingProduct?.notes,
    };

    if (editingProduct) {
      updateProduct(editingProduct.stock_code, payload);
    } else {
      addProduct(payload);
    }
    setIsProductModalOpen(false);
  };

  // Layout save
  const handleSaveLayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    const payload: SheetLayout = {
      id: editingLayout ? editingLayout.id : `LAYOUT-${layoutTubeSize}-${Date.now().toString().slice(-4)}`,
      tube_size: layoutTubeSize,
      raw_sheet_code: layoutRawSheetCode,
      rows: Number(layoutRows) || 1,
      cols: Number(layoutCols) || 1,
      orientation: layoutOrientation,
      cell_order: layoutCellOrder,
      verification_status: layoutStatus,
      margin_mm: 10,
      gap_mm: 4,
      notes: layoutNotes.trim() || 'Kullanıcı tanımlı montaj düzeni.',
      record_kind: 'synthetic_demo',
    };

    if (editingLayout) {
      updateSheetLayout(editingLayout.id, payload);
    } else {
      addSheetLayout(payload);
    }
    setIsLayoutModalOpen(false);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Teknik Tanımlar ve Parametre Yönetimi
              </h1>
              <EnterpriseBadge variant="neutral" size="sm">
                Faz 2 Kalıcı Veri
              </EnterpriseBadge>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Ham levhalar, ebat kapasiteleri, ürün teknik kartları, montaj düzeni, iş kuralları ve sistem denetim izi.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isReadOnly && (
              <span className="px-2.5 py-1 text-xs font-mono bg-rose-50 text-rose-700 border border-rose-200 rounded">
                🔒 Salt Okunur (Görüntüleme Rolü)
              </span>
            )}
            <button
              onClick={() => {
                if (confirm('Tüm veriler varsayılan fabrika ayarlarına sıfırlansın mı?')) {
                  resetAllDemoData();
                }
              }}
              className="px-3 py-1.5 text-xs font-mono bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-300 rounded transition-colors"
            >
              Fabrika Ayarlarına Sıfırla
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap border-b border-slate-200 gap-1 text-xs font-mono">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-3.5 py-2 border-b-2 font-semibold transition-colors ${
              activeTab === 'products'
                ? 'border-sky-600 text-sky-700 bg-sky-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Tüp Kartları ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('layouts')}
            className={`px-3.5 py-2 border-b-2 font-semibold transition-colors ${
              activeTab === 'layouts'
                ? 'border-sky-600 text-sky-700 bg-sky-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Montaj Görünümü ({sheetLayouts.length})
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3.5 py-2 border-b-2 font-semibold transition-colors ${
              activeTab === 'rules'
                ? 'border-sky-600 text-sky-700 bg-sky-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            İş Kuralları ({businessRules.length})
          </button>
          <button
            onClick={() => setActiveTab('raw_sheets')}
            className={`px-3.5 py-2 border-b-2 font-semibold transition-colors ${
              activeTab === 'raw_sheets'
                ? 'border-sky-600 text-sky-700 bg-sky-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Ham Levhalar ({rawSheets.length})
          </button>
          <button
            onClick={() => setActiveTab('capacities')}
            className={`px-3.5 py-2 border-b-2 font-semibold transition-colors ${
              activeTab === 'capacities'
                ? 'border-sky-600 text-sky-700 bg-sky-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Ebat Kapasiteleri ({capacities.length})
          </button>
          <button
            onClick={() => setActiveTab('lines')}
            className={`px-3.5 py-2 border-b-2 font-semibold transition-colors ${
              activeTab === 'lines'
                ? 'border-sky-600 text-sky-700 bg-sky-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Hat ve Vardiyalar ({productionLines.length})
          </button>
          <button
            onClick={() => setActiveTab('roles_audit')}
            className={`px-3.5 py-2 border-b-2 font-semibold transition-colors ${
              activeTab === 'roles_audit'
                ? 'border-sky-600 text-sky-700 bg-sky-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Yetki & Denetim İzi ({auditLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('excel_import')}
            className={`px-3.5 py-2 border-b-2 font-semibold transition-colors ${
              activeTab === 'excel_import'
                ? 'border-sky-600 text-sky-700 bg-sky-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Excel İçe Aktar
          </button>
        </div>

        {/* TAB 1: ÜRÜN TEKNİK KARTLARI */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
              <div className="text-xs text-slate-600">
                Toplam <b>{products.length}</b> adet teknik ürün kartı listeleniyor.
                Zemin, vernik, lak ve iç kaplama 4 bağımsız alandır.
              </div>
              <button
                disabled={isReadOnly}
                onClick={handleOpenAddProduct}
                className={`px-3 py-1.5 text-xs font-mono rounded font-bold transition-colors ${
                  isReadOnly
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    : 'bg-sky-600 hover:bg-sky-700 text-white shadow-xs'
                }`}
              >
                + Yeni Ürün Tanımla
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-semibold uppercase tracking-wider text-slate-600 text-[10px]">
                      <th className="py-2.5 px-3">Stok Kodu</th>
                      <th className="py-2.5 px-3">Stok İsmi</th>
                      <th className="py-2.5 px-2">Ebat</th>
                      <th className="py-2.5 px-2">Zemin</th>
                      <th className="py-2.5 px-2">Vernik</th>
                      <th className="py-2.5 px-2">Lak</th>
                      <th className="py-2.5 px-2">İç Kaplama</th>
                      <th className="py-2.5 px-2">Renkler</th>
                      <th className="py-2.5 px-2">Kayıt Türü</th>
                      <th className="py-2.5 px-2 text-center w-16">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((p) => (
                      <tr key={p.stock_code} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{p.stock_code}</td>
                        <td className="py-2.5 px-3 text-slate-900 font-medium">{p.stock_name}</td>
                        <td className="py-2.5 px-2 font-mono text-slate-700">{p.tube_size}</td>
                        <td className="py-2.5 px-2">
                          <EnterpriseBadge variant={p.print_surface === 'METALİK' ? 'purple' : 'neutral'} size="sm">
                            {p.print_surface}
                          </EnterpriseBadge>
                        </td>
                        <td className="py-2.5 px-2">
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                            p.varnish === 'PARLAK' ? 'bg-sky-50 text-sky-800 border-sky-200' :
                            p.varnish === 'KISMİ' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                            'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            {p.varnish}
                          </span>
                        </td>
                        <td className="py-2.5 px-2">
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                            p.lacquer === 'LAKLI' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            p.lacquer === 'LAKSIZ' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                            'bg-slate-50 text-slate-400 border-slate-200'
                          }`}>
                            {p.lacquer}
                          </span>
                        </td>
                        <td className="py-2.5 px-2">
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                            p.inside_coating === 'GOLD' ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold' :
                            'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            {p.inside_coating || 'BELİRTİLMEMİŞ'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="flex flex-wrap gap-1">
                            {p.colors.map((c, i) => (
                              <ColorChip key={i} color={c} />
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-2">
                          {p.record_kind === 'source_transcription' ? (
                            <EnterpriseBadge variant="success" size="sm">KAYNAK VERİ</EnterpriseBadge>
                          ) : (
                            <EnterpriseBadge variant="warning" size="sm">TEMSİLİ DEMO</EnterpriseBadge>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            disabled={isReadOnly}
                            onClick={() => handleOpenEditProduct(p)}
                            className="text-xs text-sky-700 hover:text-sky-900 font-mono disabled:text-slate-300"
                          >
                            Düzenle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MONTAJ GÖRÜNÜMÜ (SHEET LAYOUTS) */}
        {activeTab === 'layouts' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
              <div className="text-xs text-slate-600">
                Kullanıcı tarafından tanımlanmış gerçek fiziksel montaj kalıp düzenleri.
                <b> Satır × Sütun</b> çarpımı ile hazır levha kapasitesi tutarlılığı denetlenir; otomatik kapasite değiştirilmez.
              </div>
              <button
                disabled={isReadOnly}
                onClick={() => {
                  setEditingLayout(null);
                  setLayoutTubeSize('52x195');
                  setLayoutRawSheetCode('500011000004-1206');
                  setLayoutRows(4);
                  setLayoutCols(5);
                  setLayoutOrientation('landscape');
                  setLayoutCellOrder('row_major');
                  setLayoutStatus('verified');
                  setLayoutNotes('');
                  setIsLayoutModalOpen(true);
                }}
                className={`px-3 py-1.5 text-xs font-mono rounded font-bold transition-colors ${
                  isReadOnly
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    : 'bg-sky-600 hover:bg-sky-700 text-white shadow-xs'
                }`}
              >
                + Yeni Montaj Düzeni Ekle
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-semibold uppercase tracking-wider text-slate-600 text-[10px]">
                      <th className="py-2.5 px-3">Ebat</th>
                      <th className="py-2.5 px-3">Ham Levha Kodu</th>
                      <th className="py-2.5 px-2 text-center">Düzen (Satır × Sütun)</th>
                      <th className="py-2.5 px-2 text-center">Toplam Yuva</th>
                      <th className="py-2.5 px-2 text-center">Hazır Kapasite</th>
                      <th className="py-2.5 px-2">Tutarlılık Durumu</th>
                      <th className="py-2.5 px-2">Yön / Hücre Sırası</th>
                      <th className="py-2.5 px-2">Doğrulama Durumu</th>
                      <th className="py-2.5 px-3">Notlar</th>
                      <th className="py-2.5 px-2 text-center w-20">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {sheetLayouts.map((l) => {
                      const matchedCap = capacities.find((c) => c.tube_size === l.tube_size)?.units_per_sheet || 0;
                      const layoutSlots = l.rows * l.cols;
                      const isConsistent = layoutSlots === matchedCap;

                      return (
                        <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{l.tube_size}</td>
                          <td className="py-2.5 px-3 text-slate-600">{l.raw_sheet_code}</td>
                          <td className="py-2.5 px-2 text-center font-bold text-slate-800">
                            {l.rows} × {l.cols}
                          </td>
                          <td className="py-2.5 px-2 text-center text-sky-700 font-bold">{layoutSlots} Yuva</td>
                          <td className="py-2.5 px-2 text-center text-slate-600">{matchedCap} Tüp</td>
                          <td className="py-2.5 px-2 font-sans">
                            {isConsistent ? (
                              <EnterpriseBadge variant="success" size="sm">Tam Uyumlu</EnterpriseBadge>
                            ) : (
                              <EnterpriseBadge variant="critical" size="sm">Uyuşmazlık!</EnterpriseBadge>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-[11px] text-slate-600">
                            {l.orientation === 'landscape' ? 'Yatay' : 'Dikey'} / {l.cell_order === 'row_major' ? 'Satır' : 'Sütun'}
                          </td>
                          <td className="py-2.5 px-2 font-sans">
                            {l.verification_status === 'verified' ? (
                              <EnterpriseBadge variant="success" size="sm">Doğrulanmış</EnterpriseBadge>
                            ) : l.verification_status === 'provisional' ? (
                              <EnterpriseBadge variant="warning" size="sm">Geçici Taslak</EnterpriseBadge>
                            ) : (
                              <EnterpriseBadge variant="neutral" size="sm">Doğrulanmamış</EnterpriseBadge>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] font-sans text-slate-500 max-w-xs truncate">{l.notes}</td>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              disabled={isReadOnly}
                              onClick={() => {
                                setEditingLayout(l);
                                setLayoutTubeSize(l.tube_size);
                                setLayoutRawSheetCode(l.raw_sheet_code);
                                setLayoutRows(l.rows);
                                setLayoutCols(l.cols);
                                setLayoutOrientation(l.orientation);
                                setLayoutCellOrder(l.cell_order);
                                setLayoutStatus(l.verification_status);
                                setLayoutNotes(l.notes || '');
                                setIsLayoutModalOpen(true);
                              }}
                              className="text-xs text-sky-700 hover:text-sky-900 font-mono disabled:text-slate-300 mr-2"
                            >
                              Düzenle
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: İŞ KURALLARI YÖNETİMİ */}
        {activeTab === 'rules' && (
          <div className="space-y-4">
            <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-sm text-xs text-slate-600 flex justify-between items-center">
              <div>
                İş kuralı modeli: Kapsam, koşul alanı, operatör, parametre değeri, kural türü (Kesin Engel / Onay / Tercih) ve öncelik.
                Kurallar yönetilebilir olup kod içerisine sabitlenmez.
              </div>
              {currentRole !== 'admin' && (
                <span className="text-amber-700 font-mono text-[11px] bg-amber-50 px-2 py-1 rounded border border-amber-200">
                  Kural aktifliği yalnız Yönetici (Admin) rolüyle değiştirilebilir.
                </span>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-semibold uppercase tracking-wider text-slate-600 text-[10px]">
                    <th className="py-2.5 px-3">Kod</th>
                    <th className="py-2.5 px-3">Kural Başlığı ve Açıklama</th>
                    <th className="py-2.5 px-2">Kapsam</th>
                    <th className="py-2.5 px-2">Koşul & Operatör</th>
                    <th className="py-2.5 px-2">Parametre</th>
                    <th className="py-2.5 px-2">Kural Türü</th>
                    <th className="py-2.5 px-2 text-center">Öncelik</th>
                    <th className="py-2.5 px-2 text-center">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {businessRules.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{r.code}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{r.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{r.description}</div>
                      </td>
                      <td className="py-2.5 px-2 font-mono text-slate-600">{r.scope}</td>
                      <td className="py-2.5 px-2 font-mono text-slate-700">
                        {r.condition_field} : <span className="font-bold">{r.operator}</span>
                      </td>
                      <td className="py-2.5 px-2 font-mono font-bold text-sky-800">{r.parameter_value}</td>
                      <td className="py-2.5 px-2">
                        {r.rule_type === 'strict_block' ? (
                          <EnterpriseBadge variant="critical" size="sm">Kesin Engel</EnterpriseBadge>
                        ) : r.rule_type === 'requires_approval' ? (
                          <EnterpriseBadge variant="warning" size="sm">Onay Gerekir</EnterpriseBadge>
                        ) : (
                          <EnterpriseBadge variant="neutral" size="sm">Tercih</EnterpriseBadge>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-700">{r.priority}</td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          disabled={currentRole !== 'admin'}
                          onClick={() => toggleBusinessRuleActive(r.id)}
                          className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border transition-colors ${
                            r.is_active
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-400 border-slate-300 hover:bg-slate-200'
                          } ${currentRole !== 'admin' ? 'cursor-not-allowed opacity-60' : ''}`}
                        >
                          {r.is_active ? 'AKTİF' : 'PASİF'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: HAM LEVHALAR */}
        {activeTab === 'raw_sheets' && (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold uppercase tracking-wider text-slate-600 text-[10px]">
                  <th className="py-2.5 px-3">Kısa İsim</th>
                  <th className="py-2.5 px-3">Stok Kodu</th>
                  <th className="py-2.5 px-3">Stok İsmi</th>
                  <th className="py-2.5 px-2 text-right">Kalınlık (mm)</th>
                  <th className="py-2.5 px-2 text-right">En (mm)</th>
                  <th className="py-2.5 px-2 text-right">Boy (mm)</th>
                  <th className="py-2.5 px-2">Kalite</th>
                  <th className="py-2.5 px-2">Bağlı Ebat</th>
                  <th className="py-2.5 px-2 text-center">Min. Baskı (Kaynak)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {rawSheets.map((s) => (
                  <tr key={s.stock_code} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-800">{s.short_name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{s.stock_code}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-900">{s.stock_name}</td>
                    <td className="py-2.5 px-2 text-right">{s.thickness_source_value}</td>
                    <td className="py-2.5 px-2 text-right font-bold text-slate-800">{s.width_mm}</td>
                    <td className="py-2.5 px-2 text-right font-bold text-slate-800">{s.height_mm}</td>
                    <td className="py-2.5 px-2 font-bold text-sky-800">{s.grade_source}</td>
                    <td className="py-2.5 px-2 text-slate-800">{s.tube_size}</td>
                    <td className="py-2.5 px-2 text-center text-slate-400">
                      {s.minimum_print_sheets_source || 'BOŞ (1.250 varsayılan)'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 5: EBAT KAPASİTELERİ */}
        {activeTab === 'capacities' && (
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
              <b>Referans Notu:</b> Bu tablodaki kapasiteler hazır parametredir. "Çeşit" ve "Adet" kaynak başlıklarının operasyonel anlamı henüz doğrulanmadığından fiziksel yerleşim kuralı türetilmez.
            </div>
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-semibold uppercase tracking-wider text-slate-600 text-[10px]">
                    <th className="py-2.5 px-3">Kutu Ebadı</th>
                    <th className="py-2.5 px-2 text-right">1 Levhadan Çıkan Kutu Adedi (Kapasite)</th>
                    <th className="py-2.5 px-2 text-right">Kaynak Çeşit</th>
                    <th className="py-2.5 px-2 text-right">Kaynak Adet</th>
                    <th className="py-2.5 px-2 text-right">Tek Çeşit Sipariş Miktarı (1.250 Levha İçin)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {capacities.map((c) => (
                    <tr key={c.tube_size} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{c.tube_size}</td>
                      <td className="py-2.5 px-2 text-right font-bold text-sky-700">{c.units_per_sheet}</td>
                      <td className="py-2.5 px-2 text-right text-slate-600">{c.variety_source}</td>
                      <td className="py-2.5 px-2 text-right text-slate-600">{formatNumber(c.quantity_source)}</td>
                      <td className="py-2.5 px-2 text-right text-slate-900 font-bold">{formatNumber(c.single_variety_order_quantity_source)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: HAT VE VARDİYALAR */}
        {activeTab === 'lines' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-600 bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
              Makas kesim hatları ve tüp gövde hatları kapasite parametreleri. Vardiya, hat hızı, ayar süresi ve fire yüzdesi tanımlanır.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {productionLines.map((line) => (
                <div key={line.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-900 font-mono">{line.code}</span>
                    <EnterpriseBadge variant={line.line_type === 'shearing' ? 'neutral' : 'purple'} size="sm">
                      {line.line_type === 'shearing' ? 'Makas Hattı' : 'Tüp Gövde Hattı'}
                    </EnterpriseBadge>
                  </div>
                  <div className="text-xs font-semibold text-slate-800">{line.name}</div>
                  <div className="space-y-1.5 text-xs font-mono text-slate-600">
                    <div className="flex justify-between">
                      <span>Vardiya / Gün:</span>
                      <b className="text-slate-800">{line.shifts_per_day} (7.5 saat/vardiya)</b>
                    </div>
                    <div className="flex justify-between">
                      <span>Hat Hızı:</span>
                      <b className="text-sky-700">{formatNumber(line.speed_units_per_hour)} {line.line_type === 'shearing' ? 'levha/saat' : 'tüp/saat'}</b>
                    </div>
                    <div className="flex justify-between">
                      <span>Ayar Geçiş Süresi:</span>
                      <b className="text-slate-800">{line.setup_time_hours} saat</b>
                    </div>
                    <div className="flex justify-between">
                      <span>Fire Oranı:</span>
                      <b className="text-rose-700">%{line.waste_rate_percent}</b>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-mono text-slate-500 block mb-1">Desteklenen Ebatlar:</span>
                    <div className="flex flex-wrap gap-1">
                      {line.supported_tube_sizes.map((s, idx) => (
                        <span key={idx} className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: KULLANICI ROLLERİ & DENETİM İZİ */}
        {activeTab === 'roles_audit' && (
          <div className="space-y-6">
            {/* Role Switcher Demo */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  AKTİF KULLANICI ROLÜ SİMÜLATÖRÜ
                </h3>
                <span className="text-xs font-mono">
                  Şu anki Rol: <b className="text-sky-700 uppercase">{currentRole}</b>
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {roles.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setCurrentRole(r.name)}
                    className={`flex-1 min-w-[200px] p-3 rounded-lg border text-left transition-all ${
                      currentRole === r.name
                        ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-200'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900">{r.title}</div>
                    <div className="text-[10px] font-mono text-slate-500 mt-1">
                      Parametre Düzenleme: {r.can_edit_parameters ? '✓ Evet' : '✕ Hayır'} | Kural Değiştirme: {r.can_edit_rules ? '✓ Evet' : '✕ Hayır'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Audit Log Table */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm space-y-2">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  SİSTEM DENETİM İZİ (AUDIT LOG - {auditLogs.length} Kayıt)
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Kritik parametre ve kural değişiklikleri zaman damgasıyla saklanır
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-semibold uppercase tracking-wider text-slate-600 text-[10px]">
                      <th className="py-2.5 px-3">Zaman</th>
                      <th className="py-2.5 px-3">Kullanıcı / Rol</th>
                      <th className="py-2.5 px-2">Varlık Türü</th>
                      <th className="py-2.5 px-2">İşlem</th>
                      <th className="py-2.5 px-3">Detay Açıklama</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-500">{log.timestamp}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">
                          {log.user_name} <span className="text-[9px] text-slate-400">({log.user_role})</span>
                        </td>
                        <td className="py-2 px-2 text-slate-700">{log.entity_type}</td>
                        <td className="py-2 px-2">
                          <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                            log.action === 'create' ? 'bg-emerald-50 text-emerald-800' :
                            log.action === 'update' ? 'bg-sky-50 text-sky-800' :
                            log.action === 'delete' ? 'bg-rose-50 text-rose-800' :
                            'bg-amber-50 text-amber-800'
                          }`}>
                            {log.action.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-700">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: EXCEL İÇE AKTARMA (IMPORT) */}
        {activeTab === 'excel_import' && (
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                EXCEL İÇE AKTARMA VE KOLON EŞLEME SİMÜLATÖRÜ
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Matbaa formu ve teknik kart Excel dosyalarının önizlemesi, kolon eşlemesi ve mükerrer kayıt kontrolü.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-700 block">Örnek Kaynak Dosya:</label>
                <select
                  value={importSelectedFile}
                  onChange={(e) => setImportSelectedFile(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs font-mono outline-none"
                >
                  <option value="SOFT ODA SPR 300 ML 30.10.2026.xls">SOFT ODA SPR 300 ML 30.10.2026.xls (Matbaa Sipariş Formu)</option>
                  <option value="ham-levha-listesi.xlsx">ham-levha-listesi.xlsx (14 Ham Levha)</option>
                  <option value="ebat-kapasite.xlsx">ebat-kapasite.xlsx (18 Ebat)</option>
                </select>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1 font-mono">
                  <div className="font-bold text-slate-800">Algılanan Kolonlar ve Eşleme:</div>
                  <div className="text-slate-600">✓ Ürün Adı → stock_name</div>
                  <div className="text-slate-600">✓ Tekrar/Levha → repeats_per_sheet</div>
                  <div className="text-slate-600">✓ İçi: GOLD → inside_coating (Lak değil, İç Kaplama)</div>
                  <div className="text-slate-600">✓ Dışı: EMAYE → print_surface</div>
                  <div className="text-slate-600">✓ Levha Adedi (1.250) → sheet_count</div>
                  <div className="text-amber-700">⚠️ Stok Kodu: Kaynakta bulunamadı (Temsili kod atanacak)</div>
                  <div className="text-amber-700">⚠️ Vernik / Lak: Belirtilmemiş (Varsayım yapılmayacak)</div>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="text-xs font-bold text-slate-800">İçe Aktarma Önizleme & Doğrulama:</div>
                <ul className="text-xs text-slate-600 space-y-1.5 font-sans">
                  <li>• Toplam Okunan Kalem: <b>6 Ürün (2 Montaj)</b></li>
                  <li>• Ebat: <b>52×195 mm</b></li>
                  <li>• Ham Levha: <b>0.17×832×800 mm</b></li>
                  <li>• Çift Kayıt / Mükerrer Kontrolü: <b>Temiz (0 mükerrer)</b></li>
                </ul>

                <button
                  disabled={isReadOnly}
                  onClick={() => {
                    setImportStatusMessage('Excel dosyası başarıyla doğrulandı ve kalıcı veritabanına aktarıldı (6 kayıt).');
                  }}
                  className={`w-full py-2 text-xs font-mono font-bold rounded transition-colors ${
                    isReadOnly
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                  }`}
                >
                  Onayla ve Sisteme Aktar
                </button>

                {importStatusMessage && (
                  <div className="p-2 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded font-mono">
                    ✓ {importStatusMessage}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Ürün Ekle / Düzenle */}
        <EnterpriseModal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          title={editingProduct ? 'Ürün Kartını Düzenle' : 'Yeni Ürün Kartı Tanımla'}
          size="md"
        >
          <form onSubmit={handleSaveProduct} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Stok Kodu:</label>
                <input
                  type="text"
                  required
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono outline-none focus:border-sky-500"
                  placeholder="511109010910-..."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Ebat:</label>
                <select
                  value={productSize}
                  onChange={(e) => setProductSize(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono outline-none"
                >
                  {capacities.map((c) => (
                    <option key={c.tube_size} value={c.tube_size}>
                      {c.tube_size} ({c.units_per_sheet} tüp/levha)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Stok İsmi:</label>
              <input
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-sans outline-none focus:border-sky-500"
                placeholder="TUP-..."
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Zemin:</label>
                <select
                  value={productSurface}
                  onChange={(e) => setProductSurface(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs outline-none"
                >
                  <option value="EMAYE">EMAYE</option>
                  <option value="METALİK">METALİK</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Vernik:</label>
                <select
                  value={productVarnish}
                  onChange={(e) => setProductVarnish(e.target.value)}
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
                  value={productLacquer}
                  onChange={(e) => setProductLacquer(e.target.value)}
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
                  value={productInsideCoating}
                  onChange={(e) => setProductInsideCoating(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs outline-none"
                >
                  <option value="BELİRTİLMEMİŞ">BELİRTİLMEMİŞ</option>
                  <option value="GOLD">GOLD</option>
                  <option value="STANDART">STANDART</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Renkler (Virgülle ayrılmış):</label>
              <input
                type="text"
                value={productColors}
                onChange={(e) => setProductColors(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono outline-none focus:border-sky-500"
                placeholder="C, M, Y, K, 368C"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="px-3 py-1.5 text-xs font-mono text-slate-600 hover:text-slate-800"
              >
                İptal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-mono font-bold bg-sky-600 text-white rounded hover:bg-sky-700 shadow-xs"
              >
                Kaydet
              </button>
            </div>
          </form>
        </EnterpriseModal>

        {/* MODAL: Montaj Düzeni Ekle / Düzenle */}
        <EnterpriseModal
          isOpen={isLayoutModalOpen}
          onClose={() => setIsLayoutModalOpen(false)}
          title={editingLayout ? 'Montaj Düzenini Düzenle' : 'Yeni Montaj Düzeni Tanımla'}
          size="md"
        >
          <form onSubmit={handleSaveLayout} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Ebat:</label>
                <select
                  value={layoutTubeSize}
                  onChange={(e) => setLayoutTubeSize(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono outline-none"
                >
                  {capacities.map((c) => (
                    <option key={c.tube_size} value={c.tube_size}>
                      {c.tube_size} (Hazır Kapasite: {c.units_per_sheet})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Ham Levha:</label>
                <select
                  value={layoutRawSheetCode}
                  onChange={(e) => setLayoutRawSheetCode(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono outline-none"
                >
                  {rawSheets.map((s) => (
                    <option key={s.stock_code} value={s.stock_code}>
                      {s.stock_code} ({s.width_mm}x{s.height_mm})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Satır Sayısı:</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  required
                  value={layoutRows}
                  onChange={(e) => setLayoutRows(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Sütun Sayısı:</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  required
                  value={layoutCols}
                  onChange={(e) => setLayoutCols(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Toplam Yuva:</label>
                <div className="px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-100 rounded border border-slate-300 text-sky-800">
                  {layoutRows * layoutCols} Yuva
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Yön:</label>
                <select
                  value={layoutOrientation}
                  onChange={(e) => setLayoutOrientation(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs outline-none"
                >
                  <option value="landscape">Yatay (Landscape)</option>
                  <option value="portrait">Dikey (Portrait)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Hücre Sırası:</label>
                <select
                  value={layoutCellOrder}
                  onChange={(e) => setLayoutCellOrder(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs outline-none"
                >
                  <option value="row_major">Satır Öncelikli</option>
                  <option value="column_major">Sütun Öncelikli</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Doğrulama:</label>
                <select
                  value={layoutStatus}
                  onChange={(e) => setLayoutStatus(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs outline-none"
                >
                  <option value="verified">Doğrulanmış</option>
                  <option value="provisional">Geçici Taslak</option>
                  <option value="unverified">Doğrulanmamış</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Notlar / Açıklama:</label>
              <textarea
                value={layoutNotes}
                onChange={(e) => setLayoutNotes(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs outline-none"
                rows={2}
                placeholder="Ajans kalıp notları, bıçak bilgisi..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsLayoutModalOpen(false)}
                className="px-3 py-1.5 text-xs font-mono text-slate-600 hover:text-slate-800"
              >
                İptal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-mono font-bold bg-sky-600 text-white rounded hover:bg-sky-700 shadow-xs"
              >
                Kaydet
              </button>
            </div>
          </form>
        </EnterpriseModal>
      </div>
    </AppShell>
  );
}
