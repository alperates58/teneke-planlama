'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/lib/store';
import { EnterpriseBadge } from '@/components/ui/EnterpriseBadge';

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const { demands, selectedDemandIds, productionPlans } = useApp();

  const navItems = [
    {
      href: '/',
      label: 'Planlama Özeti',
      icon: '📊',
      description: 'Açık ihtiyaç ve KPI paneli',
    },
    {
      href: '/talep-havuzu',
      label: 'İhtiyaç Havuzu',
      icon: '📥',
      badge: demands.length,
      description: 'Dolum ve satış tüp talepleri',
    },
    {
      href: '/kombinasyon',
      label: 'Kombinasyon Alanı',
      icon: '🧩',
      badge: selectedDemandIds.length > 0 ? `${selectedDemandIds.length} Seçili` : undefined,
      badgeVariant: 'info' as const,
      description: 'Ham levha manuel montaj denemesi',
    },
    {
      href: '/teknik-tanimlar',
      label: 'Teknik Tanımlar',
      icon: '⚙️',
      description: 'Tüp, ham levha, ebat, renk',
    },
    {
      href: '/uretim-plani',
      label: 'Teneke Üretim Planı',
      icon: '🏭',
      badge: productionPlans.length,
      description: 'Hat/makine haftalık takvimi',
    },
    {
      href: '/entegrasyon',
      label: 'Entegrasyon & Ayarlar',
      icon: '🔌',
      description: 'SQL Server view ve eşleme taslağı',
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-950 border-r border-slate-800 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-sky-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
              TP
            </div>
            <div>
              <div className="text-xs font-black tracking-wider uppercase text-slate-100">
                TENEKE PLANLAMA
              </div>
              <div className="text-[10px] text-sky-400 font-mono">
                Alper Design OS Workbench
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Kapat"
            className="lg:hidden text-slate-400 hover:text-white p-1 text-sm font-mono"
          >
            ✕
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
            Planlama Modülleri
          </div>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onClose()}
                className={`flex items-start gap-3 p-2.5 rounded-md transition-colors ${
                  isActive
                    ? 'bg-sky-950/60 border border-sky-800/80 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
              >
                <span className="text-base select-none">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs tracking-tight">{item.label}</span>
                    {item.badge !== undefined && (
                      <EnterpriseBadge
                        variant={item.badgeVariant || (isActive ? 'info' : 'default')}
                        size="xs"
                      >
                        {item.badge}
                      </EnterpriseBadge>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate font-mono">
                    {item.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer / System invariants */}
        <div className="p-3 bg-slate-900/60 border-t border-slate-800 text-[10px] font-mono text-slate-400 space-y-1">
          <div className="flex items-center justify-between text-slate-300 font-semibold">
            <span>SİSTEM İLKELERİ</span>
            <span className="text-emerald-400">AKTİF</span>
          </div>
          <div className="text-slate-500">
            • Nesting/geometri hesabı yok
          </div>
          <div className="text-slate-500">
            • Alternatif levha önerilmez
          </div>
          <div className="text-slate-500">
            • Renk Sınırı: Max 6 benzersiz
          </div>
          <div className="text-slate-500">
            • Varsayılan Min Baskı: 1.250 Levha
          </div>
          <div className="pt-2 text-[9px] text-slate-600 border-t border-slate-800/80">
            v1.0.0 (Faz 0-1 Tam) | Lider Fabrika
          </div>
        </div>
      </aside>
    </>
  );
};
