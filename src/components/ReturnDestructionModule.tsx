import React, { useState } from 'react';
import {
  RotateCcw,
  ShieldAlert,
  Search,
  PlusCircle,
  X,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Info,
  Clock
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { ReturnRecord, DestructionRecord, ReturnStatus, DestructionRecord as DesType } from '../types';

export const ReturnDestructionModule: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'returns' | 'destructions'>('returns');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Tümü');
  const [reasonFilter, setReasonFilter] = useState<string>('Tümü');

  const [returns, setReturns] = useState<ReturnRecord[]>(StorageService.getReturns());
  const [destructions, setDestructions] = useState<DestructionRecord[]>(StorageService.getDestructions());
  const shipments = StorageService.getShipments();
  const seriesList = StorageService.getSeries();

  // Modals
  const [showNewReturnModal, setShowNewReturnModal] = useState(false);
  const [showNewDestructionModal, setShowNewDestructionModal] = useState(false);

  // Form State: New Return
  const [selectedShipmentId, setSelectedShipmentId] = useState(shipments[0]?.id || '');
  const [returnDoseQty, setReturnDoseQty] = useState<number>(1000);
  const [returnReason, setReturnReason] = useState('İlçe program değişikliği nedeniyle kullanılmayan fazla flakonlar');
  const [returnStatus, setReturnStatus] = useState<ReturnStatus>('Kullanılabilir Stok');
  const [returnCreatedBy, setReturnCreatedBy] = useState('İl Aşı Sorumlusu');
  const [returnNotes, setReturnNotes] = useState('Soğuk zincir indikatörü yeşil, ambalaj sağlam.');

  // Form State: New Destruction
  const [selectedSeriesId, setSelectedSeriesId] = useState(seriesList[0]?.id || '');
  const [destructionDoseQty, setDestructionDoseQty] = useState<number>(1000);
  const [destructionReason, setDestructionReason] = useState<DesType['reason']>('SKT Doldu');
  const [destructionProtocolNo, setDestructionProtocolNo] = useState(`IMH-PRT-${new Date().getFullYear()}/${Math.floor(10 + Math.random() * 90)}`);
  const [destructionNotes, setDestructionNotes] = useState('Nispi nem oranı yüksek ortamda bozulan flakonlar.');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshData = () => {
    setReturns(StorageService.getReturns());
    setDestructions(StorageService.getDestructions());
  };

  // Submit New Return
  const handleCreateReturn = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      StorageService.createReturn({
        shipmentId: selectedShipmentId,
        doseQuantity: Number(returnDoseQty),
        returnReason,
        returnStatus,
        createdByName: returnCreatedBy,
        notes: returnNotes
      });

      setShowNewReturnModal(false);
      refreshData();
      alert("İade Kaydı Başarıyla Oluşturuldu!");
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Submit New Destruction
  const handleCreateDestruction = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      StorageService.createDestruction({
        seriesId: selectedSeriesId,
        doseQuantity: Number(destructionDoseQty),
        reason: destructionReason,
        protocolNo: destructionProtocolNo,
        notes: destructionNotes
      });

      setShowNewDestructionModal(false);
      refreshData();
      alert("Aşı İmha Protokolü Başarıyla Oluşturuldu!");
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Filtered Returns
  const filteredReturns = returns.filter(r => {
    const matchesSearch =
      r.provinceName.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR')) ||
      r.returnNo.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR')) ||
      r.shipmentNo.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR')) ||
      r.vaccineName.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR')) ||
      r.returnReason.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR'));

    if (!matchesSearch) return false;

    if (statusFilter !== 'Tümü' && r.returnStatus !== statusFilter) return false;

    return true;
  });

  // Filtered Destructions
  const filteredDestructions = destructions.filter(d => {
    const matchesSearch =
      d.protocolNo.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR')) ||
      d.seriesNo.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR')) ||
      d.vaccineName.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR')) ||
      d.reason.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR'));

    if (!matchesSearch) return false;

    if (reasonFilter !== 'Tümü' && d.reason !== reasonFilter) return false;

    return true;
  });

  // Selected shipment info for Return Modal
  const currentShipment = shipments.find(s => s.id === selectedShipmentId);
  const maxReturnable = currentShipment ? (currentShipment.doseQuantity - currentShipment.returnedDoseQuantity) : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-indigo-600" />
            İl İadeleri & Aşı İmha (Iskarta) Yönetimi
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            İllerden geri gelen aşıların stok kontrolü, karantina takipleri ve imha protokolleri.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setErrorMessage(null); setShowNewReturnModal(true); }}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-4 py-2.5 rounded-full shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Yeni İade Kaydı
          </button>

          <button
            onClick={() => { setErrorMessage(null); setShowNewDestructionModal(true); }}
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-4 py-2.5 rounded-full shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" />
            Aşı İmha Kaydı
          </button>
        </div>
      </div>

      {/* Sub Tabs & Advanced Filter Bar */}
      <div className="space-y-4">
        <div className="flex bg-slate-100 p-1 rounded-full w-fit border border-slate-200">
          <button
            onClick={() => setActiveSubTab('returns')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'returns' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            İl İade Kayıtları ({filteredReturns.length})
          </button>
          <button
            onClick={() => setActiveSubTab('destructions')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'destructions' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            İmha & Iskarta Protokolleri ({filteredDestructions.length})
          </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-indigo-600" />
                Gelişmiş İade / İmha Filtreleme
              </span>
              {(statusFilter !== 'Tümü' || reasonFilter !== 'Tümü' || searchQuery !== '') && (
                <button
                  onClick={() => {
                    setStatusFilter('Tümü');
                    setReasonFilter('Tümü');
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
                placeholder="İl, aşı adı, seri veya protokol no ara..."
                className="w-full bg-slate-50 border border-slate-200 rounded-full pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
            {activeSubTab === 'returns' ? (
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">İade Sonrası Stok Statüsü</label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 font-medium focus:outline-none focus:border-indigo-500"
                >
                  <option value="Tümü">Tüm Statüler</option>
                  <option value="Kullanılabilir Stok">Kullanılabilir Stok (Tekrar Sevk Edilebilir)</option>
                  <option value="Karantina">Karantina Kontrolü</option>
                  <option value="İmha Edilecek">İmha Edilecek (Iskarta)</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">İmha Nedeni</label>
                <select
                  value={reasonFilter}
                  onChange={e => setReasonFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 font-medium focus:outline-none focus:border-indigo-500"
                >
                  <option value="Tümü">Tüm İmha Nedenleri</option>
                  <option value="SKT Doldu">Son Kullanma Tarihi Doldu</option>
                  <option value="Soğuk Zincir Kırılımı">Soğuk Zincir Kırılımı</option>
                  <option value="Fiziksel Hasar / Sızıntı">Fiziksel Hasar / Sızıntı</option>
                  <option value="Kalite Test Başarısızlığı">Kalite Test Başarısızlığı</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Returns List */}
      {activeSubTab === 'returns' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">İade No / Sevk No</th>
                  <th className="p-3.5">İade Eden İl & Kurum</th>
                  <th className="p-3.5">Aşı & Seri No</th>
                  <th className="p-3.5 text-right">İade Dozu</th>
                  <th className="p-3.5">İade Nedeni</th>
                  <th className="p-3.5 text-center">İade Sonrası Durum</th>
                  <th className="p-3.5 text-center">Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReturns.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">
                      {r.returnNo}
                      <div className="text-[10px] text-slate-400 font-normal">{r.shipmentNo}</div>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800">
                      {r.provinceName}
                      <div className="text-[10px] text-slate-500 font-normal">{r.institutionName}</div>
                    </td>
                    <td className="p-3.5 font-medium text-slate-700">
                      {r.vaccineName}
                      <div className="text-[10px] text-slate-500 font-mono">{r.seriesNo}</div>
                    </td>
                    <td className="p-3.5 text-right font-bold text-amber-700">
                      {r.doseQuantity.toLocaleString('tr-TR')} Doz
                    </td>
                    <td className="p-3.5 text-slate-600 max-w-xs truncate">{r.returnReason}</td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        r.returnStatus === 'Kullanılabilir Stok' ? 'bg-emerald-100 text-emerald-800' :
                        r.returnStatus === 'Karantina' ? 'bg-amber-100 text-amber-800' :
                        r.returnStatus === 'İmha Bekliyor' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {r.returnStatus}
                      </span>
                    </td>
                    <td className="p-3.5 text-center text-slate-500 font-mono">{r.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Destructions List */}
      {activeSubTab === 'destructions' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">İmha No / Protokol No</th>
                  <th className="p-3.5">Aşı & Seri No</th>
                  <th className="p-3.5 text-right">İmha Edilen Doz</th>
                  <th className="p-3.5">Gerekçe</th>
                  <th className="p-3.5 text-center">Onay Durumu</th>
                  <th className="p-3.5 text-center">Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDestructions.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">
                      {d.destructionNo}
                      <div className="text-[10px] text-slate-400 font-normal">{d.protocolNo}</div>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800">
                      {d.vaccineName}
                      <div className="text-[10px] text-slate-500 font-mono">{d.seriesNo} ({d.lotNo})</div>
                    </td>
                    <td className="p-3.5 text-right font-extrabold text-rose-700">
                      {d.doseQuantity.toLocaleString('tr-TR')} Doz
                    </td>
                    <td className="p-3.5 text-slate-700 font-medium">{d.reason}</td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        d.status === 'İmha Edildi' ? 'bg-rose-100 text-rose-800' :
                        d.status === 'Onay Bekliyor' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-center text-slate-500 font-mono">{d.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* MODAL: YENİ İADE KAYDI FORMU             */}
      {/* ======================================= */}
      {showNewReturnModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-amber-800 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <RotateCcw className="w-5 h-5" />
                İl Aşı İade Kaydı
              </h3>
              <button onClick={() => setShowNewReturnModal(false)} className="text-amber-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="m-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreateReturn} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  İade Alınan Sevkiyat
                </label>
                <select
                  value={selectedShipmentId}
                  onChange={e => setSelectedShipmentId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                >
                  {shipments.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.shipmentNo} ({s.provinceName}) - {s.vaccineName} ({s.seriesNo})
                    </option>
                  ))}
                </select>
              </div>

              {currentShipment && (
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900 flex items-center justify-between">
                  <span>Bu sevkiyattan kalan maksimum iade edilebilir:</span>
                  <strong className="text-sm font-extrabold">{maxReturnable.toLocaleString('tr-TR')} Doz</strong>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-800 mb-1">İade Dozu (Koyun Dozu)</label>
                <input
                  type="number"
                  required
                  step="100"
                  min="100"
                  max={maxReturnable}
                  value={returnDoseQty}
                  onChange={e => setReturnDoseQty(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">İade Nedeni</label>
                <input
                  type="text"
                  required
                  value={returnReason}
                  onChange={e => setReturnReason(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">İade Sonrası Stok Durumu</label>
                <select
                  value={returnStatus}
                  onChange={e => setReturnStatus(e.target.value as ReturnStatus)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-semibold text-slate-900 focus:outline-none focus:border-amber-500"
                >
                  <option value="Kullanılabilir Stok">Kullanılabilir Stok (Tekrar Merkez Stoğa Eklenir)</option>
                  <option value="Karantina">Karantina (Laboratuvar Testi Bekliyor)</option>
                  <option value="İnceleme">İnceleme</option>
                  <option value="İmha Bekliyor">İmha Bekliyor (Depoya Eklenmez)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewReturnModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow"
                >
                  İade Kaydını Onayla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* MODAL: AŞI İMHA KAYDI FORMU             */}
      {/* ======================================= */}
      {showNewDestructionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-rose-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                Resmi Aşı İmha Tutanağı
              </h3>
              <button onClick={() => setShowNewDestructionModal(false)} className="text-rose-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="m-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreateDestruction} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  İmha Edilecek Seri / Lot
                </label>
                <select
                  value={selectedSeriesId}
                  onChange={e => setSelectedSeriesId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-rose-500"
                >
                  {seriesList.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.seriesNo} ({s.vaccineName}) • Kalan Stok: {s.currentDoseQuantity.toLocaleString('tr-TR')} Doz
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">İmha Dozu (Koyun Dozu)</label>
                <input
                  type="number"
                  required
                  step="100"
                  min="100"
                  value={destructionDoseQty}
                  onChange={e => setDestructionDoseQty(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">İmha Gerekçesi</label>
                <select
                  value={destructionReason}
                  onChange={e => setDestructionReason(e.target.value as DesType['reason'])}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-900 font-semibold focus:outline-none focus:border-rose-500"
                >
                  <option value="SKT Doldu">SKT Doldu (Kullanım Süresi Bitti)</option>
                  <option value="Soğuk Zincir Kırılması">Soğuk Zincir Kırılması (+8°C Üstü Sıcaklık)</option>
                  <option value="Ambalaj Hasarı">Ambalaj / Flakon Kırılması</option>
                  <option value="Laboratuvar Iskarta">Laboratuvar Kalite Kontrol Iskarta</option>
                  <option value="Diğer">Diğer Teknik Nedenler</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Resmi Protokol No</label>
                <input
                  type="text"
                  required
                  value={destructionProtocolNo}
                  onChange={e => setDestructionProtocolNo(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewDestructionModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow"
                >
                  İmha Protokolünü Onayla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
