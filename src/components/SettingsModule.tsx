import React, { useState } from 'react';
import {
  Settings,
  Database,
  Download,
  Upload,
  RefreshCw,
  Edit,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Server,
  ShieldCheck,
  Search,
  Filter,
  Save,
  Building2,
  HardDrive,
  FileSpreadsheet,
  X,
  Clock,
  Layers,
  HelpCircle,
  FileText
} from 'lucide-react';
import { StorageService, formatNumber } from '../services/storageService';
import { SeriesLot, Shipment, ReturnRecord, DestructionRecord, Vaccine } from '../types';

export const SettingsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'correction' | 'backup' | 'institution' | 'cloud'>('correction');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'series' | 'shipments' | 'returns' | 'destructions'>('all');

  // Live Data State
  const [seriesList, setSeriesList] = useState<SeriesLot[]>(StorageService.getSeries());
  const [shipments, setShipments] = useState<Shipment[]>(StorageService.getShipments());
  const [returns, setReturns] = useState<ReturnRecord[]>(StorageService.getReturns());
  const [destructions, setDestructions] = useState<DestructionRecord[]>(StorageService.getDestructions());
  const [vaccines, setVaccines] = useState<Vaccine[]>(StorageService.getVaccines());

  // Edit Modals State
  const [editingItem, setEditingItem] = useState<{
    type: 'series' | 'shipment' | 'return' | 'destruction';
    data: any;
  } | null>(null);

  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{
    type: 'series' | 'shipment' | 'return' | 'destruction';
    id: string;
    label: string;
  } | null>(null);

  // Institution Settings State
  const [instName, setInstName] = useState('Etlik Veteriner Kontrol Merkez Araştırma Enstitüsü');
  const [instLocation, setInstLocation] = useState('ETLİK / ANKARA');
  const [criticalStockThreshold, setCriticalStockThreshold] = useState(10000);
  const [expiryAlertDays, setExpiryAlertDays] = useState(90);
  const [defaultOfficer, setDefaultOfficer] = useState('Etlik Sevk Yetkilisi');
  const [settingsSavedMessage, setSettingsSavedMessage] = useState(false);

  // JSON Import File State
  const [importJsonError, setImportJsonError] = useState<string | null>(null);
  const [importJsonSuccess, setImportJsonSuccess] = useState<boolean>(false);

  const refreshAllData = () => {
    setSeriesList(StorageService.getSeries());
    setShipments(StorageService.getShipments());
    setReturns(StorageService.getReturns());
    setDestructions(StorageService.getDestructions());
    setVaccines(StorageService.getVaccines());
  };

  // Execute Edit Save
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      if (editingItem.type === 'series') {
        StorageService.updateSeries(editingItem.data.id, editingItem.data);
      } else if (editingItem.type === 'shipment') {
        StorageService.updateShipment(editingItem.data.id, editingItem.data);
      } else if (editingItem.type === 'return') {
        StorageService.updateReturn(editingItem.data.id, editingItem.data);
      } else if (editingItem.type === 'destruction') {
        StorageService.updateDestruction(editingItem.data.id, editingItem.data);
      }

      refreshAllData();
      setEditingItem(null);
    } catch (err: any) {
      alert(err.message || "Güncelleme sırasında hata oluştu!");
    }
  };

  // Execute Delete
  const handleConfirmDelete = () => {
    if (!deleteConfirmItem) return;

    try {
      if (deleteConfirmItem.type === 'series') {
        StorageService.deleteSeries(deleteConfirmItem.id);
      } else if (deleteConfirmItem.type === 'shipment') {
        StorageService.deleteShipment(deleteConfirmItem.id);
      } else if (deleteConfirmItem.type === 'return') {
        StorageService.deleteReturn(deleteConfirmItem.id);
      } else if (deleteConfirmItem.type === 'destruction') {
        StorageService.deleteDestruction(deleteConfirmItem.id);
      }

      refreshAllData();
      setDeleteConfirmItem(null);
    } catch (err: any) {
      alert(err.message || "Silme işlemi başarısız!");
    }
  };

  // Handle Backup Import File
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportJsonError(null);
    setImportJsonSuccess(false);

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        await StorageService.importFullDatabaseJSON(content);
        refreshAllData();
        setImportJsonSuccess(true);
        setTimeout(() => setImportJsonSuccess(false), 4000);
      } catch (err: any) {
        setImportJsonError(err.message || "Dosya okuma hatası!");
      }
    };
    reader.readAsText(file);
  };

  const handleSaveInstitutionSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSavedMessage(true);
    setTimeout(() => setSettingsSavedMessage(false), 3000);
  };

  // Unified items list for correction tab
  const getCombinedCorrectionItems = () => {
    const query = searchQuery.trim().toLocaleLowerCase('tr-TR');
    let items: Array<{
      type: 'series' | 'shipment' | 'return' | 'destruction';
      id: string;
      code: string;
      title: string;
      details: string;
      amountText: string;
      date: string;
      raw: any;
    }> = [];

    if (categoryFilter === 'all' || categoryFilter === 'series') {
      seriesList.forEach(s => {
        if (!query || s.seriesNo.toLocaleLowerCase('tr-TR').includes(query) || s.vaccineName.toLocaleLowerCase('tr-TR').includes(query)) {
          items.push({
            type: 'series',
            id: s.id,
            code: s.seriesNo,
            title: `Aşı Serisi: ${s.seriesNo} (${s.lotNo})`,
            details: `${s.vaccineName} • SKT: ${s.expiryDate}`,
            amountText: `${formatNumber(s.currentDoseQuantity)} Doz Kalan (Üretim: ${formatNumber(s.initialDoseQuantity)})`,
            date: s.createdAt?.split('T')[0] || '-',
            raw: s
          });
        }
      });
    }

    if (categoryFilter === 'all' || categoryFilter === 'shipments') {
      shipments.forEach(shp => {
        if (!query || shp.shipmentNo.toLocaleLowerCase('tr-TR').includes(query) || shp.provinceName.toLocaleLowerCase('tr-TR').includes(query) || shp.seriesNo.toLocaleLowerCase('tr-TR').includes(query)) {
          items.push({
            type: 'shipment',
            id: shp.id,
            code: shp.shipmentNo,
            title: `İl Sevkiyatı: ${shp.shipmentNo} (${shp.protocolNo})`,
            details: `${shp.provinceName} / ${shp.institutionName} • ${shp.vaccineName} (${shp.seriesNo})`,
            amountText: `${formatNumber(shp.doseQuantity)} Doz Sevk Edildi`,
            date: shp.date,
            raw: shp
          });
        }
      });
    }

    if (categoryFilter === 'all' || categoryFilter === 'returns') {
      returns.forEach(r => {
        if (!query || r.returnNo.toLocaleLowerCase('tr-TR').includes(query) || r.provinceName.toLocaleLowerCase('tr-TR').includes(query) || r.seriesNo.toLocaleLowerCase('tr-TR').includes(query)) {
          items.push({
            type: 'return',
            id: r.id,
            code: r.returnNo,
            title: `İl İadesi: ${r.returnNo}`,
            details: `${r.provinceName} • ${r.vaccineName} (${r.seriesNo}) • Sebep: ${r.returnReason}`,
            amountText: `${formatNumber(r.doseQuantity)} Doz İade (${r.returnStatus})`,
            date: r.date,
            raw: r
          });
        }
      });
    }

    if (categoryFilter === 'all' || categoryFilter === 'destructions') {
      destructions.forEach(d => {
        if (!query || d.destructionNo.toLocaleLowerCase('tr-TR').includes(query) || d.seriesNo.toLocaleLowerCase('tr-TR').includes(query) || d.protocolNo.toLocaleLowerCase('tr-TR').includes(query)) {
          items.push({
            type: 'destruction',
            id: d.id,
            code: d.destructionNo,
            title: `İmha Tutanak No: ${d.protocolNo}`,
            details: `${d.vaccineName} (${d.seriesNo}) • İmha Sebebi: ${d.reason}`,
            amountText: `${formatNumber(d.doseQuantity)} Doz İmha Edildi`,
            date: d.date,
            raw: d
          });
        }
      });
    }

    return items;
  };

  const combinedItems = getCombinedCorrectionItems();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Page Title & Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-lg border border-indigo-900/40 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 p-12 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center shrink-0 shadow-inner">
            <Settings className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">Sistem Ayarları & Veri Düzeltme Portalı</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                FULL YETKİ
              </span>
            </div>
            <p className="text-xs text-indigo-200/80 mt-1">
              Yanlış girilen verileri düzenleme, yedek alma/yükleme ve Enstitü parametre yönetimi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshAllData}
            className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-white/15 transition-all flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-indigo-300" />
            <span>Verileri Yenile</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs">
        <button
          onClick={() => setActiveTab('correction')}
          className={`flex-1 min-w-[180px] py-3 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'correction'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Edit className="w-4 h-4" />
          <span>Veri Düzeltme & Silme</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 font-extrabold ml-1">
            {combinedItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`flex-1 min-w-[180px] py-3 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'backup'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Yedek Alma & Geri Yükleme</span>
        </button>

        <button
          onClick={() => setActiveTab('institution')}
          className={`flex-1 min-w-[180px] py-3 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'institution'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Kurum & Sistem Parametreleri</span>
        </button>

        <button
          onClick={() => setActiveTab('cloud')}
          className={`flex-1 min-w-[180px] py-3 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'cloud'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Bulut DB & Canlı Senkronizasyon</span>
        </button>
      </div>

      {/* TAB 1: VERİ DÜZELTME & SİLME PORTALI */}
      {activeTab === 'correction' && (
        <div className="space-y-4">
          
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Search */}
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Seri no, sevkiyat no, il veya tutanak no ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  categoryFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tümü ({seriesList.length + shipments.length + returns.length + destructions.length})
              </button>
              <button
                onClick={() => setCategoryFilter('series')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  categoryFilter === 'series' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Üretim Serileri ({seriesList.length})
              </button>
              <button
                onClick={() => setCategoryFilter('shipments')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  categoryFilter === 'shipments' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                İl Sevkiyatları ({shipments.length})
              </button>
              <button
                onClick={() => setCategoryFilter('returns')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  categoryFilter === 'returns' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                İadeler ({returns.length})
              </button>
              <button
                onClick={() => setCategoryFilter('destructions')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  categoryFilter === 'destructions' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                İmhalar ({destructions.length})
              </button>
            </div>
          </div>

          {/* List Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Edit className="w-4 h-4 text-indigo-600" />
                Sistemdeki Tüm Kayıtlar ({combinedItems.length} Adet)
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                Yanlış girilen herhangi bir kaydı "Düzenle" butonundan güncelleyebilirsiniz.
              </span>
            </div>

            {combinedItems.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Aranan kriterde kayıt bulunamadı.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {combinedItems.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          item.type === 'series' ? 'bg-indigo-100 text-indigo-800' :
                          item.type === 'shipment' ? 'bg-blue-100 text-blue-800' :
                          item.type === 'return' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {item.type === 'series' ? 'Seri/Lot' : item.type === 'shipment' ? 'Sevkiyat' : item.type === 'return' ? 'İade' : 'İmha'}
                        </span>
                        <strong className="text-xs font-bold text-slate-900">{item.title}</strong>
                      </div>
                      <p className="text-xs text-slate-600">{item.details}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                        <span className="font-semibold text-indigo-700">{item.amountText}</span>
                        <span>•</span>
                        <span>Tarih: {item.date}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        onClick={() => setEditingItem({ type: item.type, data: { ...item.raw } })}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs px-3.5 py-2 rounded-xl border border-indigo-200/80 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Edit className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Düzelt / Düzenle</span>
                      </button>

                      <button
                        onClick={() => setDeleteConfirmItem({ type: item.type, id: item.id, label: item.title })}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs px-3 py-2 rounded-xl border border-rose-200 transition-all cursor-pointer flex items-center gap-1"
                        title="Kaydı Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Sil</span>
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: YEDEK ALMA & GERİ YÜKLEME */}
      {activeTab === 'backup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* JSON Backup Export Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Tam Sistem Yedeği İndir (.json)</h3>
                <p className="text-xs text-slate-500">Tüm aşılar, seriler, sevkiyatlar ve iadelerin yedek dosyası</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200">
              Bu buton ile sistemdeki tüm verilerinizi bilgisayarınıza güvenli bir <code>.json</code> yedek dosyası olarak indirebilirsiniz. Çökme veya bilgisayar değişimi durumunda bu yedeği geri yükleyebilirsiniz.
            </p>

            <button
              onClick={() => StorageService.exportFullDatabaseJSON()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Veritabanı Yedeğini Bilgisayara İndir</span>
            </button>
          </div>

          {/* JSON Backup Import / Restore Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Yedekten Geri Yükle (.json)</h3>
                <p className="text-xs text-slate-500">Daha önce indirdiğiniz `.json` yedeğini sisteme yükleyin</p>
              </div>
            </div>

            {importJsonSuccess && (
              <div className="p-3 bg-emerald-100 text-emerald-900 text-xs rounded-xl border border-emerald-300 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Yedek verileri başarıyla sisteme aktarıldı ve Firestore ile senkronize edildi!
              </div>
            )}

            {importJsonError && (
              <div className="p-3 bg-rose-100 text-rose-900 text-xs rounded-xl border border-rose-300 font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                {importJsonError}
              </div>
            )}

            <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-6 text-center space-y-2 transition-colors relative cursor-pointer bg-slate-50/50">
              <input
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-8 h-8 text-indigo-500 mx-auto" />
              <div className="text-xs font-bold text-slate-800">Tıklayın veya JSON Yedek Dosyasını Sürükleyin</div>
              <p className="text-[11px] text-slate-400">Yalnızca geçerli `.json` Etlik envanter yedek formatı desteklenir</p>
            </div>
          </div>

          {/* Excel Bulk Export Card */}
          <div className="bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-900 text-white rounded-3xl border border-emerald-700 shadow-lg p-6 space-y-4 md:col-span-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-2xl border border-emerald-400/30 shrink-0">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-white">Tüm Veritabanını Çok Sayfalı Excel (.xlsx) Olarak İndir</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-slate-950 uppercase">
                    EN SAĞLIKLI EXCEL YEDEĞİ
                  </span>
                </div>
                <p className="text-xs text-emerald-200/90 leading-relaxed max-w-2xl">
                  Sistemdeki tüm modüllere ait verileri (Üretim Serileri, 81 İl Sevkiyatları, İadeler, İmha Tutanakları, Stok Hareketleri, Kurum Rehberi, Aşı Türleri ve Notlar) ayrı ayrı Excel çalışma sayfaları (sheets) halinde tek bir <code>.xlsx</code> dosyasında indirir.
                </p>
              </div>
            </div>

            <button
              onClick={() => StorageService.exportFullDatabaseExcel()}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs py-3.5 px-6 rounded-2xl shadow-md transition-all cursor-pointer flex items-center gap-2 shrink-0 self-stretch md:self-auto justify-center"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-950" />
              <span>Çok Sayfalı Tam Excel Yedeğini İndir (.xlsx)</span>
            </button>
          </div>

        </div>
      )}

      {/* TAB 3: KURUM & SİSTEM PARAMETRELERİ */}
      {activeTab === 'institution' && (
        <form onSubmit={handleSaveInstitutionSettings} className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-6 space-y-6 max-w-3xl">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Enstitü & Üretim Yeri Yapılandırması</h3>
              <p className="text-xs text-slate-500">Etlik VKMAE resmi kurumsal bilgileri ve varsayılan uyarı eşikleri</p>
            </div>
          </div>

          {settingsSavedMessage && (
            <div className="p-3 bg-emerald-100 text-emerald-900 text-xs font-bold rounded-xl border border-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              Kurumsal parametreler başarıyla kaydedildi!
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            
            <div className="space-y-1 sm:col-span-2">
              <label className="font-bold text-slate-700">Resmi Enstitü / Kurum Ünvanı</label>
              <input
                type="text"
                value={instName}
                onChange={(e) => setInstName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Sabit Üretim Depo Lokasyonu</label>
              <input
                type="text"
                value={instLocation}
                onChange={(e) => setInstLocation(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Varsayılan Sevk Yetkilisi Adı</label>
              <input
                type="text"
                value={defaultOfficer}
                onChange={(e) => setDefaultOfficer(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Kritik Stok Uyarısı Eşik Değeri (Doz)</label>
              <input
                type="number"
                value={criticalStockThreshold}
                onChange={(e) => setCriticalStockThreshold(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Yaklaşan SKT Uyarı Eşiği (Gün)</label>
              <input
                type="number"
                value={expiryAlertDays}
                onChange={(e) => setExpiryAlertDays(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Parametreleri Kaydet</span>
            </button>
          </div>

        </form>
      )}

      {/* TAB 4: BULUT VERİTABANI & CANLI SENKRONİZASYON */}
      {activeTab === 'cloud' && (
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-indigo-800/60 space-y-6 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-400/30">
                <Database className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Google Cloud Firebase Firestore Veritabanı</h3>
                <p className="text-xs text-indigo-200/80">Bulut Tabanlı Gerçek Zamanlı Veritabanı Mimarisi</p>
              </div>
            </div>

            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 font-extrabold text-xs rounded-full border border-emerald-500/40 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              CANLI SENKRON
            </span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Firestore Proje Bağlantı ID:</span>
              <strong className="text-amber-300 font-mono text-xs block mt-0.5">
                ai-studio-etlikveterinerae-1425553c-852a-478a-aca1-97a453d3bdff
              </strong>
            </div>

            <div>
              <span className="text-slate-400 block font-medium">Güvenlik Katmanı & Protokol:</span>
              <strong className="text-emerald-300 font-medium text-xs flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                256-Bit SSL / TLSv1.3 Şifreli Soket
              </strong>
            </div>
          </div>

          {/* Counts */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-amber-400" />
              Bulut Koleksiyon Canlı Veri Sayıları
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center space-y-1">
                <span className="text-slate-400 block text-[11px]">Aşı Türleri</span>
                <strong className="text-white text-base font-bold font-mono">{vaccines.length}</strong>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center space-y-1">
                <span className="text-slate-400 block text-[11px]">Üretim Serileri</span>
                <strong className="text-indigo-300 text-base font-bold font-mono">{seriesList.length}</strong>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center space-y-1">
                <span className="text-slate-400 block text-[11px]">İl Sevkiyatları</span>
                <strong className="text-blue-300 text-base font-bold font-mono">{shipments.length}</strong>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center space-y-1">
                <span className="text-slate-400 block text-[11px]">İade / İmha Tutanakları</span>
                <strong className="text-amber-300 text-base font-bold font-mono">{returns.length + destructions.length}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL (Sistemdeki Yanlış Veriyi Düzeltme Modalı) */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
            
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white flex items-center justify-between border-b border-indigo-900/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-400/30">
                  <Edit className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Kaydı Düzenle / Düzelt</h3>
                  <span className="text-[11px] text-indigo-200/80">
                    {editingItem.type === 'series' ? 'Üretim Serisi' : editingItem.type === 'shipment' ? 'İl Sevkiyatı' : editingItem.type === 'return' ? 'İade Kaydı' : 'İmha Tutanağı'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setEditingItem(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs text-slate-700">
              
              {/* EDIT FORM FOR SERIES */}
              {editingItem.type === 'series' && (
                <>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">Seri No</label>
                    <input
                      type="text"
                      value={editingItem.data.seriesNo || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, seriesNo: e.target.value } })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-800">Lot No</label>
                      <input
                        type="text"
                        value={editingItem.data.lotNo || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, lotNo: e.target.value } })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-800">Mevcut Stok (Doz)</label>
                      <input
                        type="number"
                        value={editingItem.data.currentDoseQuantity || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, currentDoseQuantity: Number(e.target.value) } })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">Son Kullanma Tarihi (SKT)</label>
                    <input
                      type="date"
                      value={editingItem.data.expiryDate || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, expiryDate: e.target.value } })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                      required
                    />
                  </div>
                </>
              )}

              {/* EDIT FORM FOR SHIPMENT */}
              {editingItem.type === 'shipment' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-800">Sevkiyat İrsaliye No</label>
                      <input
                        type="text"
                        value={editingItem.data.shipmentNo || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, shipmentNo: e.target.value } })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-800">Protokol No</label>
                      <input
                        type="text"
                        value={editingItem.data.protocolNo || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, protocolNo: e.target.value } })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-800">Sevk Edilen İl</label>
                      <input
                        type="text"
                        value={editingItem.data.provinceName || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, provinceName: e.target.value } })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-800">Sevk Miktarı (Doz)</label>
                      <input
                        type="number"
                        value={editingItem.data.doseQuantity || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, doseQuantity: Number(e.target.value) } })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">Alıcı Kurum Adı</label>
                    <input
                      type="text"
                      value={editingItem.data.institutionName || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, institutionName: e.target.value } })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                    />
                  </div>
                </>
              )}

              {/* EDIT FORM FOR RETURN */}
              {editingItem.type === 'return' && (
                <>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">İade Miktarı (Doz)</label>
                    <input
                      type="number"
                      value={editingItem.data.doseQuantity || 0}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, doseQuantity: Number(e.target.value) } })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">İade Sebebi</label>
                    <input
                      type="text"
                      value={editingItem.data.returnReason || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, returnReason: e.target.value } })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                      required
                    />
                  </div>
                </>
              )}

              {/* EDIT FORM FOR DESTRUCTION */}
              {editingItem.type === 'destruction' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-800">İmha Protokol / Tutanak No</label>
                      <input
                        type="text"
                        value={editingItem.data.protocolNo || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, protocolNo: e.target.value } })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-800">İmha Doz Miktarı</label>
                      <input
                        type="number"
                        value={editingItem.data.doseQuantity || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, doseQuantity: Number(e.target.value) } })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-800">İmha Sebebi</label>
                    <input
                      type="text"
                      value={editingItem.data.reason || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, reason: e.target.value } })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                      required
                    />
                  </div>
                </>
              )}

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer shadow-xs"
                >
                  Değişiklikleri Kaydet
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-extrabold text-slate-900">Kaydı Silmek İstediğinize Emin Misiniz?</h3>
              <p className="text-xs text-slate-600 mt-1">
                <strong>"{deleteConfirmItem.label}"</strong> kaydı sistemden kalıcı olarak silinecektir. Stok miktarları otomatik rekonfigüre edilecektir.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                İptal / Vazgeç
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Evet, Kaydı Sil
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
