import React, { useState } from 'react';
import {
  Package,
  Plus,
  ShieldCheck,
  Search,
  Layers,
  Calendar,
  AlertTriangle,
  Info,
  X,
  PlusCircle,
  Clock,
  FileText,
  Truck,
  RotateCcw,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { StorageService, convertKoyunToFlakon, convertKoyunToSigir, formatDoseDisplay } from '../services/storageService';
import { Vaccine, SeriesLot, TechnicalValue, VaccineType, UnitType } from '../types';

interface InventoryModuleProps {
  selectedSeriesFromParent?: SeriesLot | null;
  onClearSelectedSeries?: () => void;
  onNavigateToDistribution?: (seriesId: string) => void;
}

export const InventoryModule: React.FC<InventoryModuleProps> = ({
  selectedSeriesFromParent,
  onClearSelectedSeries,
  onNavigateToDistribution
}) => {
  const [activeTab, setActiveTab] = useState<'series' | 'vaccines'>('series');
  const [searchQuery, setSearchQuery] = useState('');
  const [vaccineTypeFilter, setVaccineTypeFilter] = useState<string>('Tümü');
  const [stockStatusFilter, setStockStatusFilter] = useState<string>('Tümü');
  const [expiryStatusFilter, setExpiryStatusFilter] = useState<string>('Tümü');

  // Data state
  const [vaccines, setVaccines] = useState<Vaccine[]>(StorageService.getVaccines());
  const [seriesList, setSeriesList] = useState<SeriesLot[]>(StorageService.getSeries());

  // Detail Drawers
  const [activeSeriesDetail, setActiveSeriesDetail] = useState<SeriesLot | null>(selectedSeriesFromParent || null);
  const [seriesDetailTab, setSeriesDetailTab] = useState<'genel' | 'teknik' | 'dagitim' | 'iade' | 'hareketler'>('genel');
  const [activeVaccineDetail, setActiveVaccineDetail] = useState<Vaccine | null>(null);

  // Modals
  const [showNewVaccineModal, setShowNewVaccineModal] = useState(false);
  const [showNewSeriesModal, setShowNewSeriesModal] = useState(false);

  // Form State: New Vaccine
  const [newVacName, setNewVacName] = useState('');
  const [newVacType, setNewVacType] = useState<VaccineType>('Viral');
  const [newVacPurpose, setNewVacPurpose] = useState('');
  const [newVacUnit, setNewVacUnit] = useState<UnitType>('Koyun Dozu');
  const [newVacDesc, setNewVacDesc] = useState('');

  // Form State: New Series Production
  const [newSerVaccineId, setNewSerVaccineId] = useState(vaccines[0]?.id || '');
  const [newSerNo, setNewSerNo] = useState('');
  const [newLotNo, setNewLotNo] = useState('');
  const [newSerProdDate, setNewSerProdDate] = useState(new Date().toISOString().split('T')[0]);
  const [newSerExpDate, setNewSerExpDate] = useState('');
  const [newSerDoseQty, setNewSerDoseQty] = useState<number>(100000);
  const [newSerStorage, setNewSerStorage] = useState('+2°C ile +8°C arasında soğuk zincirde');
  const [newSerNotes, setNewSerNotes] = useState('');
  const [techFields, setTechFields] = useState<TechnicalValue[]>([
    { key: 'Virüs / Bakteri Titresi', value: '10^3.5 TCID50/doz' },
    { key: 'Saflık & Sterilite', value: 'Steril / Kontaminasyon Yok' },
    { key: 'Nem Oranı', value: '% 1.2 Liyofilize' }
  ]);

  const refreshData = () => {
    setVaccines(StorageService.getVaccines());
    setSeriesList(StorageService.getSeries());
  };

  // Filtered Series with Multi-Faceted Logic
  const filteredSeries = seriesList.filter(s => {
    // 1. Text Search
    const matchesSearch =
      s.seriesNo.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR')) ||
      s.lotNo.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR')) ||
      s.vaccineName.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR'));

    if (!matchesSearch) return false;

    // 2. Vaccine Type Filter
    if (vaccineTypeFilter !== 'Tümü') {
      const vac = vaccines.find(v => v.id === s.vaccineId);
      if (vac && vac.type !== vaccineTypeFilter) return false;
    }

    // 3. Stock Status Filter
    if (stockStatusFilter === 'Yüksek Stok' && s.currentDoseQuantity <= 50000) return false;
    if (stockStatusFilter === 'Normal Stok' && (s.currentDoseQuantity < 10000 || s.currentDoseQuantity > 50000)) return false;
    if (stockStatusFilter === 'Kritik Stok' && (s.currentDoseQuantity <= 0 || s.currentDoseQuantity >= 10000)) return false;
    if (stockStatusFilter === 'Tükenmiş' && s.currentDoseQuantity > 0) return false;

    // 4. Expiry Status Filter
    if (expiryStatusFilter === 'SKT Yaklaşan' && s.status !== 'SKT Yaklaşan') return false;
    if (expiryStatusFilter === 'Aktif' && s.status !== 'Aktif') return false;
    if (expiryStatusFilter === 'Kritik Stok' && s.status !== 'Kritik Stok') return false;

    return true;
  });

  // Filtered Vaccines
  const filteredVaccines = vaccines.filter(v => {
    const matchesSearch =
      v.name.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR')) ||
      v.type.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR'));
    if (!matchesSearch) return false;

    if (vaccineTypeFilter !== 'Tümü' && v.type !== vaccineTypeFilter) return false;
    return true;
  });

  // Submit New Vaccine
  const handleCreateVaccine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVacName.trim()) return;
    StorageService.addVaccine({
      name: newVacName,
      producer: "Etlik Veteriner Kontrol Merkez Araştırma Enstitüsü",
      type: newVacType,
      purpose: newVacPurpose,
      unit: newVacUnit,
      description: newVacDesc,
      active: true
    });
    setShowNewVaccineModal(false);
    setNewVacName('');
    setNewVacPurpose('');
    setNewVacDesc('');
    refreshData();
  };

  // Submit New Series Production
  const handleCreateSeries = (e: React.FormEvent) => {
    e.preventDefault();
    const vac = vaccines.find(v => v.id === newSerVaccineId);
    if (!vac || !newSerNo.trim()) return;

    try {
      StorageService.addSeries({
        vaccineId: vac.id,
        vaccineName: vac.name,
        seriesNo: newSerNo.trim().toLocaleUpperCase('tr-TR'),
        lotNo: newLotNo.trim().toLocaleUpperCase('tr-TR') || `LOT-${Math.floor(1000 + Math.random() * 9000)}`,
        productionDate: newSerProdDate,
        expiryDate: newSerExpDate,
        initialDoseQuantity: Number(newSerDoseQty),
        storageConditions: newSerStorage,
        technicalValues: techFields.filter(f => f.key.trim() !== ''),
        notes: newSerNotes
      });
      setShowNewSeriesModal(false);
      setNewSerNo('');
      setNewLotNo('');
      refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" />
            Aşı & Seri / Lot Envanter Yönetimi
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Etlik Veteriner üretimi olan aşıların teknik değerleri, lot takipleri ve stok durumu.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewVaccineModal(true)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-4 py-2 rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-600" />
            Yeni Aşı Kartı
          </button>
          <button
            onClick={() => setShowNewSeriesModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2 rounded-full shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Yeni Seri Üretim Kaydı
          </button>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-full w-fit border border-slate-200">
          <button
            onClick={() => setActiveTab('series')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'series'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Seri / Lot Üretim Kartları ({seriesList.length})
          </button>
          <button
            onClick={() => setActiveTab('vaccines')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'vaccines'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Aşı Çeşitleri ({vaccines.length})
          </button>
        </div>

      {/* Advanced Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-indigo-600" />
              Gelişmiş Filtreleme
            </span>
            {(vaccineTypeFilter !== 'Tümü' || stockStatusFilter !== 'Tümü' || expiryStatusFilter !== 'Tümü' || searchQuery !== '') && (
              <button
                onClick={() => {
                  setVaccineTypeFilter('Tümü');
                  setStockStatusFilter('Tümü');
                  setExpiryStatusFilter('Tümü');
                  setSearchQuery('');
                }}
                className="text-[11px] text-rose-600 font-bold hover:underline cursor-pointer flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100"
              >
                <X className="w-3 h-3" />
                Filtreleri Temizle
              </button>
            )}
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Seri no, aşı adı veya lot no ara..."
              className="w-full bg-slate-50 border border-slate-200 rounded-full pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Dropdown Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Aşı Tipi</label>
            <select
              value={vaccineTypeFilter}
              onChange={e => setVaccineTypeFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 font-medium focus:outline-none focus:border-indigo-500"
            >
              <option value="Tümü">Tüm Aşı Tipleri</option>
              <option value="Viral">Viral Aşılar</option>
              <option value="Bakteriyel">Bakteriyel Aşılar</option>
              <option value="Karma">Karma Aşılar</option>
              <option value="Paraziter">Paraziter Aşılar</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Stok Durumu</label>
            <select
              value={stockStatusFilter}
              onChange={e => setStockStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 font-medium focus:outline-none focus:border-indigo-500"
            >
              <option value="Tümü">Tüm Stok Seviyeleri</option>
              <option value="Yüksek Stok">Yüksek Stok (&gt; 50.000 Doz)</option>
              <option value="Normal Stok">Normal Stok (10.000 - 50.000 Doz)</option>
              <option value="Kritik Stok">Düşük / Kritik Stok (&lt; 10.000 Doz)</option>
              <option value="Tükenmiş">Tükenmiş Stok (0 Doz)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Son Kullanma Durumu</label>
            <select
              value={expiryStatusFilter}
              onChange={e => setExpiryStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 font-medium focus:outline-none focus:border-indigo-500"
            >
              <option value="Tümü">Tüm SKT Durumları</option>
              <option value="Aktif">Normal / Geçerli SKT</option>
              <option value="SKT Yaklaşan">SKT Yaklaşan Uyarılar</option>
              <option value="Kritik Stok">Kritik Uyarılar</option>
            </select>
          </div>
        </div>
      </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'series' ? (
        /* Series List Table */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Seri No / Lot</th>
                  <th className="p-3.5">Aşı Adı</th>
                  <th className="p-3.5">Üretim Tarihi</th>
                  <th className="p-3.5">SKT</th>
                  <th className="p-3.5 text-right">İlk Üretim (Doz)</th>
                  <th className="p-3.5 text-right">Mevcut Stok (Doz)</th>
                  <th className="p-3.5 text-right">Dağıtılan</th>
                  <th className="p-3.5 text-center">Durum</th>
                  <th className="p-3.5 text-center">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSeries.map(s => {
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setActiveSeriesDetail(s)}
                      className="hover:bg-indigo-50/60 transition-colors cursor-pointer group"
                    >
                      <td className="p-3.5 font-bold text-slate-900 group-hover:text-indigo-700">
                        {s.seriesNo}
                        <div className="text-[10px] text-slate-400 font-mono">{s.lotNo}</div>
                      </td>
                      <td className="p-3.5 font-semibold text-slate-700">{s.vaccineName}</td>
                      <td className="p-3.5 text-slate-600">{s.productionDate}</td>
                      <td className="p-3.5 text-slate-600">{s.expiryDate}</td>
                      <td className="p-3.5 text-right font-medium text-slate-800">
                        {s.initialDoseQuantity.toLocaleString('tr-TR')}
                      </td>
                      <td className="p-3.5 text-right font-extrabold text-indigo-600">
                        {s.currentDoseQuantity.toLocaleString('tr-TR')}
                      </td>
                      <td className="p-3.5 text-right text-blue-700 font-medium">
                        {s.distributedDoseQuantity.toLocaleString('tr-TR')}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          s.status === 'Aktif' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                          s.status === 'SKT Yaklaşan' ? 'bg-amber-100 text-amber-800' :
                          s.status === 'Kritik Stok' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSeriesDetail(s);
                          }}
                          className="px-3 py-1 bg-indigo-50 text-indigo-700 font-semibold rounded-full hover:bg-indigo-100 transition-colors text-xs cursor-pointer"
                        >
                          Seri Dosyası
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Vaccines List Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVaccines.map(v => {
            const seriesOfVac = seriesList.filter(s => s.vaccineId === v.id);
            const totalStockOfVac = seriesOfVac.reduce((acc, s) => acc + s.currentDoseQuantity, 0);

            return (
              <div
                key={v.id}
                onClick={() => setActiveVaccineDetail(v)}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-xl hover:border-indigo-300 cursor-pointer transition-all space-y-3"
              >
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-3 py-0.5 rounded-full border border-indigo-100">
                    {v.type}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{v.unit}</span>
                </div>

                <h3 className="font-bold text-slate-900 text-base">{v.name}</h3>
                <p className="text-xs text-slate-500 line-clamp-2">{v.purpose}</p>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Üretilen Seri: <strong>{seriesOfVac.length} Lot</strong></span>
                  <span className="font-extrabold text-indigo-600">
                    {totalStockOfVac.toLocaleString('tr-TR')} Doz Stok
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================= */}
      {/* MODAL / DRAWER 1: SERİ DOSYASI (DETAIL) */}
      {/* ======================================= */}
      {activeSeriesDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            
            {/* Header */}
            <div className="bg-indigo-950 text-white p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                  Etlik Veteriner Seri Dosyası
                </span>
                <h3 className="text-xl font-extrabold text-white">
                  Seri No: {activeSeriesDetail.seriesNo}
                </h3>
                <p className="text-xs text-indigo-200">{activeSeriesDetail.vaccineName} ({activeSeriesDetail.lotNo})</p>
              </div>
              <button
                onClick={() => {
                  setActiveSeriesDetail(null);
                  if (onClearSelectedSeries) onClearSelectedSeries();
                }}
                className="p-2 rounded-full hover:bg-indigo-900 text-indigo-200 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Header KPI Strip */}
            <div className="bg-slate-50 border-b border-slate-200 p-4 grid grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <div className="text-slate-400 font-medium">İlk Üretim</div>
                <div className="font-bold text-slate-900 text-sm mt-0.5">
                  {activeSeriesDetail.initialDoseQuantity.toLocaleString('tr-TR')}
                </div>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <div className="text-slate-400 font-medium">Dağıtılan</div>
                <div className="font-bold text-blue-700 text-sm mt-0.5">
                  {activeSeriesDetail.distributedDoseQuantity.toLocaleString('tr-TR')}
                </div>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <div className="text-slate-400 font-medium">İade Doz</div>
                <div className="font-bold text-amber-700 text-sm mt-0.5">
                  {activeSeriesDetail.returnedDoseQuantity.toLocaleString('tr-TR')}
                </div>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 p-2 rounded-xl">
                <div className="text-indigo-700 font-medium">Mevcut Stok</div>
                <div className="font-extrabold text-indigo-900 text-sm mt-0.5">
                  {activeSeriesDetail.currentDoseQuantity.toLocaleString('tr-TR')}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-100 text-xs font-bold px-4">
              <button
                onClick={() => setSeriesDetailTab('genel')}
                className={`px-4 py-3 border-b-2 transition-all cursor-pointer ${
                  seriesDetailTab === 'genel' ? 'border-indigo-600 text-indigo-900 bg-white' : 'border-transparent text-slate-600'
                }`}
              >
                Genel Bilgiler
              </button>
              <button
                onClick={() => setSeriesDetailTab('teknik')}
                className={`px-4 py-3 border-b-2 transition-all cursor-pointer ${
                  seriesDetailTab === 'teknik' ? 'border-indigo-600 text-indigo-900 bg-white' : 'border-transparent text-slate-600'
                }`}
              >
                Teknik Değerler
              </button>
              <button
                onClick={() => setSeriesDetailTab('dagitim')}
                className={`px-4 py-3 border-b-2 transition-all cursor-pointer ${
                  seriesDetailTab === 'dagitim' ? 'border-indigo-600 text-indigo-900 bg-white' : 'border-transparent text-slate-600'
                }`}
              >
                İl Dağıtımları
              </button>
              <button
                onClick={() => setSeriesDetailTab('hareketler')}
                className={`px-4 py-3 border-b-2 transition-all cursor-pointer ${
                  seriesDetailTab === 'hareketler' ? 'border-indigo-600 text-indigo-900 bg-white' : 'border-transparent text-slate-600'
                }`}
              >
                Stok Geçmişi
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              {seriesDetailTab === 'genel' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-400">Üretici Kurum:</span>
                      <p className="font-semibold text-slate-800">Etlik Veteriner Kontrol M.A.E.</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Üretim Tarihi:</span>
                      <p className="font-semibold text-slate-800">{activeSeriesDetail.productionDate}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Son Kullanma Tarihi (SKT):</span>
                      <p className="font-semibold text-slate-800">{activeSeriesDetail.expiryDate}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Saklama Koşulları:</span>
                      <p className="font-semibold text-slate-800">{activeSeriesDetail.storageConditions}</p>
                    </div>
                  </div>

                  {activeSeriesDetail.notes && (
                    <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-amber-900">
                      <span className="font-bold">Üretim Notları:</span>
                      <p className="mt-1">{activeSeriesDetail.notes}</p>
                    </div>
                  )}

                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-2">
                    <span className="font-bold text-sm">Eşdeğer Dönüşüm Hesapları</span>
                    <p className="text-xs">
                      {formatDoseDisplay(activeSeriesDetail.currentDoseQuantity)}
                    </p>
                  </div>
                </div>
              )}

              {seriesDetailTab === 'teknik' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm">Kalite Kontrol & Laboratuvar Parametreleri</h4>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {activeSeriesDetail.technicalValues.map((tv, idx) => (
                      <div key={idx} className="p-3 bg-white flex items-center justify-between">
                        <span className="font-semibold text-slate-700">{tv.key}</span>
                        <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                          {tv.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {seriesDetailTab === 'dagitim' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm">Bu Seriden İllere Yapılan Sevkiyatlar</h4>
                  {StorageService.getShipments().filter(s => s.seriesId === activeSeriesDetail.id).length === 0 ? (
                    <p className="text-slate-400 italic py-6 text-center">Bu seriden henüz sevkiyat yapılmamıştır.</p>
                  ) : (
                    <div className="space-y-2">
                      {StorageService.getShipments().filter(s => s.seriesId === activeSeriesDetail.id).map(shp => (
                        <div key={shp.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-900">{shp.provinceName} ({shp.institutionName})</span>
                            <div className="text-[11px] text-slate-500">Sevk No: {shp.shipmentNo} • Tarih: {shp.date}</div>
                          </div>
                          <span className="font-extrabold text-blue-700 text-sm">{shp.doseQuantity.toLocaleString('tr-TR')} Doz</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {seriesDetailTab === 'hareketler' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm">Kronolojik Stok Değişim Geçmişi</h4>
                  <div className="space-y-2">
                    {StorageService.getMovements().filter(m => m.seriesId === activeSeriesDetail.id).map(mov => (
                      <div key={mov.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-800">{mov.movementType}</span>
                          <p className="text-slate-500 text-[11px]">{mov.description} • {mov.date}</p>
                        </div>
                        <div className="text-right">
                          <span className={`font-bold ${mov.changeQuantity >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {mov.changeQuantity >= 0 ? `+${mov.changeQuantity.toLocaleString('tr-TR')}` : mov.changeQuantity.toLocaleString('tr-TR')} Doz
                          </span>
                          <div className="text-[10px] text-slate-400">Sonraki Stok: {mov.afterQuantity.toLocaleString('tr-TR')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Action */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => {
                  const sId = activeSeriesDetail.id;
                  setActiveSeriesDetail(null);
                  if (onNavigateToDistribution) onNavigateToDistribution(sId);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow flex items-center gap-2 cursor-pointer"
              >
                <Truck className="w-4 h-4" />
                Bu Seriden İl Sevkiyatı Başlat
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* MODAL 2: YENİ SERİ ÜRETİM KAYDI FORMU   */}
      {/* ======================================= */}
      {showNewSeriesModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 bg-emerald-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Yeni Seri / Lot Üretim Kaydı</h3>
                <p className="text-xs text-emerald-200">Etlik Veteriner üretilen yeni seri bilgilerini girin.</p>
              </div>
              <button onClick={() => setShowNewSeriesModal(false)} className="text-emerald-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSeries} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Aşı Türü</label>
                  <select
                    value={newSerVaccineId}
                    onChange={e => setNewSerVaccineId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-slate-800 font-medium focus:outline-none focus:border-emerald-500"
                  >
                    {vaccines.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Seri No (örn: PPR-2026-002)</label>
                  <input
                    type="text"
                    required
                    value={newSerNo}
                    onChange={e => setNewSerNo(e.target.value)}
                    placeholder="SERİ NO"
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-slate-800 font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lot No</label>
                  <input
                    type="text"
                    value={newLotNo}
                    onChange={e => setNewLotNo(e.target.value)}
                    placeholder="LOT-8890"
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-slate-800 font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Üretim Tarihi</label>
                  <input
                    type="date"
                    required
                    value={newSerProdDate}
                    onChange={e => setNewSerProdDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-slate-800 font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">SKT Tarihi</label>
                  <input
                    type="date"
                    required
                    value={newSerExpDate}
                    onChange={e => setNewSerExpDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-slate-800 font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Üretim Miktarı (Koyun Dozu)
                </label>
                <input
                  type="number"
                  required
                  step="100"
                  min="100"
                  value={newSerDoseQty}
                  onChange={e => setNewSerDoseQty(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-slate-800 font-bold focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-emerald-700 font-medium mt-1">
                  = {convertKoyunToFlakon(newSerDoseQty)} Flakon ({convertKoyunToSigir(newSerDoseQty)} Sığır Dozu)
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Saklama Koşulları</label>
                <input
                  type="text"
                  value={newSerStorage}
                  onChange={e => setNewSerStorage(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewSeriesModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow"
                >
                  Seri Üretimini Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* MODAL 3: YENİ AŞI KARTİ TANIMLAMA       */}
      {/* ======================================= */}
      {showNewVaccineModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">Yeni Aşı Çeşidi Tanımla</h3>
              <button onClick={() => setShowNewVaccineModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVaccine} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Aşı Adı</label>
                <input
                  type="text"
                  required
                  value={newVacName}
                  onChange={e => setNewVacName(e.target.value)}
                  placeholder="Örn: Pestivac (PPR Aşısı)"
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-slate-800 font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Aşı Türü</label>
                  <select
                    value={newVacType}
                    onChange={e => setNewVacType(e.target.value as VaccineType)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Viral">Viral</option>
                    <option value="Bakteriyel">Bakteriyel</option>
                    <option value="Paraziter">Paraziter</option>
                    <option value="Karma">Karma</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hesap Birimi</label>
                  <select
                    value={newVacUnit}
                    onChange={e => setNewVacUnit(e.target.value as UnitType)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Koyun Dozu">Koyun Dozu (Varsayılan)</option>
                    <option value="Sığır Dozu">Sığır Dozu</option>
                    <option value="Şişe/Flakon">Şişe/Flakon</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kullanım Amacı / Açıklama</label>
                <textarea
                  value={newVacPurpose}
                  onChange={e => setNewVacPurpose(e.target.value)}
                  rows={2}
                  placeholder="Aşının koruma sağladığı hastalık ve tedavi detayları..."
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewVaccineModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow"
                >
                  Aşı Kartını Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
