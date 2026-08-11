import React, { useState } from 'react';
import {
  Package,
  Truck,
  RotateCcw,
  ShieldAlert,
  Layers,
  ArrowUpRight,
  TrendingUp,
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
  Clock
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { StorageService, convertKoyunToFlakon, convertKoyunToSigir } from '../services/storageService';
import { TURKEY_PROVINCES } from '../data/turkeyData';
import { Province, SeriesLot } from '../types';

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

  // Full-Screen Detail Modal States
  const [fullScreenModal, setFullScreenModal] = useState<'vaccines' | 'stock' | 'shipments' | 'returns' | null>(null);
  const [modalSearch, setModalSearch] = useState('');
  const [modalFilter, setModalFilter] = useState('Tümü');
  const [returnSubTab, setReturnSubTab] = useState<'returns' | 'destructions'>('returns');

  // Metrics
  const totalProductionDoses = seriesList.reduce((acc, s) => acc + s.initialDoseQuantity, 0);
  const totalCurrentStockDoses = seriesList.reduce((acc, s) => acc + s.currentDoseQuantity, 0);
  const totalDistributedDoses = seriesList.reduce((acc, s) => acc + s.distributedDoseQuantity, 0);
  const totalReturnedDoses = returns.reduce((acc, r) => acc + r.doseQuantity, 0);
  const totalDestroyedDoses = destructions.reduce((acc, d) => acc + d.doseQuantity, 0);

  // Expiry & Critical Warning Items
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

  // Calculate Monthly Trend from Real Shipments
  const monthlyMap: { [key: string]: number } = {};
  shipments.forEach(s => {
    if (s.date) {
      const dateObj = new Date(s.date);
      const monthName = dateObj.toLocaleDateString('tr-TR', { month: 'short' });
      monthlyMap[monthName] = (monthlyMap[monthName] || 0) + s.doseQuantity;
    }
  });

  const monthlyData = Object.keys(monthlyMap).length > 0
    ? Object.entries(monthlyMap).map(([month, Doses]) => ({ month, Doses }))
    : [
        { month: 'Ocak', Doses: 0 },
        { month: 'Şubat', Doses: 0 },
        { month: 'Mart', Doses: 0 },
      ];

  const stockPieData = seriesList.map(s => ({
    name: s.seriesNo,
    value: s.currentDoseQuantity
  })).filter(d => d.value > 0);

  const COLORS = ['#4f46e5', '#0284c7', '#059669', '#d97706', '#7c3aed', '#db2777'];

  // Excel Export Handler for Modals
  const handleExportModalData = () => {
    if (fullScreenModal === 'vaccines') {
      const data = vaccines.map(v => ({
        'Aşı Adı': v.name,
        'Aşı Tipi': v.type,
        'Üretici Enstitü': v.producer,
        'Doz Birimi': v.unit,
        'Kullanım Amacı': v.purpose,
        'Aktif Durum': v.active ? 'Aktif' : 'Pasif'
      }));
      StorageService.exportToExcel(data, 'Asi_Turleri_Envanter_Raporu');
    } else if (fullScreenModal === 'stock') {
      const data = seriesList.map(s => ({
        'Seri No': s.seriesNo,
        'Lot No': s.lotNo,
        'Aşı Adı': s.vaccineName,
        'Üretim Tarihi': s.productionDate,
        'SKT Tarihi': s.expiryDate,
        'Başlangıç Dozu': s.initialDoseQuantity,
        'Mevcut Stok (Doz)': s.currentDoseQuantity,
        'Flakon Adedi': convertKoyunToFlakon(s.currentDoseQuantity),
        'Sığır Doz Karşılığı': convertKoyunToSigir(s.currentDoseQuantity),
        'Stok Durumu': s.status
      }));
      StorageService.exportToExcel(data, 'Merkez_Depo_Stok_Raporu');
    } else if (fullScreenModal === 'shipments') {
      const data = shipments.map(s => ({
        'İrsaliye No': s.shipmentNo,
        'Protokol No': s.protocolNo,
        'Tarih': s.date,
        'Hedef İl': s.provinceName,
        'Hedef Kurum': s.institutionName,
        'Aşı & Seri': `${s.vaccineName} (${s.seriesNo})`,
        'Sevk Dozu': s.doseQuantity,
        'Kurye / Sevk Notu': s.courierNotes,
        'Teslim Durumu': s.status
      }));
      StorageService.exportToExcel(data, 'Il_Sevkiyat_Raporu');
    } else if (fullScreenModal === 'returns') {
      if (returnSubTab === 'returns') {
        const data = returns.map(r => ({
          'Tarih': r.date,
          'İl Adı': r.provinceName,
          'Kurum Adı': r.institutionName,
          'Aşı & Seri': `${r.vaccineName} (${r.seriesNo})`,
          'İade Miktarı (Doz)': r.doseQuantity,
          'İade Sebebi': r.reason,
          'Karantina Durumu': r.status
        }));
        StorageService.exportToExcel(data, 'Il_Aasi_Iadeleri_Raporu');
      } else {
        const data = destructions.map(d => ({
          'İmha Tarihi': d.date,
          'Tutanak No': d.protocolNo,
          'Aşı & Seri': `${d.vaccineName} (${d.seriesNo})`,
          'İmha Edilen Doz': d.doseQuantity,
          'İmha Yöntemi': d.method,
          'Komisyon Yetkilisi': d.authorizedBy
        }));
        StorageService.exportToExcel(data, 'Resmi_Imha_Tutanaklari_Raporu');
      }
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-indigo-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
            Canlı Aşı Envanter & Dağıtım Takip Paneli
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            Etlik Veteriner Kontrol Merkez Araştırma Enstitüsü
          </h2>
          <p className="text-indigo-100/80 text-sm mt-1 max-w-2xl">
            T.C. Tarım ve Orman Bakanlığı Ulusal Hayvan Sağlığı Aşı Üretim ve 81 İl Dağıtım Portalı.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('distribution')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-full shadow transition-all flex items-center gap-2 cursor-pointer"
          >
            <Truck className="w-4 h-4" />
            Yeni İl Sevkiyatı
          </button>
          <button
            onClick={() => onNavigate('inventory')}
            className="bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-4 py-2.5 rounded-full border border-white/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Yeni Üretim Kaydı
          </button>
        </div>
      </div>

      {/* KPI Cards Grid - Clickable Full Screen Triggers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Merkez Stok Card */}
        <div
          onClick={() => { setFullScreenModal('stock'); setModalSearch(''); setModalFilter('Tümü'); }}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-xl hover:border-indigo-300 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-indigo-600">Etlik Merkez Stok</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {totalCurrentStockDoses.toLocaleString('tr-TR')} <span className="text-xs font-semibold text-slate-500">Doz</span>
          </div>
          <p className="text-xs text-indigo-600 font-medium mt-1">
            ~ {convertKoyunToFlakon(totalCurrentStockDoses).toLocaleString('tr-TR')} Flakon ({convertKoyunToSigir(totalCurrentStockDoses).toLocaleString('tr-TR')} Sığır Dozu)
          </p>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-indigo-600 font-bold">
            <span className="flex items-center gap-1"><Maximize2 className="w-3 h-3" /> Tam Ekran Ayrıntılar</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Toplam Dağıtılan Doz Card */}
        <div
          onClick={() => { setFullScreenModal('shipments'); setModalSearch(''); }}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-blue-600">81 İle Dağıtılan</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {totalDistributedDoses.toLocaleString('tr-TR')} <span className="text-xs font-semibold text-slate-500">Doz</span>
          </div>
          <p className="text-xs text-blue-600 font-medium mt-1">
            {activeProvinces.length} İl Müdürlüğüne Sevk Edildi
          </p>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-blue-600 font-bold">
            <span className="flex items-center gap-1"><Maximize2 className="w-3 h-3" /> Tam Ekran Sevkiyatlar</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* İade Alınan Doz Card */}
        <div
          onClick={() => { setFullScreenModal('returns'); setReturnSubTab('returns'); setModalSearch(''); }}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-xl hover:border-amber-300 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-amber-600">İl İadeleri</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <RotateCcw className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {totalReturnedDoses.toLocaleString('tr-TR')} <span className="text-xs font-semibold text-slate-500">Doz</span>
          </div>
          <p className="text-xs text-amber-600 font-medium mt-1">
            {returns.length} Adet İade Kaydı
          </p>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-amber-600 font-bold">
            <span className="flex items-center gap-1"><Maximize2 className="w-3 h-3" /> Tam Ekran İadeler</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* İmha Edilen Doz Card */}
        <div
          onClick={() => { setFullScreenModal('returns'); setReturnSubTab('destructions'); setModalSearch(''); }}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-xl hover:border-rose-300 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-rose-600">İmha & Iskarta</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {totalDestroyedDoses.toLocaleString('tr-TR')} <span className="text-xs font-semibold text-slate-500">Doz</span>
          </div>
          <p className="text-xs text-rose-600 font-medium mt-1">
            {destructions.length} Resmi İmha Protokolü
          </p>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-rose-600 font-bold">
            <span className="flex items-center gap-1"><Maximize2 className="w-3 h-3" /> Tam Ekran İmha Tutanakları</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

      </div>

      {/* Decision & Attention Cards Section */}
      {(expWarnings.length > 0 || criticalStockList.length > 0) && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>AKILLI KARAR & UYARI KARTLARI</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* SKT Warnings */}
            {expWarnings.map(s => (
              <div
                key={s.id}
                onClick={() => onOpenSeriesDetail(s)}
                className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-xs hover:border-amber-400 cursor-pointer flex items-center justify-between gap-3 group transition-all"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      SKT YAKLAŞIYOR
                    </span>
                    <span className="text-xs text-slate-500">Son Tarih: {s.expiryDate}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 mt-1 group-hover:text-amber-800">
                    {s.seriesNo} ({s.vaccineName})
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mevcut Stok: <strong>{s.currentDoseQuantity.toLocaleString('tr-TR')} Doz</strong>. İllere öncelikli dağıtım önerilir.
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition-transform shrink-0" />
              </div>
            ))}

            {/* Critical Stock List */}
            {criticalStockList.map(s => (
              <div
                key={s.id}
                onClick={() => onOpenSeriesDetail(s)}
                className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-xs hover:border-rose-400 cursor-pointer flex items-center justify-between gap-3 group transition-all"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                      KRİTİK DÜŞÜK STOK
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 mt-1 group-hover:text-rose-800">
                    {s.seriesNo} ({s.vaccineName})
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kalan Stok: <strong className="text-rose-600">{s.currentDoseQuantity.toLocaleString('tr-TR')} Doz</strong>. Yeni üretim lotu planlanmalı.
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-rose-400 group-hover:translate-x-1 transition-transform shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Interactive Province Table + Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: İller Dağıtım Tablosu (2 cols wide) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600" />
                İl Dağıtım Detayları ({activeProvinces.length} Aktif İl)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Satıra tıklayarak ilgili ilin tüm aşı, seri ve kurum detay dosyasına gidin.
              </p>
            </div>
            <button
              onClick={() => onNavigate('distribution')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
            >
              Tüm İller Portalına Git
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">İl Kodu & Adı</th>
                  <th className="p-3">Coğrafi Bölge</th>
                  <th className="p-3 text-right">Dağıtılan Doz</th>
                  <th className="p-3 text-right">İade Doz</th>
                  <th className="p-3 text-right">Net Sevk Dozu</th>
                  <th className="p-3 text-center">Detay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeProvinces.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                      Henüz 81 ile yapılmış bir il sevkiyat kaydı bulunmamaktadır. Sağ üst köşedeki <strong>"Yeni İl Sevkiyatı"</strong> butonunu kullanarak ilk sevkiyatınızı ekleyebilirsiniz.
                    </td>
                  </tr>
                ) : (
                  activeProvinces.map((prov) => {
                    const netDose = prov.totalDose - prov.returnedDose;
                    return (
                      <tr
                        key={prov.code}
                        onClick={() => onOpenProvinceDetail(prov.name)}
                        className="hover:bg-indigo-50/60 transition-colors cursor-pointer group"
                      >
                        <td className="p-3 font-bold text-slate-900 group-hover:text-indigo-700 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-mono">
                            {prov.code}
                          </span>
                          {prov.name}
                        </td>
                        <td className="p-3 text-slate-600">{prov.region}</td>
                        <td className="p-3 text-right font-semibold text-slate-900">
                          {prov.totalDose.toLocaleString('tr-TR')}
                        </td>
                        <td className="p-3 text-right text-amber-700 font-medium">
                          {prov.returnedDose > 0 ? `${prov.returnedDose.toLocaleString('tr-TR')}` : '-'}
                        </td>
                        <td className="p-3 text-right font-bold text-indigo-600">
                          {netDose.toLocaleString('tr-TR')}
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center text-xs text-indigo-600 font-semibold group-hover:underline">
                            İl Dosyası
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Chart Analytics & Quick Summary */}
        <div className="space-y-6">
          
          {/* Monthly Trend Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Aylık İl Sevkiyat Trendi (Doz)
            </h3>
            <div className="h-48 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(val: number) => [`${val.toLocaleString('tr-TR')} Doz`, 'Sevkiyat']} />
                  <Bar dataKey="Doses" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stock Share Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Merkez Stok Seri Dağılımı
            </h3>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {stockPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => [`${val.toLocaleString('tr-TR')} Doz`, 'Mevcut Stok']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] pt-2 border-t border-slate-100">
              {seriesList.map((s, idx) => (
                <div key={s.id} className="flex items-center gap-1 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  <span>{s.seriesNo}: {s.currentDoseQuantity.toLocaleString('tr-TR')} Doz</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
