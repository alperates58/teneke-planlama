'use client';

import React, { useState, useMemo } from 'react';

export interface GridColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
  render?: (value: any, item: T) => React.ReactNode;
}

export interface EnterpriseDataGridProps<T> {
  data: T[];
  columns: GridColumn<T>[];
  keyField: keyof T;
  searchable?: boolean;
  searchPlaceholder?: string;
  selectable?: boolean;
  selectedKeys?: string[];
  onSelect?: (keys: string[]) => void;
  density?: 'compact' | 'normal' | 'spacious';
  pageSize?: number;
  emptyMessage?: string;
  toolbarActions?: React.ReactNode;
  onRowClick?: (item: T) => void;
  className?: string;
}

export function EnterpriseDataGrid<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  searchable = true,
  searchPlaceholder = 'Grid içinde ara...',
  selectable = false,
  selectedKeys = [],
  onSelect,
  density = 'compact',
  pageSize = 15,
  emptyMessage = 'Görüntülenecek veri bulunamadı.',
  toolbarActions,
  onRowClick,
  className = '',
}: EnterpriseDataGridProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [currentDensity, setCurrentDensity] = useState(density);

  // 1. Filter
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((item) =>
      Object.values(item).some((val) => {
        if (val === null || val === undefined) return false;
        if (Array.isArray(val)) return val.some((v) => String(v).toLowerCase().includes(term));
        return String(val).toLowerCase().includes(term);
      })
    );
  }, [data, searchTerm]);

  // 2. Sort
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const res = aVal > bVal ? 1 : -1;
      return sortOrder === 'asc' ? res : -res;
    });
  }, [filteredData, sortKey, sortOrder]);

  // 3. Paginate
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onSelect) return;
    if (e.target.checked) {
      onSelect(paginatedData.map((d) => String(d[keyField])));
    } else {
      onSelect([]);
    }
  };

  const handleSelectRow = (key: string) => {
    if (!onSelect) return;
    if (selectedKeys.includes(key)) {
      onSelect(selectedKeys.filter((k) => k !== key));
    } else {
      onSelect([...selectedKeys, key]);
    }
  };

  const paddingStyle =
    currentDensity === 'compact'
      ? 'py-2 px-3 text-xs'
      : currentDensity === 'spacious'
      ? 'py-3.5 px-4 text-sm'
      : 'py-2.5 px-3.5 text-xs sm:text-sm';

  return (
    <div className={`flex flex-col bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-lg ${className}`}>
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-950/70 border-b border-slate-800">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {searchable && (
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs rounded pl-8 pr-3 py-1.5 focus:outline-none focus:border-sky-500 transition-colors"
              />
              <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs">🔍</span>
            </div>
          )}
          <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
            Filtrelenen: <b className="text-slate-200">{filteredData.length}</b> / {data.length} kayıt
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          {toolbarActions}
          {/* Density toggle */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-0.5">
            <button
              onClick={() => setCurrentDensity('compact')}
              className={`px-2 py-0.5 text-[10px] rounded font-medium transition-colors ${
                currentDensity === 'compact' ? 'bg-slate-800 text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Kompakt Yoğunluk"
            >
              Kompakt
            </button>
            <button
              onClick={() => setCurrentDensity('normal')}
              className={`px-2 py-0.5 text-[10px] rounded font-medium transition-colors ${
                currentDensity === 'normal' ? 'bg-slate-800 text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Standart Yoğunluk"
            >
              Standart
            </button>
          </div>
        </div>
      </div>

      {/* Table Canvas */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" role="grid">
          <thead>
            <tr className="bg-slate-950/90 border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400 select-none">
              {selectable && (
                <th className="w-10 px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={paginatedData.length > 0 && paginatedData.every((d) => selectedKeys.includes(String(d[keyField])))}
                    onChange={handleSelectAll}
                    aria-label="Tümünü seç"
                    className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={`${paddingStyle} ${col.sortable !== false ? 'cursor-pointer hover:text-sky-300 transition-colors' : ''} ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  <div className={`inline-flex items-center gap-1.5 ${col.align === 'right' ? 'justify-end' : ''}`}>
                    <span>{col.label}</span>
                    {sortKey === col.key && (
                      <span className="text-sky-400 text-[10px] font-bold">
                        {sortOrder === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="py-12 text-center text-xs text-slate-500 font-mono"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((item, idx) => {
                const key = String(item[keyField]);
                const isSelected = selectedKeys.includes(key);
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick && onRowClick(item)}
                    className={`transition-colors ${
                      isSelected ? 'bg-sky-950/30' : idx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-900/70'
                    } hover:bg-slate-800/60 ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    {selectable && (
                      <td className="w-10 px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(key)}
                          aria-label={`Seçim: ${key}`}
                          className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
                        />
                      </td>
                    )}
                    {columns.map((col) => {
                      const val = item[col.key];
                      return (
                        <td
                          key={col.key}
                          className={`${paddingStyle} ${
                            col.align === 'right'
                              ? 'text-right'
                              : col.align === 'center'
                              ? 'text-center'
                              : 'text-left'
                          }`}
                        >
                          {col.render ? col.render(val, item) : (val !== null && val !== undefined ? String(val) : '-')}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-t border-slate-800 text-xs text-slate-400">
          <div>
            Sayfa <span className="font-bold text-slate-200">{currentPage}</span> / {totalPages}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 text-slate-200 transition-colors"
            >
              ← Önceki
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 text-slate-200 transition-colors"
            >
              Sonraki →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
