import React, { useState } from 'react';
import {
  Package,
  Truck,
  RotateCcw,
  ShieldAlert,
  Layers,
  MapPin,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  PlusCircle,
  FileText,
  Search,
  X,
  Download,
  Maximize2,
  Filter,
  ShieldCheck,
  Clock,
  Database,
  Settings,
  Server,
  ExternalLink,
  HardDrive,
  Info,
  Activity,
  ArrowRight,
  Syringe,
  FileSpreadsheet,
  Zap,
  ArrowUpRight,
  HelpCircle
} from 'lucide-react';
import { StorageService, convertKoyunToFlakon, convertKoyunToSigir, formatNumber } from '../services/storageService';
import { TURKEY_PROVINCES } from '../data/turkeyData';
import { SeriesLot, Vaccine } from '../types';

interface DashboardProps {
  onNavigate: (view: string) => void;
  onOpenSeriesDetail: (series: SeriesLot) => void;
  onOpenProvinceDetail: (provinceName: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigate,
  onOpenSeriesDetail,
  onOpenProvinceDetail
}) => {
  const vaccines = StorageService.getVaccines();
  const seriesList = StorageService.getSeries();
  const shipments = StorageService.getShipments();
  const returns = StorageService.getReturns();
  const destructions = StorageService.getDestructions();

  // Detail Modal States
  const [activeModal, setActiveModal] = useState<'stock' | 'shipments' | 'returns' | 'destructions' | 'vaccines' | null>(null);
  const [modalSearch, setModalSearch] = useState('');
  const [modalFilter, setModalFilter] = useState('all');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Key Metrics
  const totalProductionDoses = seriesList.reduce((acc, s) => acc + s.initialDoseQuantity, 0);
  const totalCurrentStockDoses = seriesList.reduce((acc, s) => acc + s.currentDoseQuantity, 0);
  const totalDistributedDoses = seriesList.reduce((acc, s) => acc + s.distributedDoseQuantity, 0);
  const totalReturnedDoses = returns.reduce((acc, r) => acc + r.doseQuantity, 0);
  const totalDestroyedDoses = destructions.reduce((acc, d) => acc + d.doseQuantity, 0);

  // Warnings
  const expWarnings = seriesList.filter(s => s.status === 'SKT Yaklaşan');
  const criticalStockList = seriesList.filter(s => s.currentDoseQuantity <= 10000 && s.currentDoseQuantity > 0);

  // Calculate Distribution Per Province
  const provinceMap: { [key: string]: { name: string; code: string; region: string; totalDose: number; returnedDose: number; shipmentsCount: number } } = {};
  
  TURKEY_PROVINCES.forEach(p => {
    provinceMap[p.name] = {
      name: p.name,
      code: p.code,
      region: p.region,
      totalDose: 0,
      returnedDose: 0,
      shipmentsCount: 0
    };
  });

  shipments.forEach(s => {
    if (provinceMap[s.provinceName]) {
      provinceMap[s.provinceName].totalDose += s.doseQuantity;
      provinceMap[s.provinceName].shipmentsCount += 1;
    }
  });

  returns.forEach(r => {
    if (provinceMap[r.provinceName]) {
      provinceMap[r.provinceName].returnedDose += r.doseQuantity;
    }
  });

  const activeProvinces = Object.values(provinceMap)
    .filter(p => p.totalDose > 0)
    .sort((a, b) => b.totalDose - a.totalDose);

  // Group Stock By Vaccine Type
  const stockByVaccine = vaccines.map(v => {
    const matchingSeries = seriesList.filter(s => s.vaccineId === v.id || s.vaccineName.toLowerCase().includes(v.name.toLowerCase()));
    const totalDose = matchingSeries.reduce((acc, s) => acc + s.currentDoseQuantity, 0);
    const seriesCount = matchingSeries.length;
    return {
      vaccine: v,
      totalDose,
      seriesCount,
      matchingSeries
    };
  });

  // Export Modal Data Handler
  const handleExportModalData = () => {
    if (activeModal === 'stock') {
      const data = seriesList.map(s => ({
        'Seri No': s.seriesNo,
        'Lot No': s.lotNo,
        'Aşı Adı': s.vaccineName,
        'Üretim Tarihi': s.productionDate,
        'SKT Tarihi': s.expiryDate,
        'Üretim Dozu': s.initialDoseQuantity,
        'Mevcut Stok (Doz)': s.currentDoseQuantity,
        'Flakon Karşılığı': convertKoyunToFlakon(s.currentDoseQuantity),
        'Sığır Doz Karşılığı': convertKoyunToSigir(s.currentDoseQuantity),
        'Durum': s.status
      }));
      StorageService.exportToExcel(data, 'Etlik_Merkez_Depo_Stok_Raporu');
    } else if (activeModal === 'shipments') {
      const data = shipments.map(s => ({
        'Sevkiyat No': s.shipmentNo,
        'Protokol No': s.protocolNo,
        'Tarih': s.date,
        'Hedef İl': s.provinceName,
        'Kurum Adı': s.institutionName,
        'Aşı & Seri': `${s.vaccineName} (${s.seriesNo})`,
        'Sevk Dozu': s.doseQuantity,
        'Kurye Notu': s.courierNotes,
        'Durum': s.status
      }));
      StorageService.exportToExcel(data, '81_Il_Sevkiyat_Raporu');
    } else if (activeModal === 'returns') {
      const data = returns.map(r => ({
        'Tarih': r.date,
        'İl Adı': r.provinceName,
        'Kurum Adı': r.institutionName,
        'Aşı & Seri': `${r.vaccineName} (${r.seriesNo})`,
        'İade Dozu': r.doseQuantity,
        'Sebep': r.returnReason,
        'Karantina Durumu': r.returnStatus
      }));
      StorageService.exportToExcel(data, 'Il_Aasi_Iadeleri_Raporu');
    } else if (activeModal === 'destructions') {
      const data = destructions.map(d => ({
        'Tarih': d.date,
        'Tutanak No': d.protocolNo,
        'Aşı & Seri': `${d.vaccineName} (${d.seriesNo})`,
        'İmha Dozu': d.doseQuantity,
        'İmha Sebebi': d.reason,
        'Onaylayan': d.approvedByName || 'Komisyon Onaylı'
      }));
      StorageService.exportToExcel(data, 'Resmi_Imha_Tutanaklari_Raporu');
    } else if (activeModal === 'vaccines') {
      const data = vaccines.map(v => ({
        'Aşı Adı': v.name,
        'Aşı Tipi': v.type,
        'Üretici': v.producer,
        'Doz Birimi': v.unit,
        'Kullanım Amacı': v.purpose,
        'Durum': v.active ? 'Aktif' : 'Pasif'
      }));
      StorageService.exportToExcel(data, 'Asi_Turleri_Tanim_Listesi');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* 1. TOP HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-indigo-900/50 relative overflow-hidden flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 p-16 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 font-extrabold text-[11px] rounded-full border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              CANLI SİSTEM
            </span>
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-200 font-bold text-[11px] rounded-full border border-indigo-400/30">
              {seriesList.length} Aktif Üretim Serisi
            </span>
            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 font-bold text-[11px] rounded-full border border-amber-400/30">
              {activeProvinces.length} Aktif İl Sevkiyat Noktası
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-snug">
            Etlik Veteriner Kontrol Merkez Araştırma Enstitüsü
          </h1>
          <p className="text-xs sm:text-sm text-indigo-200/80 leading-relaxed">
            T.C. Tarım ve Orman Bakanlığı Ulusal Hayvan Sağlığı Aşı Üretim, Merkez Depo Stok ve 81 İl Dağıtım Portalı.
          </p>
        </div>

        {/* Header Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0">
          <button
            onClick={() => onNavigate('inventory')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-indigo-200" />
            <span>+ Yeni Üretim Kaydı</span>
          </button>

          <button
            onClick={() => onNavigate('distribution')}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Truck className="w-4 h-4 text-blue-200" />
            <span>🚚 Yeni İl Sevkiyatı</span>
          </button>

          <button
            onClick={() => onNavigate('returns')}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-amber-200" />
            <span>🔄 İade / İmha Girişi</span>
          </button>

          <button
            onClick={() => onNavigate('settings')}
            className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Ayarlar & Veri Düzeltme"
          >
            <Settings className="w-4 h-4 text-amber-300" />
            <span>Ayarlar</span>
          </button>
        </div>
      </div>

      {/* 2. CORE METRIC INFO CARDS (NO CHARTS - HIGH QUALITY CARDS WITH DETAILED MODALS & INLINE ACTIONS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* INFO CARD 1: Merkez Stok */}
        <div
          onClick={() => { setActiveModal('stock'); setModalSearch(''); setModalFilter('all'); }}
          className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-xl hover:border-indigo-400 transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between gap-4"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">
                Etlik Merkez Stok
              </span>
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0 shadow-2xs">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
                {formatNumber(totalCurrentStockDoses)} <span className="text-xs font-bold text-slate-500 font-sans">Doz</span>
              </div>
              <p className="text-xs text-indigo-700 font-semibold flex items-center gap-1">
                <Syringe className="w-3.5 h-3.5 text-indigo-500" />
                ~ {formatNumber(convertKoyunToFlakon(totalCurrentStockDoses))} Flakon ({formatNumber(convertKoyunToSigir(totalCurrentStockDoses))} Sığır Dozu)
              </p>
            </div>

            <p className="text-[11px] text-slate-500 leading-normal pt-1 border-t border-slate-100">
              Toplam {seriesList.length} üretim serisi aktif depoda muhafaza ediliyor.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600 group-hover:text-indigo-700">
            <span className="flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5" />
              Ayrıntıları & Aksiyonları Aç
            </span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* INFO CARD 2: 81 İle Yapılan Dağıtım */}
        <div
          onClick={() => { setActiveModal('shipments'); setModalSearch(''); setModalFilter('all'); }}
          className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-xl hover:border-blue-400 transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between gap-4"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider group-hover:text-blue-600 transition-colors">
                81 İle Dağıtılan Doz
              </span>
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0 shadow-2xs">
                <Truck className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
                {formatNumber(totalDistributedDoses)} <span className="text-xs font-bold text-slate-500 font-sans">Doz</span>
              </div>
              <p className="text-xs text-blue-700 font-semibold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-500" />
                {activeProvinces.length} İl Tarım Müdürlüğüne Sevk Edildi
              </p>
            </div>

            <p className="text-[11px] text-slate-500 leading-normal pt-1 border-t border-slate-100">
              Toplam {shipments.length} resmi sevk irsaliyesi ile illere ulaştırıldı.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-700">
            <span className="flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5" />
              Sevkiyat Listesi & Aksiyon
            </span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* INFO CARD 3: İl İadeleri */}
        <div
          onClick={() => { setActiveModal('returns'); setModalSearch(''); setModalFilter('all'); }}
          className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-xl hover:border-amber-400 transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between gap-4"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider group-hover:text-amber-600 transition-colors">
                İl Aşı İadeleri
              </span>
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors shrink-0 shadow-2xs">
                <RotateCcw className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
                {formatNumber(totalReturnedDoses)} <span className="text-xs font-bold text-slate-500 font-sans">Doz</span>
              </div>
              <p className="text-xs text-amber-700 font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                {returns.length} Adet Resmi İade Kaydı
              </p>
            </div>

            <p className="text-[11px] text-slate-500 leading-normal pt-1 border-t border-slate-100">
              Soğuk zincir veya fazla stok gerekçesiyle karantinaya alınan aşılar.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-600 group-hover:text-amber-700">
            <span className="flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5" />
              İade Detayları & İncele
            </span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* INFO CARD 4: İmha & Iskarta */}
        <div
          onClick={() => { setActiveModal('destructions'); setModalSearch(''); setModalFilter('all'); }}
          className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-xl hover:border-rose-400 transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between gap-4"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider group-hover:text-rose-600 transition-colors">
                Resmi İmhalar
              </span>
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors shrink-0 shadow-2xs">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
                {formatNumber(totalDestroyedDoses)} <span className="text-xs font-bold text-slate-500 font-sans">Doz</span>
              </div>
              <p className="text-xs text-rose-700 font-semibold flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-rose-500" />
                {destructions.length} Komisyon Onaylı İmha Tutanağı
              </p>
            </div>

            <p className="text-[11px] text-slate-500 leading-normal pt-1 border-t border-slate-100">
              SKT dolumu veya fiziksel hasar nedeniyle imha edilen dozlar.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-rose-600 group-hover:text-rose-700">
            <span className="flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5" />
              İmha Tutanaklarını Gör
            </span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

      </div>

      {/* 3. OPERATIONAL DECISION & ALERT CARDS (ACİL EYLEM & UYARI KARTLARI) */}
      {(expWarnings.length > 0 || criticalStockList.length > 0) && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-rose-500/10 border border-amber-300/80 rounded-3xl p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500 text-white rounded-xl shadow-2xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Operasyonel Karar ve Öncelikli Aksiyon Kartları</h3>
                <p className="text-xs text-slate-600">Sistem tarafından otomatik tespit edilen kritik stok ve SKT uyarıları</p>
              </div>
            </div>

            <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
              {expWarnings.length + criticalStockList.length} Dikkat Gerektiren Seri
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* EXPIRY WARNING CARDS WITH INLINE ACTION BUTTON */}
            {expWarnings.map(s => (
              <div
                key={s.id}
                className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs hover:border-amber-400 flex flex-col justify-between gap-3 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                      ⚠️ SKT YAKLAŞIYOR ({s.expiryDate})
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-600">{s.seriesNo}</span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 pt-1">{s.vaccineName}</h4>
                  <p className="text-xs text-slate-600">
                    Mevcut Depo Stoğu: <strong className="text-indigo-700 font-mono">{formatNumber(s.currentDoseQuantity)} Doz</strong>. SKT dolmadan önce 81 il müdürlüğüne dağıtılması gerekmektedir.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => onOpenSeriesDetail(s)}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Seri Dosyası</span>
                  </button>

                  <button
                    onClick={() => onNavigate('distribution')}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>İllere Öncelikli Sevk Et</span>
                  </button>
                </div>
              </div>
            ))}

            {/* CRITICAL STOCK CARDS WITH INLINE ACTION BUTTON */}
            {criticalStockList.map(s => (
              <div
                key={s.id}
                className="bg-white p-4 rounded-2xl border border-rose-200 shadow-2xs hover:border-rose-400 flex flex-col justify-between gap-3 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-300">
                      🚨 KRİTİK DÜŞÜK STOK
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-600">{s.seriesNo}</span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 pt-1">{s.vaccineName}</h4>
                  <p className="text-xs text-slate-600">
                    Kalan Stok: <strong className="text-rose-600 font-mono font-bold">{formatNumber(s.currentDoseQuantity)} Doz</strong>. Minimum güvenli eşik değerinin altındadır.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => onOpenSeriesDetail(s)}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Seri Detayı</span>
                  </button>

                  <button
                    onClick={() => onNavigate('inventory')}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Yeni Üretim Lotu Başlat</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. MAIN CONTENT GRID: OFFICIAL FORM HEADERS INFO CARDS + VACCINE TYPES & SYSTEM STATUS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN (2 COLS): RESMİ FORM BAŞLIKLARI BİLGİ KARTLARI (VBÜDL & ÜRETİM CETVELİ VERİ KARTLARI) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* RESMİ FORM BAŞLIKLARI BİLGİ KARTLARI PANELİ */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-5 space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-700 rounded-2xl border border-indigo-100 shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900">Üretim ve Dağıtım Özet Kartları</h3>
                    <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 font-extrabold text-[10px] rounded-full uppercase border border-indigo-200">
                      VBÜDL & Üretim Cetveli
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Aşı üretim, devir, sevk ve stok verileri anlık olarak hesaplanır. Detay için karta tıklayın.
                  </p>
                </div>
              </div>

              <button
                onClick={() => onNavigate('word_forms')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Resmi Word Formlarını Aç</span>
              </button>
            </div>

            {/* Grid of Official Form Title Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* CARD 1: Üretim Miktarı */}
              <div
                onClick={() => { setActiveModal('stock'); setModalSearch(''); }}
                className="bg-gradient-to-br from-indigo-50/60 via-white to-slate-50 p-4.5 rounded-2xl border border-indigo-200/80 hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer group space-y-3 relative overflow-hidden flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full border border-indigo-200">
                      ÜRETİM MİKTARI
                    </span>
                    <Syringe className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                  </div>

                  <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-700 transition-colors">
                    Üretim Miktarı (Doz & Şişe/Ampul)
                  </h4>

                  <div className="grid grid-cols-2 gap-2 bg-white/80 p-2.5 rounded-xl border border-indigo-100/80 font-mono">
                    <div>
                      <span className="text-[10px] font-sans font-bold text-slate-500 uppercase block">Doz Miktarı</span>
                      <span className="text-sm font-black text-slate-900">{formatNumber(totalProductionDoses)} Doz</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-sans font-bold text-slate-500 uppercase block">Şişe / Ampul</span>
                      <span className="text-sm font-black text-indigo-700">{formatNumber(convertKoyunToFlakon(totalProductionDoses))} Flakon</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-snug">
                    Aktif üretim dönemi içinde imal edilen 5 seri (2025/3 - 2025/7) Anthrax aşılarının toplam üretimi.
                  </p>
                </div>

                <div className="pt-2 border-t border-indigo-100 flex items-center justify-between text-xs font-bold text-indigo-600 group-hover:underline">
                  <span>Aşı Seri Detaylarını Gör</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* CARD 2: Bir Önceki Aydan Devir Miktarı */}
              <div
                onClick={() => { setActiveModal('stock'); setModalSearch(''); }}
                className="bg-gradient-to-br from-emerald-50/60 via-white to-slate-50 p-4.5 rounded-2xl border border-emerald-200/80 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group space-y-3 relative overflow-hidden flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      GEÇEN AYDAN DEVİR
                    </span>
                    <RotateCcw className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                  </div>

                  <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Bir Önceki Aydan Devir Eden Miktar
                  </h4>

                  <div className="grid grid-cols-2 gap-2 bg-white/80 p-2.5 rounded-xl border border-emerald-100/80 font-mono">
                    <div>
                      <span className="text-[10px] font-sans font-bold text-slate-500 uppercase block">Doz Miktarı</span>
                      <span className="text-sm font-black text-slate-900">1.907.700 Doz</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-sans font-bold text-slate-500 uppercase block">Şişe / Ampul</span>
                      <span className="text-sm font-black text-emerald-700">19.077 Flakon</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-snug">
                    Aralık/Ocak dönem sonundan devrederek cari ay stok portföyüne aktarılan başlangıç miktarı.
                  </p>
                </div>

                <div className="pt-2 border-t border-emerald-100 flex items-center justify-between text-xs font-bold text-emerald-600 group-hover:underline">
                  <span>Devir Kütük Detayı</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* CARD 3: Önceki Aylarda Dağıtılan Toplam Miktar */}
              <div
                onClick={() => { setActiveModal('shipments'); setModalSearch(''); }}
                className="bg-gradient-to-br from-amber-50/60 via-white to-slate-50 p-4.5 rounded-2xl border border-amber-200/80 hover:border-amber-500 hover:shadow-md transition-all cursor-pointer group space-y-3 relative overflow-hidden flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                      ÖNCEKİ AYLAR DAĞITIM
                    </span>
                    <Clock className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
                  </div>

                  <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-amber-700 transition-colors">
                    Önceki Aylarda Dağıtılan Toplam Miktar
                  </h4>

                  <div className="grid grid-cols-2 gap-2 bg-white/80 p-2.5 rounded-xl border border-amber-100/80 font-mono">
                    <div>
                      <span className="text-[10px] font-sans font-bold text-slate-500 uppercase block">Doz Miktarı</span>
                      <span className="text-sm font-black text-slate-900">0 Doz</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-sans font-bold text-slate-500 uppercase block">Şişe / Ampul</span>
                      <span className="text-sm font-black text-amber-700">0 Flakon</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-snug">
                    Cari yıl dönemi içerisinde bu aydan önce illere sevk edilmiş geçmiş dönem toplam miktarı.
                  </p>
                </div>

                <div className="pt-2 border-t border-amber-100 flex items-center justify-between text-xs font-bold text-amber-700 group-hover:underline">
                  <span>Geçmiş Dönem Kayıtları</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* CARD 4: Bu Ay Sevk Edilen Toplam Miktar */}
              <div
                onClick={() => { setActiveModal('shipments'); setModalSearch(''); }}
                className="bg-gradient-to-br from-blue-50/60 via-white to-slate-50 p-4.5 rounded-2xl border border-blue-200/80 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group space-y-3 relative overflow-hidden flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full border border-blue-200">
                      BU AY SEVK EDİLEN
                    </span>
                    <Truck className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                  </div>

                  <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors">
                    Bu Ay Sevk Edilen Toplam Miktar
                  </h4>

                  <div className="grid grid-cols-2 gap-2 bg-white/80 p-2.5 rounded-xl border border-blue-100/80 font-mono">
                    <div>
                      <span className="text-[10px] font-sans font-bold text-slate-500 uppercase block">Doz Miktarı</span>
                      <span className="text-sm font-black text-slate-900">2.769.700 Doz</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-sans font-bold text-slate-500 uppercase block">Şişe / Ampul</span>
                      <span className="text-sm font-black text-blue-700">27.697 Flakon</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-snug">
                    Türkiye genelinde 54 farklı kuruma (50 İl Müdürlüğü + TİGEM/Numune) sevk edilen toplam miktar.
                  </p>
                </div>

                <div className="pt-2 border-t border-blue-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:underline">
                  <span>54 Sevkiyat Satırını İncele</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* CARD 5: Gelecek Aya Devir Miktarı */}
              <div
                onClick={() => { setActiveModal('stock'); setModalSearch(''); }}
                className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white p-4.5 rounded-2xl border border-indigo-700 shadow-sm hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group space-y-3 relative overflow-hidden flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                      GELECEK AYA DEVİR
                    </span>
                    <Layers className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  </div>

                  <h4 className="text-sm font-extrabold text-white group-hover:text-amber-300 transition-colors">
                    Gelecek Aya Devir Miktarı
                  </h4>

                  <div className="grid grid-cols-2 gap-2 bg-white/10 p-2.5 rounded-xl border border-white/15 font-mono">
                    <div>
                      <span className="text-[10px] font-sans font-bold text-slate-300 uppercase block">Kalan Doz</span>
                      <span className="text-sm font-black text-white">697.400 Doz</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-sans font-bold text-slate-300 uppercase block">Şişe / Ampul</span>
                      <span className="text-sm font-black text-amber-300">6.974 Flakon</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-indigo-200/80 leading-snug">
                    Formül: <code>(Devir + Üretim) - (Sevk + İmha)</code> neticesinde depoda kalan son emniyet stoğu.
                  </p>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-bold text-amber-300 group-hover:underline">
                  <span>Denge Hesabı & Depo Durumu</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* CARD 6: İmha / Zayiat Tutanağı Miktarı */}
              <div
                onClick={() => { setActiveModal('destructions'); setModalSearch(''); }}
                className="bg-gradient-to-br from-rose-50/60 via-white to-slate-50 p-4.5 rounded-2xl border border-rose-200/80 hover:border-rose-500 hover:shadow-md transition-all cursor-pointer group space-y-3 relative overflow-hidden flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-200">
                      İMHA / ZAYİAT TUTANAĞI
                    </span>
                    <ShieldAlert className="w-4 h-4 text-rose-600 group-hover:scale-110 transition-transform" />
                  </div>

                  <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-rose-700 transition-colors">
                    İmha Edilen Toplam Miktar
                  </h4>

                  <div className="grid grid-cols-2 gap-2 bg-white/80 p-2.5 rounded-xl border border-rose-100/80 font-mono">
                    <div>
                      <span className="text-[10px] font-sans font-bold text-slate-500 uppercase block">Doz Miktarı</span>
                      <span className="text-sm font-black text-slate-900">{formatNumber(totalDestroyedDoses)} Doz</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-sans font-bold text-slate-500 uppercase block">Şişe / Ampul</span>
                      <span className="text-sm font-black text-rose-700">{formatNumber(convertKoyunToFlakon(totalDestroyedDoses))} Flakon</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-snug">
                    SKT dolumu veya fiziksel hasar gerekçesiyle resmi komisyon tutanağı ile ıskartaya çıkartılan miktar.
                  </p>
                </div>

                <div className="pt-2 border-t border-rose-100 flex items-center justify-between text-xs font-bold text-rose-600 group-hover:underline">
                  <span>İmha Tutanaklarını İncele</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

            </div>
          </div>

          {/* VACCINE TYPES INVENTORY SUMMARY INFO CARDS */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                  <Syringe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Aşı Türlerine Göre Depo Stok Durum Kartları</h3>
                  <p className="text-xs text-slate-500">Üretilen tüm biyolojik ürün gruplarının anlık stok dağılımı</p>
                </div>
              </div>

              <button
                onClick={() => { setActiveModal('vaccines'); setModalSearch(''); }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Aşı Türleri Portalı</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Grid of Vaccine Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {stockByVaccine.map(item => (
                <div
                  key={item.vaccine.id}
                  onClick={() => { setActiveModal('stock'); setModalSearch(item.vaccine.name); }}
                  className="bg-slate-50/80 hover:bg-indigo-50/50 p-4 rounded-2xl border border-slate-200/80 hover:border-indigo-300 transition-all cursor-pointer group space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase bg-white text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200">
                      {item.vaccine.type}
                    </span>
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md">
                      {item.seriesCount} Seri / Lot
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-indigo-700 transition-colors">
                      {item.vaccine.name}
                    </h4>
                    <div className="text-lg font-black text-slate-900 font-mono mt-1">
                      {formatNumber(item.totalDose)} <span className="text-xs font-bold text-slate-500 font-sans">Doz</span>
                      <span className="text-xs text-slate-500 font-sans font-normal ml-2">
                        (~{formatNumber(convertKoyunToFlakon(item.totalDose))} Flakon)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200/60">
                    <span>{item.vaccine.producer}</span>
                    <span className="font-bold text-indigo-600 group-hover:underline flex items-center gap-1">
                      Serileri Listele <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN (1 COL): SYSTEM & DATABASE STORAGE INFO CARDS */}
        <div className="space-y-6">
          
          {/* DATABASE STORAGE LOCATION & LIVE SYNC CARD */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl border border-indigo-800/60 p-5 text-white shadow-lg space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-2xl border border-indigo-400/20 shrink-0">
                  <Database className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Verilerin Kaydedildiği Yer</h3>
                  <span className="text-[11px] text-indigo-200/80 font-medium">Bulut Veritabanı Mimarisi</span>
                </div>
              </div>
              
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                CANLI SENKRON
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Tüm aşı stokları, sevkiyatlar, iadeler ve imha tutanakları anlık olarak <strong>Google Cloud Firebase Firestore</strong> veritabanına ve yerel tarayıcı hafızasına güvenle işlenmektedir.
            </p>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Veritabanı Servisi:</span>
                <span className="font-bold text-amber-300 flex items-center gap-1">
                  <Server className="w-3.5 h-3.5" /> Firebase Firestore
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Proje ID:</span>
                <span className="font-mono text-[11px] text-indigo-200 truncate max-w-[160px]">
                  ai-studio-etlikveterinerae-1425553c
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Şifreleme Katmanı:</span>
                <span className="font-medium text-emerald-300 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 256-Bit SSL/TLS
                </span>
              </div>
            </div>

            <button
              onClick={() => onNavigate('settings')}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs group"
            >
              <Settings className="w-4 h-4 text-amber-300 group-hover:rotate-45 transition-transform" />
              <span>Ayarlar Portalı & Veri Düzeltme</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>

          {/* QUICK SUMMARY METRICS CARD */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-5 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Sistem Kapasite İstatistikleri</h3>
                <p className="text-xs text-slate-500">Etlik VKMAE genel üretim ve sevkiyat özet kütüğü</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-slate-600 font-semibold">Toplam Üretim Dozu:</span>
                <strong className="text-slate-900 font-mono text-sm">{formatNumber(totalProductionDoses)} Doz</strong>
              </div>

              <div className="flex items-center justify-between p-3 bg-indigo-50/80 rounded-xl border border-indigo-100">
                <span className="text-indigo-900 font-semibold">Aktif Depo Stoğu:</span>
                <strong className="text-indigo-700 font-mono text-sm">{formatNumber(totalCurrentStockDoses)} Doz</strong>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50/80 rounded-xl border border-blue-100">
                <span className="text-blue-900 font-semibold">Sevk Edilen Toplam Doz:</span>
                <strong className="text-blue-700 font-mono text-sm">{formatNumber(totalDistributedDoses)} Doz</strong>
              </div>

              <div className="flex items-center justify-between p-3 bg-rose-50/80 rounded-xl border border-rose-100">
                <span className="text-rose-900 font-semibold">Net Zayiat / İmha:</span>
                <strong className="text-rose-700 font-mono text-sm">{formatNumber(totalDestroyedDoses)} Doz</strong>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* 5. FULL-SCREEN DETAIL & EMBEDDED ACTION MODALS FOR INFO CARDS */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white flex items-center justify-between border-b border-indigo-900/50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-400/30">
                  {activeModal === 'stock' && <Layers className="w-6 h-6" />}
                  {activeModal === 'shipments' && <Truck className="w-6 h-6" />}
                  {activeModal === 'returns' && <RotateCcw className="w-6 h-6" />}
                  {activeModal === 'destructions' && <ShieldAlert className="w-6 h-6" />}
                  {activeModal === 'vaccines' && <Syringe className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {activeModal === 'stock' && 'Etlik Merkez Depo Aşı Stok Detay ve Aksiyon Portalı'}
                    {activeModal === 'shipments' && '81 İl Sevkiyat Detay ve Aksiyon Portalı'}
                    {activeModal === 'returns' && 'İl Aşı İadeleri Detay ve İnceleme Portalı'}
                    {activeModal === 'destructions' && 'Resmi İmha Tutanakları Portalı'}
                    {activeModal === 'vaccines' && 'Aşı Türleri ve Tanımları Portalı'}
                  </h3>
                  <p className="text-xs text-indigo-200/80">
                    Ayrıntılı veri analizi, filtreleme ve doğrudan modül aksiyon tetikleyicileri
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
              
              {/* Meaningful Detailed Explanation Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-xs uppercase tracking-wider">
                  <Info className="w-4 h-4 text-indigo-600" />
                  <span>AÇIKLAMA VE BİLGİLENDİRME</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {activeModal === 'stock' && `Etlik VKMAE soğuk hava ve ana depo alanlarında muhafaza edilen tüm aşı serilerinin anlık dozaj bilgisidir. Mevcut stok: ${formatNumber(totalCurrentStockDoses)} doz (~${formatNumber(convertKoyunToFlakon(totalCurrentStockDoses))} Flakon). Buradan yeni üretim lotu ekleyebilir veya doğrudan il sevkiyatı başlatabilirsiniz.`}
                  {activeModal === 'shipments' && `Türkiye geneli 81 il müdürlüğüne sevk edilen tüm aşı irsaliye kayıtlarıdır. Toplam sevk edilen miktar: ${formatNumber(totalDistributedDoses)} doz. İlgili sevkiyata tıklayarak il bazlı hareket detaylarına ulaşabilirsiniz.`}
                  {activeModal === 'returns' && `Saha uygulamaları veya lojistik süreçlerde il müdürlüklerinden merkez depoya iade edilen aşı tutanaklarıdır. Toplam iade: ${formatNumber(totalReturnedDoses)} doz.`}
                  {activeModal === 'destructions' && `SKT tarihi dolan veya soğuk zincir kırılması sebebiyle komisyon kararıyla imha edilen resmi ıskarta tutanaklarıdır. Toplam imha: ${formatNumber(totalDestroyedDoses)} doz.`}
                  {activeModal === 'vaccines' && `Etlik VKMAE tarafından üretimi gerçekleştirilen tüm biyolojik ve viral/bakteriyel aşı çeşitlerinin resmi tanım listesidir.`}
                </p>
              </div>

              {/* EMBEDDED ACTION AREA (AKSİYON ALANI) */}
              <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider">DOĞRUDAN AKSİYON ALANI</span>
                  <h4 className="text-xs font-bold text-white">İlgili modüle geçerek işlem başlatın veya Excel raporu alın:</h4>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {activeModal === 'stock' && (
                    <>
                      <button
                        onClick={() => { setActiveModal(null); onNavigate('inventory'); }}
                        className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Yeni Üretim Kaydı Ekle</span>
                      </button>
                      <button
                        onClick={() => { setActiveModal(null); onNavigate('distribution'); }}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <Truck className="w-4 h-4" />
                        <span>İllere Sevkiyat Yap</span>
                      </button>
                    </>
                  )}

                  {activeModal === 'shipments' && (
                    <button
                      onClick={() => { setActiveModal(null); onNavigate('distribution'); }}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <Truck className="w-4 h-4" />
                      <span>Yeni Sevkiyat Oluştur</span>
                    </button>
                  )}

                  {(activeModal === 'returns' || activeModal === 'destructions') && (
                    <button
                      onClick={() => { setActiveModal(null); onNavigate('returns'); }}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>İade / İmha Kaydı Aç</span>
                    </button>
                  )}

                  <button
                    onClick={handleExportModalData}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Excel Raporu İndir (.xlsx)</span>
                  </button>
                </div>
              </div>

              {/* Search Control */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Seri no, aşı adı, il veya tutanak no ara..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Table Renderings Based on Active Modal */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                
                {/* STOCK MODAL TABLE */}
                {activeModal === 'stock' && (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Seri / Lot No</th>
                        <th className="p-3">Aşı Adı</th>
                        <th className="p-3 text-right">Mevcut Stok (Doz)</th>
                        <th className="p-3 text-right">Flakon Adedi</th>
                        <th className="p-3 text-center">SKT</th>
                        <th className="p-3 text-center">Durum</th>
                        <th className="p-3 text-center">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {seriesList
                        .filter(s => !modalSearch || s.seriesNo.toLowerCase().includes(modalSearch.toLowerCase()) || s.vaccineName.toLowerCase().includes(modalSearch.toLowerCase()))
                        .map(s => (
                          <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-bold text-indigo-700 font-mono">{s.seriesNo} ({s.lotNo})</td>
                            <td className="p-3 font-bold text-slate-900">{s.vaccineName}</td>
                            <td className="p-3 text-right font-black text-slate-900 font-mono">{formatNumber(s.currentDoseQuantity)}</td>
                            <td className="p-3 text-right font-mono text-slate-600">{formatNumber(convertKoyunToFlakon(s.currentDoseQuantity))}</td>
                            <td className="p-3 text-center font-mono text-slate-500">{s.expiryDate}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                s.status === 'Aktif' ? 'bg-emerald-100 text-emerald-800' :
                                s.status === 'Kritik Stok' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {s.status}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => { setActiveModal(null); onOpenSeriesDetail(s); }}
                                className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold rounded-lg cursor-pointer"
                              >
                                Detay
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}

                {/* SHIPMENTS MODAL TABLE */}
                {activeModal === 'shipments' && (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Sevkiyat No</th>
                        <th className="p-3">Sevk Edilen İl</th>
                        <th className="p-3">Kurum Adı</th>
                        <th className="p-3">Aşı & Seri</th>
                        <th className="p-3 text-right">Sevk Dozu</th>
                        <th className="p-3 text-center">Tarih</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {shipments
                        .filter(sh => !modalSearch || sh.shipmentNo.toLowerCase().includes(modalSearch.toLowerCase()) || sh.provinceName.toLowerCase().includes(modalSearch.toLowerCase()) || sh.vaccineName.toLowerCase().includes(modalSearch.toLowerCase()))
                        .map(sh => (
                          <tr key={sh.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-bold text-blue-700 font-mono">{sh.shipmentNo}</td>
                            <td className="p-3 font-extrabold text-slate-900">{sh.provinceName}</td>
                            <td className="p-3 text-slate-600">{sh.institutionName}</td>
                            <td className="p-3 font-semibold text-slate-800">{sh.vaccineName} ({sh.seriesNo})</td>
                            <td className="p-3 text-right font-black text-slate-900 font-mono">{formatNumber(sh.doseQuantity)}</td>
                            <td className="p-3 text-center font-mono text-slate-500">{sh.date}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}

                {/* RETURNS MODAL TABLE */}
                {activeModal === 'returns' && (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">İade Kayıt No</th>
                        <th className="p-3">İl Adı</th>
                        <th className="p-3">Aşı & Seri</th>
                        <th className="p-3 text-right">İade Dozu</th>
                        <th className="p-3">İade Sebebi</th>
                        <th className="p-3 text-center">Tarih</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {returns
                        .filter(r => !modalSearch || r.returnNo.toLowerCase().includes(modalSearch.toLowerCase()) || r.provinceName.toLowerCase().includes(modalSearch.toLowerCase()) || r.vaccineName.toLowerCase().includes(modalSearch.toLowerCase()))
                        .map(r => (
                          <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-bold text-amber-700 font-mono">{r.returnNo}</td>
                            <td className="p-3 font-extrabold text-slate-900">{r.provinceName}</td>
                            <td className="p-3 font-semibold text-slate-800">{r.vaccineName} ({r.seriesNo})</td>
                            <td className="p-3 text-right font-black text-amber-700 font-mono">{formatNumber(r.doseQuantity)}</td>
                            <td className="p-3 text-slate-600">{r.returnReason}</td>
                            <td className="p-3 text-center font-mono text-slate-500">{r.date}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}

                {/* DESTRUCTIONS MODAL TABLE */}
                {activeModal === 'destructions' && (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Tutanak No</th>
                        <th className="p-3">Aşı & Seri</th>
                        <th className="p-3 text-right">İmha Dozu</th>
                        <th className="p-3">İmha Sebebi</th>
                        <th className="p-3">Onaylayan</th>
                        <th className="p-3 text-center">Tarih</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {destructions
                        .filter(d => !modalSearch || d.protocolNo.toLowerCase().includes(modalSearch.toLowerCase()) || d.vaccineName.toLowerCase().includes(modalSearch.toLowerCase()))
                        .map(d => (
                          <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-bold text-rose-700 font-mono">{d.protocolNo}</td>
                            <td className="p-3 font-bold text-slate-900">{d.vaccineName} ({d.seriesNo})</td>
                            <td className="p-3 text-right font-black text-rose-700 font-mono">{formatNumber(d.doseQuantity)}</td>
                            <td className="p-3 text-slate-600">{d.reason}</td>
                            <td className="p-3 text-slate-600">{d.approvedByName || 'Komisyon Onaylı'}</td>
                            <td className="p-3 text-center font-mono text-slate-500">{d.date}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}

                {/* VACCINES MODAL TABLE */}
                {activeModal === 'vaccines' && (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Aşı Adı</th>
                        <th className="p-3">Aşı Tipi</th>
                        <th className="p-3">Üretici Enstitü</th>
                        <th className="p-3">Kullanım Amacı</th>
                        <th className="p-3 text-center">Durum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {vaccines
                        .filter(v => !modalSearch || v.name.toLowerCase().includes(modalSearch.toLowerCase()))
                        .map(v => (
                          <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-bold text-slate-900">{v.name}</td>
                            <td className="p-3 font-bold text-indigo-700">{v.type}</td>
                            <td className="p-3 text-slate-600">{v.producer}</td>
                            <td className="p-3 text-slate-600">{v.purpose}</td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                                {v.active ? 'Aktif Üretimde' : 'Pasif'}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}

              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-6 py-2.5 rounded-xl cursor-pointer"
              >
                Kapat
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
