import React from 'react';
import {
  LayoutDashboard,
  Package,
  Truck,
  RotateCcw,
  FileSpreadsheet,
  Upload,
  Building2,
  AlertTriangle,
  ChevronRight,
  Database,
  History
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  isOpen,
  setIsOpen
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Ana Panel',
      icon: LayoutDashboard,
      description: 'Genel Durum & Akıllı Karar Kartları'
    },
    {
      id: 'inventory',
      label: 'Aşı & Seri Envanteri',
      icon: Package,
      description: 'Üretim, Seriler, Lot & Teknik Değerler'
    },
    {
      id: 'distribution',
      label: 'İl Dağıtımı & Kurumlar',
      icon: Truck,
      description: '81 İl Sevk Portalı & Kurum Dosyaları'
    },
    {
      id: 'returns',
      label: 'İade & İmha Yönetimi',
      icon: RotateCcw,
      description: 'İl İadeleri, Iskarta & Protokoller'
    },
    {
      id: 'reports',
      label: 'Raporlar & Protokol',
      icon: FileSpreadsheet,
      description: 'Resmi Belgeler, Excel & Yazdır'
    },
    {
      id: 'import',
      label: 'Akıllı Veri Aktarımı',
      icon: Upload,
      description: 'Excel/CSV İçerik İçe Aktarma Engine'
    },
    {
      id: 'history',
      label: 'İşlem Geçmişi',
      icon: History,
      description: 'Geçmiş İşlem Logları & Denetim İzi'
    }
  ];

  return (
    <aside className="w-64 bg-white text-slate-700 border-r border-slate-200 flex flex-col justify-between shrink-0 shadow-2xs min-h-[calc(100vh-4rem)]">
      {/* Top Menu Items */}
      <div className="p-3 space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
          Sistem Modülleri
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-150 text-left cursor-pointer ${
                isActive
                  ? 'bg-indigo-50 text-indigo-900 font-semibold border border-indigo-100/80 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <div>
                  <div className={`text-xs font-semibold leading-tight ${isActive ? 'text-indigo-950 font-bold' : 'text-slate-800'}`}>
                    {item.label}
                  </div>
                  <div className={`text-[10px] leading-tight mt-0.5 ${isActive ? 'text-indigo-600 font-medium' : 'text-slate-400'}`}>
                    {item.description}
                  </div>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 shrink-0 opacity-80 ${isActive ? 'text-indigo-600' : 'text-slate-300'}`} />
            </button>
          );
        })}
      </div>

      {/* Bottom Info & Fixed Location Badge */}
      <div className="p-4 m-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium text-[11px]">Sabit Üretim Yeri:</span>
          <span className="bg-indigo-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
            ETLİK
          </span>
        </div>
        <div className="text-slate-800 font-bold text-xs pt-1 border-t border-slate-200">
          Etlik Veteriner Kontrol Merkez Araştırma Enstitüsü
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Tüm aşı stokları doğrudan Etlik merkez depodan 81 il müdürlüğüne sevk edilir.
        </p>
      </div>
    </aside>
  );
};
