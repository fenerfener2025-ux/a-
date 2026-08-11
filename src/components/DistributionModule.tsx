import React, { useState, useEffect } from 'react';
import {
  Truck,
  MapPin,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Search,
  ChevronRight,
  PlusCircle,
  X,
  FileText,
  Info,
  ShieldCheck,
  Package
} from 'lucide-react';
import { StorageService, convertKoyunToFlakon, convertKoyunToSigir } from '../services/storageService';
import { TURKEY_PROVINCES, getDistrictsOfProvince } from '../data/turkeyData';
import { Shipment, SeriesLot, Institution } from '../types';

interface DistributionModuleProps {
  preselectedSeriesId?: string | null;
  preselectedProvinceName?: string | null;
  onClearPreselection?: () => void;
}

export const DistributionModule: React.FC<DistributionModuleProps> = ({
  preselectedSeriesId,
  preselectedProvinceName,
  onClearPreselection
}) => {
  const [shipments, setShipments] = useState<Shipment[]>(StorageService.getShipments());
  const [seriesList, setSeriesList] = useState<SeriesLot[]>(StorageService.getSeries());
  const [institutions, setInstitutions] = useState<Institution[]>(StorageService.getInstitutions());

  const [activeSubTab, setActiveSubTab] = useState<'shipments' | 'new_shipment' | 'provinces'>('shipments');
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState<string>('Tümü');
  const [doseRangeFilter, setDoseRangeFilter] = useState<string>('Tümü');

  // Form State
  const [selectedProvinceCode, setSelectedProvinceCode] = useState('06'); // Default Ankara
  const [selectedDistrict, setSelectedDistrict] = useState('Çankaya');
  const [institutionName, setInstitutionName] = useState('Ankara İl Tarım ve Orman Müdürlüğü');
  const [selectedSeriesId, setSelectedSeriesId] = useState(preselectedSeriesId || seriesList[0]?.id || '');
  const [doseQuantity, setDoseQuantity] = useState<number>(20000);
  const [courierNotes, setCourierNotes] = useState('Soğuk zincir muhafazalı sevk aracı ile teslim.');
  const [createdByName, setCreatedByName] = useState('Dr. Ahmet Yılmaz (Etlik Sevk Sorumlusu)');

  // Selected Province Detail Drawer
  const [activeProvinceDetail, setActiveProvinceDetail] = useState<string | null>(preselectedProvinceName || null);

  // Error / Validation state
  const [formError, setFormError] = useState<string | null>(null);

  // Update Districts when Province changes
  const currentProvince = TURKEY_PROVINCES.find(p => p.code === selectedProvinceCode) || TURKEY_PROVINCES[0];
  const availableDistricts = currentProvince.districts;

  useEffect(() => {
    // When province changes, update default district & institution name
    if (availableDistricts.length > 0) {
      setSelectedDistrict(availableDistricts[0]);
      setInstitutionName(`${currentProvince.name} İl Tarım ve Orman Müdürlüğü`);
    }
  }, [selectedProvinceCode]);

  // Selected Series for Form
  const currentSeries = seriesList.find(s => s.id === selectedSeriesId);

  // Handle Form Submit
  const handleCreateShipment = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!currentSeries) {
      setFormError("Lütfen dağıtılacak seriyi seçin.");
      return;
    }

    if (doseQuantity <= 0) {
      setFormError("Dağıtım dozu 0'dan büyük olmalıdır.");
      return;
    }

    if (doseQuantity > currentSeries.currentDoseQuantity) {
      setFormError(`STOK YETERSİZ! Merkez stokta sadece ${currentSeries.currentDoseQuantity.toLocaleString('tr-TR')} doz mevcuttur.`);
      return;
    }

    try {
      StorageService.createShipment({
        provinceCode: currentProvince.code,
        provinceName: currentProvince.name,
        districtName: selectedDistrict,
        institutionName,
        seriesId: currentSeries.id,
        doseQuantity: Number(doseQuantity),
        courierNotes,
        createdByName
      });

      // Refresh Local State
      setShipments(StorageService.getShipments());
      setSeriesList(StorageService.getSeries());
      setInstitutions(StorageService.getInstitutions());

      setActiveSubTab('shipments');
      alert(`Sevkiyat Başarıyla Tamamlandı!\n${currentProvince.name} iline ${doseQuantity.toLocaleString('tr-TR')} doz ${currentSeries.seriesNo} sevk edildi.`);
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  // Filter Shipments with Multi-Faceted Logic
  const filteredShipments = shipments.filter(s => {
    const matchesSearch =
      s.provinceName.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR')) ||
      s.seriesNo.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR')) ||
      s.shipmentNo.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR')) ||
      s.institutionName.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR'));

    if (!matchesSearch) return false;

    // Region Filter
    if (regionFilter !== 'Tümü') {
      const prov = TURKEY_PROVINCES.find(p => p.name.toLocaleUpperCase('tr-TR') === s.provinceName.toLocaleUpperCase('tr-TR'));
      if (prov && prov.region !== regionFilter) return false;
    }

    // Dose Range Filter
    if (doseRangeFilter === '< 10.000' && s.doseQuantity >= 10000) return false;
    if (doseRangeFilter === '10.000 - 50.000' && (s.doseQuantity < 10000 || s.doseQuantity > 50000)) return false;
    if (doseRangeFilter === '> 50.000' && s.doseQuantity <= 50000) return false;

    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-indigo-600" />
            İl Dağıtım & Sevkiyat Yönetimi (81 İl)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Etlik Veteriner merkez stoğundan Türkiye genelindeki il/ilçe müdürlüklerine aşı dağıtımı.
          </p>
        </div>

        <button
          onClick={() => setActiveSubTab('new_shipment')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-full shadow-xs transition-all flex items-center gap-2 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          Yeni İl Sevkiyatı Oluştur
        </button>
      </div>

      {/* Navigation Sub-Tabs & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex bg-slate-100 p-1 rounded-full w-fit border border-slate-200">
          <button
            onClick={() => setActiveSubTab('shipments')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'shipments' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sevkiyat Geçmişi ({shipments.length})
          </button>

          <button
            onClick={() => setActiveSubTab('new_shipment')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'new_shipment' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Yeni Sevkiyat Formu
          </button>

          <button
            onClick={() => setActiveSubTab('provinces')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'provinces' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            İller Özet Rehberi (81 İl)
          </button>
        </div>
      </div>

      {/* Advanced Filter Bar for Distribution */}
      {activeSubTab !== 'new_shipment' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-indigo-600" />
                Gelişmiş Sevkiyat Filtreleme
              </span>
              {(regionFilter !== 'Tümü' || doseRangeFilter !== 'Tümü' || searchQuery !== '') && (
                <button
                  onClick={() => {
                    setRegionFilter('Tümü');
                    setDoseRangeFilter('Tümü');
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
                placeholder="İl, kurum, seri no veya protokol no ara..."
                className="w-full bg-slate-50 border border-slate-200 rounded-full pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Coğrafi Bölge Filtresi</label>
              <select
                value={regionFilter}
                onChange={e => setRegionFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="Tümü">Tüm Türkiye Bölgeleri</option>
                <option value="Marmara">Marmara Bölgesi</option>
                <option value="Ege">Ege Bölgesi</option>
                <option value="Akdeniz">Akdeniz Bölgesi</option>
                <option value="İç Anadolu">İç Anadolu Bölgesi</option>
                <option value="Karadeniz">Karadeniz Bölgesi</option>
                <option value="Doğu Anadolu">Doğu Anadolu Bölgesi</option>
                <option value="Güneydoğu Anadolu">Güneydoğu Anadolu Bölgesi</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Sevkiyat Doz Hacmi</label>
              <select
                value={doseRangeFilter}
                onChange={e => setDoseRangeFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="Tümü">Tüm Hacimler</option>
                <option value="< 10.000">Küçük Hacim (&lt; 10.000 Doz)</option>
                <option value="10.000 - 50.000">Orta Hacim (10.000 - 50.000 Doz)</option>
                <option value="> 50.000">Büyük Hacim (&gt; 50.000 Doz)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Areas */}
      {activeSubTab === 'shipments' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Sevk No / Protokol</th>
                  <th className="p-3.5">Hedef İl / Kurum</th>
                  <th className="p-3.5">Aşı & Seri No</th>
                  <th className="p-3.5 text-right">Sevk Dozu</th>
                  <th className="p-3.5 text-right">Flakon Sayısı</th>
                  <th className="p-3.5 text-center">Tarih</th>
                  <th className="p-3.5 text-center">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredShipments.map(s => (
                  <tr
                    key={s.id}
                    onClick={() => setActiveProvinceDetail(s.provinceName)}
                    className="hover:bg-indigo-50/60 transition-colors cursor-pointer group"
                  >
                    <td className="p-3.5 font-bold text-slate-900 group-hover:text-indigo-700">
                      {s.shipmentNo}
                      <div className="text-[10px] text-slate-400 font-mono">{s.protocolNo}</div>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                        {s.provinceName}
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal">{s.institutionName}</div>
                    </td>
                    <td className="p-3.5 font-medium text-slate-700">
                      {s.vaccineName}
                      <div className="text-[10px] text-slate-500 font-mono">{s.seriesNo} ({s.lotNo})</div>
                    </td>
                    <td className="p-3.5 text-right font-extrabold text-indigo-600">
                      {s.doseQuantity.toLocaleString('tr-TR')} Doz
                    </td>
                    <td className="p-3.5 text-right font-semibold text-slate-700">
                      {s.flakonQuantity.toLocaleString('tr-TR')} Flakon
                    </td>
                    <td className="p-3.5 text-center text-slate-600 font-mono">{s.date}</td>
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* SUB-TAB 2: YENİ SEVKİYAT FORMU           */}
      {/* ======================================= */}
      {activeSubTab === 'new_shipment' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-3xl mx-auto space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-600" />
              Etlik Veteriner İl Aşı Sevkiyat Formu
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Etlik merkez stoktan seçilen ile aşı çıkışı yapın. Stok otomatik düşülecektir.
            </p>
          </div>

          {formError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>{formError}</div>
            </div>
          )}

          <form onSubmit={handleCreateShipment} className="space-y-4 text-xs">
            
            {/* Hedef İl & İlçe Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Hedef İl (81 İl Seçimi)
                </label>
                <select
                  value={selectedProvinceCode}
                  onChange={e => setSelectedProvinceCode(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 focus:outline-none focus:border-emerald-500 text-sm"
                >
                  {TURKEY_PROVINCES.map(p => (
                    <option key={p.code} value={p.code}>
                      {p.code} - {p.name} ({p.region})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  İlçe Seçimi
                </label>
                <select
                  value={selectedDistrict}
                  onChange={e => setSelectedDistrict(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  {availableDistricts.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-800 mb-1">
                  Alıcı Kurum Adı
                </label>
                <input
                  type="text"
                  required
                  value={institutionName}
                  onChange={e => setInstitutionName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Aşı & Seri Selection */}
            <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 space-y-3">
              <div>
                <label className="block font-bold text-emerald-950 mb-1">
                  Dağıtılacak Aşı Serisi / Lot No (Stoklu Seriler)
                </label>
                <select
                  value={selectedSeriesId}
                  onChange={e => setSelectedSeriesId(e.target.value)}
                  className="w-full bg-white border border-emerald-300 rounded-xl p-2.5 font-bold text-emerald-900 focus:outline-none focus:border-emerald-600 text-sm"
                >
                  {seriesList.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.seriesNo} ({s.vaccineName}) • Kalan Stok: {s.currentDoseQuantity.toLocaleString('tr-TR')} Doz
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Stock Info Box */}
              {currentSeries && (
                <div className="bg-white p-3 rounded-xl border border-emerald-300 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 font-medium">Seçili Seri Merkez Stoğu:</span>
                    <span className="font-extrabold text-emerald-800 ml-2 text-sm">
                      {currentSeries.currentDoseQuantity.toLocaleString('tr-TR')} Doz
                    </span>
                  </div>
                  <span className="text-slate-400 font-mono">SKT: {currentSeries.expiryDate}</span>
                </div>
              )}
            </div>

            {/* Dose Quantity Input */}
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Sevk Edilecek Miktar (Koyun Dozu)
              </label>
              <input
                type="number"
                required
                step="100"
                min="100"
                value={doseQuantity}
                onChange={e => setDoseQuantity(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-xl p-2.5 font-extrabold text-slate-900 text-base focus:outline-none focus:border-emerald-500"
              />
              
              {/* Live Conversion Display */}
              <div className="mt-1.5 p-2 bg-slate-100 rounded-lg text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                <span>Dönüştürülmüş Değerler:</span>
                <span className="text-emerald-700 font-bold">
                  {convertKoyunToFlakon(doseQuantity).toLocaleString('tr-TR')} Flakon (~ {convertKoyunToSigir(doseQuantity).toLocaleString('tr-TR')} Sığır Dozu)
                </span>
              </div>
            </div>

            {/* Courier & Author Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Sevk Sorumlusu</label>
                <input
                  type="text"
                  value={createdByName}
                  onChange={e => setCreatedByName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nakliye & Soğuk Zincir Notları</label>
                <input
                  type="text"
                  value={courierNotes}
                  onChange={e => setCourierNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2 text-slate-800"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveSubTab('shipments')}
                className="px-5 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
              >
                İptal
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md flex items-center gap-2"
              >
                <Truck className="w-4 h-4" />
                Sevkiyatı Tamamla & Stoktan Düş
              </button>
            </div>

          </form>
        </div>
      )}

      {/* ======================================= */}
      {/* SUB-TAB 3: 81 İL REHBERİ TABLOSU         */}
      {/* ======================================= */}
      {activeSubTab === 'provinces' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TURKEY_PROVINCES.map(p => {
            const provShipments = shipments.filter(s => s.provinceName === p.name);
            const totalDose = provShipments.reduce((acc, s) => acc + s.doseQuantity, 0);

            return (
              <div
                key={p.code}
                onClick={() => setActiveProvinceDetail(p.name)}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 cursor-pointer transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                    {p.code}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">{p.region}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-base">{p.name}</h3>
                <p className="text-xs text-slate-500">{p.districts.length} İlçe • {provShipments.length} Sevkiyat Kaydı</p>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Toplam Sevk:</span>
                  <strong className="text-emerald-700">{totalDose.toLocaleString('tr-TR')} Doz</strong>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================= */}
      {/* DRAWER / MODAL: İL DOSYASI DETAYLARI     */}
      {/* ======================================= */}
      {activeProvinceDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  Etlik Veteriner İl Dosyası
                </span>
                <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-400" />
                  {activeProvinceDetail} İli Aşı Dosyası
                </h3>
              </div>
              <button
                onClick={() => {
                  setActiveProvinceDetail(null);
                  if (onClearPreselection) onClearPreselection();
                }}
                className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Province Stats Strip */}
            {(() => {
              const provShipments = shipments.filter(s => s.provinceName === activeProvinceDetail);
              const totalDose = provShipments.reduce((acc, s) => acc + s.doseQuantity, 0);
              return (
                <div className="bg-emerald-50 border-b border-emerald-200 p-4 grid grid-cols-2 gap-3 text-center text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                    <div className="text-slate-500 font-medium">Toplam Teslim Dozu</div>
                    <div className="font-extrabold text-emerald-800 text-base mt-0.5">
                      {totalDose.toLocaleString('tr-TR')} Doz
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                    <div className="text-slate-500 font-medium">Sevkiyat Kaydı</div>
                    <div className="font-bold text-slate-900 text-base mt-0.5">
                      {provShipments.length} Adet
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              <h4 className="font-bold text-slate-900 text-sm">
                {activeProvinceDetail} İline Yapılan Sevkiyat Listesi
              </h4>

              {shipments.filter(s => s.provinceName === activeProvinceDetail).length === 0 ? (
                <p className="text-slate-400 italic py-8 text-center">Bu ilimize henüz sevkiyat yapılmamıştır.</p>
              ) : (
                <div className="space-y-2">
                  {shipments.filter(s => s.provinceName === activeProvinceDetail).map(shp => (
                    <div key={shp.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">{shp.institutionName}</span>
                        <span className="font-extrabold text-emerald-700 text-sm">{shp.doseQuantity.toLocaleString('tr-TR')} Doz</span>
                      </div>
                      <p className="text-slate-600">Aşı / Seri: {shp.vaccineName} ({shp.seriesNo})</p>
                      <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <span>Sevk No: {shp.shipmentNo}</span>
                        <span>Tarih: {shp.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => {
                  setSelectedProvinceCode(TURKEY_PROVINCES.find(p => p.name === activeProvinceDetail)?.code || '06');
                  setActiveProvinceDetail(null);
                  setActiveSubTab('new_shipment');
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow cursor-pointer"
              >
                Bu İle Yeni Sevkiyat Yap
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
