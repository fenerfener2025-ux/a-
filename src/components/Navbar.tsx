import React from 'react';
import { Search, ShieldAlert, RefreshCw, Layers, Download, LogOut } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { exportFullSystemToExcel } from '../utils/excelExport';
import { AppLogo } from './AppLogo';

interface NavbarProps {
  onOpenSearch: () => void;
  activeView: string;
  setActiveView: (view: string) => void;
  onRefreshData: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSearch,
  activeView,
  setActiveView,
  onRefreshData,
  onLogout
}) => {
  const seriesList = StorageService.getSeries();
  const expWarnings = seriesList.filter(s => s.status === 'SKT Yaklaşan' || s.status === 'Kritik Stok').length;
  const totalStock = seriesList.reduce((acc, s) => acc + s.currentDoseQuantity, 0);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md text-slate-800 shadow-2xs border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Left Branding */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveView('dashboard')}>
          <AppLogo size="md" showSubtitle={true} lightBackground={true} />
        </div>

        {/* Middle Global Search Button */}
        <div className="flex-1 max-w-md hidden md:block">
          <button
            onClick={onOpenSearch}
            className="w-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-600 rounded-full px-4 py-2 text-xs flex items-center justify-between gap-3 transition-all duration-150 group cursor-pointer"
          >
            <span className="flex items-center gap-2 text-slate-600 group-hover:text-slate-900">
              <Search className="w-4 h-4 text-indigo-600" />
              <span>Aşı, Seri No, İl veya Kurum Ara...</span>
            </span>
            <kbd className="bg-white text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-mono border border-slate-200 shadow-2xs">
              Ctrl + K
            </kbd>
          </button>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Mobile Search Button */}
          <button
            onClick={onOpenSearch}
            className="md:hidden p-2 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
            title="Global Arama"
          >
            <Search className="w-5 h-5 text-indigo-600" />
          </button>

          {/* Total Stock Indicator Pill */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-100 border border-slate-200 text-slate-700 px-3.5 py-1.5 rounded-full text-xs font-medium">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Merkez Stok:</span>
            <strong className="text-slate-900 font-bold">{totalStock.toLocaleString('tr-TR')} Doz</strong>
          </div>

          {/* Expiry / Critical Warning Pill */}
          {expWarnings > 0 && (
            <button
              onClick={() => setActiveView('dashboard')}
              className="flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 px-3.5 py-1.5 rounded-full text-xs font-semibold hover:bg-amber-100 transition-colors animate-pulse cursor-pointer"
              title={`${expWarnings} adet kritik stok / SKT uyarısı`}
            >
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span className="hidden sm:inline">{expWarnings} Uyarı</span>
            </button>
          )}

          {/* Excel Quick Export Button */}
          <button
            onClick={exportFullSystemToExcel}
            className="hidden sm:flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-full text-xs font-extrabold shadow-2xs transition-all cursor-pointer"
            title="Tüm Sistem Verilerini Excel (.xlsx) Olarak İndir"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel İndir</span>
          </button>

          {/* Refresh Data */}
          <button
            onClick={onRefreshData}
            className="p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
            title="Verileri Yenile"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Logout / Re-lock Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-800 transition-colors cursor-pointer border border-rose-100"
              title="Güvenli Oturumu Kapat / Kilitle"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}

        </div>
      </div>
    </header>
  );
};
