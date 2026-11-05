'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/lib/store';
import { EnterpriseBadge } from '@/components/ui/EnterpriseBadge';

interface AppHeaderProps {
  onToggleSidebar: () => void;
  pageTitle: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onToggleSidebar, pageTitle }) => {
  const { resetAllDemoData, demands, productionPlans } = useApp();
  const [currentDateTime, setCurrentDateTime] = useState<string>('');
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = new Intl.DateTimeFormat('tr-TR', {
        timeZone: 'Europe/Istanbul',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(now);
      setCurrentDateTime(`${formatted} (Europe/Istanbul)`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleReset = () => {
    if (confirm('Tüm demo düzenlemeleri sıfırlanıp kaynak JSON verilerine dönülecek. Onaylıyor musunuz?')) {
      resetAllDemoData();
      alert('Demo verileri sıfırlandı.');
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-2.5 bg-slate-950/90 border-b border-slate-800 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label="Menüyü Aç/Kapat"
          className="lg:hidden p-1.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
        >
          ☰
        </button>
        <div>
          <h1 className="text-sm sm:text-base font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
            <span>{pageTitle}</span>
            <EnterpriseBadge variant="purple" size="xs">
              Faz 0–1 Demo Modu
            </EnterpriseBadge>
          </h1>
          <p className="text-[11px] text-slate-500 font-mono hidden sm:block">
            Lider Teneke Kutu Üretim ve Baskı Planlama Workbench
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Real-time Turkey timestamp */}
        <div className="hidden md:flex flex-col items-end text-[11px] font-mono text-slate-400">
          <span className="text-slate-300 font-semibold">{currentDateTime}</span>
          <span className="text-[10px] text-slate-500">Kapasite: Hazır Parametre | 1.250 Min Levha</span>
        </div>

        {/* Demo reset button */}
        <button
          onClick={handleReset}
          className="px-2.5 py-1 text-xs font-mono font-medium rounded border border-rose-900/60 bg-rose-950/30 text-rose-300 hover:bg-rose-900/50 hover:border-rose-700 transition-colors"
          title="Tüm düzenlemeleri siler ve kaynak dosyalardaki ilk haline döndürür."
        >
          ↺ Demo Sıfırla
        </button>
      </div>
    </header>
  );
};
