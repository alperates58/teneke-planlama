import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/lib/store';

export const metadata: Metadata = {
  title: 'Teneke Planlama — Lider Fabrika Workbench',
  description: 'Teneke Tüp Baskı ve Üretim Planlama Sistemi (Faz 0 ve Faz 1)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="light">
      <body className="bg-slate-50 text-slate-900 antialiased min-h-screen">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
