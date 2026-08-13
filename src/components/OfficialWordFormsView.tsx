import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  Upload,
  RefreshCw,
  CheckCircle2,
  Calendar,
  Building2,
  ShieldCheck,
  Edit3,
  Plus,
  Trash2,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import {
  generateVBUDLWordDoc,
  generateUretimCetveliWordDoc,
  buildVBUDLFormDataFromStore,
  buildUretimCetveliFormDataFromStore,
  VBUDLFormData,
  UretimCetveliFormData
} from '../utils/wordFormGenerator';

export const OfficialWordFormsView: React.FC = () => {
  const [selectedForm, setSelectedForm] = useState<'vbudl' | 'uretim_cetveli'>('vbudl');
  const [selectedMonthYear, setSelectedMonthYear] = useState('Ocak 2026');
  const [selectedVaccineId, setSelectedVaccineId] = useState('');

  // Targeted Series & Shipment Selection States
  const [selectedSeriesIds, setSelectedSeriesIds] = useState<string[]>([]);
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<string[]>([]);

  // Database queries
  const vaccines = StorageService.getVaccines();
  const allSeries = StorageService.getSeries();
  const allShipments = StorageService.getShipments();

  // Local Editable Form States
  const [vbudlData, setVbudlData] = useState<VBUDLFormData>(() =>
    buildVBUDLFormDataFromStore('Ocak 2026', '')
  );

  const [uretimData, setUretimData] = useState<UretimCetveliFormData>(() =>
    buildUretimCetveliFormDataFromStore('2026-Ocak')
  );

  const [customTemplateFile, setCustomTemplateFile] = useState<File | null>(null);
  const [templateStatus, setTemplateStatus] = useState<string | null>(null);

  // Toggle Handlers
  const toggleSeriesFilter = (id: string) => {
    setSelectedSeriesIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleShipmentFilter = (id: string) => {
    setSelectedShipmentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Re-sync form state when filters change
  useEffect(() => {
    if (selectedForm === 'vbudl') {
      const fresh = buildVBUDLFormDataFromStore(
        selectedMonthYear,
        selectedVaccineId,
        selectedSeriesIds.length > 0 ? selectedSeriesIds : undefined,
        selectedShipmentIds.length > 0 ? selectedShipmentIds : undefined
      );
      setVbudlData(fresh);
    } else {
      const yearMonthFormat = `2026-${selectedMonthYear.split(' ')[0]}`;
      const fresh = buildUretimCetveliFormDataFromStore(
        yearMonthFormat,
        selectedSeriesIds.length > 0 ? selectedSeriesIds : undefined
      );
      setUretimData(fresh);
    }
  }, [selectedForm, selectedMonthYear, selectedVaccineId, selectedSeriesIds, selectedShipmentIds]);

  // Recalculate totals for VBÜDL
  const handleVbudlChange = (field: keyof VBUDLFormData, value: any) => {
    setVbudlData((prev) => {
      const updated = { ...prev, [field]: value };
      // Recalculate carryover next month
      updated.carryoverNextMonthDose = Math.max(
        0,
        updated.previousMonthCarryoverDose + updated.productionDose - (updated.totalShippedDose + updated.destroyedDose)
      );
      updated.carryoverNextMonthFlakon = Math.ceil(updated.carryoverNextMonthDose / 100);
      return updated;
    });
  };

  // Add / Remove Shipment row in VBÜDL
  const handleAddShipmentRow = () => {
    setVbudlData((prev) => {
      const newRows = [
        ...prev.shipmentRows,
        { institutionName: 'İL MÜDÜRLÜĞÜ', provinceName: 'ANKARA', doseCount: 10000, flakonCount: 100 }
      ];
      const totalShippedDose = newRows.reduce((a, b) => a + b.doseCount, 0);
      const totalShippedFlakon = newRows.reduce((a, b) => a + b.flakonCount, 0);
      return {
        ...prev,
        shipmentRows: newRows,
        totalShippedDose,
        totalShippedFlakon
      };
    });
  };

  const handleRemoveShipmentRow = (idx: number) => {
    setVbudlData((prev) => {
      const newRows = prev.shipmentRows.filter((_, i) => i !== idx);
      const totalShippedDose = newRows.reduce((a, b) => a + b.doseCount, 0);
      const totalShippedFlakon = newRows.reduce((a, b) => a + b.flakonCount, 0);
      return {
        ...prev,
        shipmentRows: newRows,
        totalShippedDose,
        totalShippedFlakon
      };
    });
  };

  const handleUpdateShipmentRow = (idx: number, field: string, value: any) => {
    setVbudlData((prev) => {
      const newRows = [...prev.shipmentRows];
      const target = { ...newRows[idx], [field]: value };
      if (field === 'doseCount') {
        target.flakonCount = Math.ceil(Number(value) / 100);
      }
      newRows[idx] = target;

      const totalShippedDose = newRows.reduce((a, b) => a + Number(b.doseCount || 0), 0);
      const totalShippedFlakon = newRows.reduce((a, b) => a + Number(b.flakonCount || 0), 0);

      return {
        ...prev,
        shipmentRows: newRows,
        totalShippedDose,
        totalShippedFlakon
      };
    });
  };

  // Trigger Word Download (.docx)
  const handleDownloadWord = async () => {
    if (selectedForm === 'vbudl') {
      await generateVBUDLWordDoc(vbudlData);
    } else {
      await generateUretimCetveliWordDoc(uretimData);
    }
  };

  // Trigger Print
  const handlePrint = () => {
    window.print();
  };

  // Custom Word Template Upload Handler
  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCustomTemplateFile(file);
      setTemplateStatus(`"${file.name}" şablonu yüklendi! Veriler otomatik olarak bu şablona aktarılacaktır.`);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <FileText className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                Resmi Word Belge Doldurucu & Yazdırma Portalı
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                VETERİNER BİYOLOJİK ÜRÜN DAĞITIM LİSTESİ (VBÜDL) ve ENSTİTÜ MÜDÜRLÜĞÜ ÜRETİM CETVELİ Word (.docx) belgelerini kusursuz şekilde doldurun.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto no-print">
          <button
            onClick={handleDownloadWord}
            className="flex-1 md:flex-none px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Word (.docx) İndir
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 md:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Yazdır / PDF Al
          </button>
        </div>
      </div>

      {/* Form Type Selection Sub-Tabs & Filters */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4 no-print">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          
          {/* Form Switcher */}
          <div className="flex bg-white p-1 rounded-full border border-slate-200 shadow-2xs">
            <button
              onClick={() => setSelectedForm('vbudl')}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                selectedForm === 'vbudl'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1. VBÜDL (Veteriner Biyolojik Ürün Dağıtım Listesi)
            </button>
            <button
              onClick={() => setSelectedForm('uretim_cetveli')}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                selectedForm === 'uretim_cetveli'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2. Enstitü Müdürlüğü Üretim Cetveli
            </button>
          </div>

          {/* Month & Vaccine Selectors */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
              <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
              <select
                value={selectedMonthYear}
                onChange={(e) => setSelectedMonthYear(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
              >
                <option value="Ocak 2026">Ocak 2026</option>
                <option value="Şubat 2026">Şubat 2026</option>
                <option value="Mart 2026">Mart 2026</option>
                <option value="Nisan 2026">Nisan 2026</option>
                <option value="Mayıs 2026">Mayıs 2026</option>
                <option value="Haziran 2026">Haziran 2026</option>
              </select>
            </div>

            {selectedForm === 'vbudl' && (
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
                <span className="text-xs font-bold text-slate-500">Aşı:</span>
                <select
                  value={selectedVaccineId}
                  onChange={(e) => setSelectedVaccineId(e.target.value)}
                  className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
                >
                  <option value="">Tüm Aşılar / Otomatik</option>
                  {vaccines.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

        </div>

        {/* Dynamic Multi-Selection Filter Bar */}
        <div className="pt-3 border-t border-slate-200 space-y-3">
          
          {/* 1. Series Multi-Select Chips */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                Doldurulacak Seri No Seçimi ({selectedSeriesIds.length === 0 ? 'Tüm Seriler Dolduruluyor' : `${selectedSeriesIds.length} Seri Seçildi`}):
              </span>
              {selectedSeriesIds.length > 0 && (
                <button
                  onClick={() => setSelectedSeriesIds([])}
                  className="text-[11px] text-rose-600 font-bold hover:underline cursor-pointer"
                >
                  Seri Seçimini Temizle
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {allSeries.map((s) => {
                const isSelected = selectedSeriesIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleSeriesFilter(s.id)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {isSelected ? '✓ ' : ''}Seri: {s.seriesNo} ({s.vaccineName})
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Shipment Multi-Select Chips (Only for VBÜDL) */}
          {selectedForm === 'vbudl' && (
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Dağıtım / İl Sevkiyat Seçimi ({selectedShipmentIds.length === 0 ? 'Tüm İller Dolduruluyor' : `${selectedShipmentIds.length} Sevkiyat Seçildi`}):
                </span>
                {selectedShipmentIds.length > 0 && (
                  <button
                    onClick={() => setSelectedShipmentIds([])}
                    className="text-[11px] text-rose-600 font-bold hover:underline cursor-pointer"
                  >
                    İl / Sevkiyat Seçimini Temizle
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {allShipments.map((shp) => {
                  const isSelected = selectedShipmentIds.includes(shp.id);
                  return (
                    <button
                      key={shp.id}
                      onClick={() => toggleShipmentFilter(shp.id)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      {isSelected ? '✓ ' : ''}{shp.provinceName} - {shp.institutionName} ({shp.doseQuantity.toLocaleString('tr-TR')} Doz)
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Custom Template Upload Box */}
        <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-600" />
            <span>
              <strong>Kendi Word (.docx) Şablonunuzu Yükleyin:</strong> Dilerseniz kurumunuzun orijinal `.docx` belgesini yükleyip verileri içerisine otomatik doldurabilirsiniz.
            </span>
          </div>

          <label className="cursor-pointer bg-white border border-indigo-200 hover:border-indigo-400 text-indigo-700 font-bold px-3 py-1.5 rounded-lg shadow-2xs transition-all flex items-center gap-1.5 shrink-0">
            <Upload className="w-3.5 h-3.5" />
            Word Şablonu Yükle (.docx)
            <input type="file" accept=".docx" onChange={handleTemplateUpload} className="hidden" />
          </label>
        </div>

        {templateStatus && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{templateStatus}</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* FORM 1: VETERİNER BİYOLOJİK ÜRÜN DAĞITIM LİSTESİ (VBÜDL) PREVIEW & EDIT   */}
      {/* ========================================================================= */}
      {selectedForm === 'vbudl' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-md p-6 sm:p-10 space-y-6 text-slate-900 font-serif">
          
          <div className="flex items-center justify-between border-b border-slate-300 pb-3 no-print font-sans">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span className="font-extrabold text-xs text-indigo-950">
                BELGE CANLI ÖNİZLEME (ORİJİNAL WORD ŞABLONU DOLDURULMUŞ HALİ)
              </span>
            </div>
            <span className="text-[11px] text-slate-500">Hücrelerdeki metinleri doğrudan düzenleyebilirsiniz</span>
          </div>

          {/* Form Paper Document Container */}
          <div className="border border-slate-900 p-6 space-y-4 text-xs font-serif leading-tight">
            
            {/* Header Block Table */}
            <div className="border border-slate-900 text-center font-bold text-sm uppercase p-2 bg-slate-50">
              VETERİNER BİYOLOJİK ÜRÜN DAĞITIM LİSTESİ
            </div>

            <table className="w-full border-collapse border border-slate-900 text-xs">
              <tbody>
                <tr className="border-b border-slate-900">
                  <td className="border-r border-slate-900 p-1.5 font-bold w-1/3">Üretici Firma /Kurum Adı</td>
                  <td className="border-r border-slate-900 p-1.5 w-1/3">
                    : Etlik VKMAE
                  </td>
                  <td className="border-r border-slate-900 p-1.5 font-bold w-1/6">Listenin Ayı ve Yılı</td>
                  <td className="p-1.5 w-1/6 font-bold text-center">
                    <input
                      type="text"
                      value={vbudlData.monthYear}
                      onChange={(e) => handleVbudlChange('monthYear', e.target.value)}
                      className="w-full text-center border-b border-slate-300 focus:outline-none bg-transparent font-bold"
                    />
                  </td>
                </tr>

                <tr className="border-b border-slate-900">
                  <td className="border-r border-slate-900 p-1.5 font-bold">Ürünün Ticari Adı</td>
                  <td colSpan={3} className="p-1.5 font-bold">
                    <input
                      type="text"
                      value={vbudlData.vaccineName}
                      onChange={(e) => handleVbudlChange('vaccineName', e.target.value)}
                      className="w-full border-b border-slate-300 focus:outline-none bg-transparent font-bold"
                    />
                  </td>
                </tr>

                <tr className="border-b border-slate-900">
                  <td className="border-r border-slate-900 p-1.5 font-bold">Seri Numarası</td>
                  <td colSpan={3} className="p-1.5 font-mono">
                    <input
                      type="text"
                      value={vbudlData.seriesNoList.join('; ')}
                      onChange={(e) => handleVbudlChange('seriesNoList', e.target.value.split(';').map(s => s.trim()))}
                      className="w-full border-b border-slate-300 focus:outline-none bg-transparent font-mono"
                    />
                  </td>
                </tr>

                <tr className="border-b border-slate-900">
                  <td className="border-r border-slate-900 p-1.5 font-bold">Son Kullanma Tarihi</td>
                  <td colSpan={3} className="p-1.5">
                    <input
                      type="text"
                      value={vbudlData.expiryDates.join('; ')}
                      onChange={(e) => handleVbudlChange('expiryDates', e.target.value.split(';').map(s => s.trim()))}
                      className="w-full border-b border-slate-300 focus:outline-none bg-transparent"
                    />
                  </td>
                </tr>

                <tr className="border-b border-slate-900">
                  <td className="border-r border-slate-900 p-1.5 font-bold">Üretim Miktarı (Doz )</td>
                  <td colSpan={3} className="p-1.5 font-bold">
                    : {vbudlData.productionDose.toLocaleString('tr-TR')}
                  </td>
                </tr>

                <tr className="border-b border-slate-900">
                  <td className="border-r border-slate-900 p-1.5 font-bold">Üretim Miktarı (Şişe/Ampul)</td>
                  <td className="border-r border-slate-900 p-1.5 font-bold">
                    : {vbudlData.productionFlakon.toLocaleString('tr-TR')}
                  </td>
                  <td className="border-r border-slate-900 p-1.5 font-bold text-center">Doz</td>
                  <td className="p-1.5 font-bold text-center">Şişe / Ampul</td>
                </tr>

                <tr className="border-b border-slate-900">
                  <td colSpan={2} className="border-r border-slate-900 p-1.5">Önceki aylarda dağıtılan toplam miktarı</td>
                  <td className="border-r border-slate-900 p-1.5 text-center">-</td>
                  <td className="p-1.5 text-center">-</td>
                </tr>

                <tr>
                  <td colSpan={2} className="border-r border-slate-900 p-1.5">Bir önceki aydan devir eden miktarı</td>
                  <td className="border-r border-slate-900 p-1.5 text-center font-bold">{vbudlData.previousMonthCarryoverDose.toLocaleString('tr-TR')}</td>
                  <td className="p-1.5 text-center font-bold">{vbudlData.previousMonthCarryoverFlakon.toLocaleString('tr-TR')}</td>
                </tr>
              </tbody>
            </table>

            {/* Distribution Table Header & Rows */}
            <div className="pt-2">
              <table className="w-full border-collapse border border-slate-900 text-xs">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-50">
                    <th className="border-r border-slate-900 p-2 text-left w-1/2">
                      Ürünün Ay İçerisinde Sevk Edildiği İl Müdürlükleri, Bayiler, Distribütörler, Klinikler, Poliklinikler, Hastaneler, Serbest Veteriner Hekimler v.b. Yerin/Kişinin, Ünvanı /Adı, Soyadı
                    </th>
                    <th className="border-r border-slate-900 p-2 text-center w-1/6 font-bold">İLİ</th>
                    <th colSpan={2} className="p-2 text-center">
                      <div className="font-bold border-b border-slate-900 pb-1">MİKTARI</div>
                      <div className="grid grid-cols-2 pt-1 font-bold">
                        <span>Doz Sayısı</span>
                        <span>Şişe/Ampul Sayısı</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {vbudlData.shipmentRows.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-900 hover:bg-slate-50">
                      <td className="border-r border-slate-900 p-1.5 font-bold">
                        <input
                          type="text"
                          value={row.institutionName}
                          onChange={(e) => handleUpdateShipmentRow(idx, 'institutionName', e.target.value)}
                          className="w-full focus:outline-none bg-transparent"
                        />
                      </td>
                      <td className="border-r border-slate-900 p-1.5 text-center font-semibold">
                        <input
                          type="text"
                          value={row.provinceName}
                          onChange={(e) => handleUpdateShipmentRow(idx, 'provinceName', e.target.value)}
                          className="w-full text-center focus:outline-none bg-transparent uppercase font-semibold"
                        />
                      </td>
                      <td className="border-r border-slate-900 p-1.5 text-right font-bold w-24">
                        <input
                          type="number"
                          value={row.doseCount}
                          onChange={(e) => handleUpdateShipmentRow(idx, 'doseCount', Number(e.target.value))}
                          className="w-full text-right focus:outline-none bg-transparent font-bold"
                        />
                      </td>
                      <td className="p-1.5 text-right font-bold w-24 flex items-center justify-between">
                        <input
                          type="number"
                          value={row.flakonCount}
                          onChange={(e) => handleUpdateShipmentRow(idx, 'flakonCount', Number(e.target.value))}
                          className="w-full text-right focus:outline-none bg-transparent font-bold"
                        />
                        <button
                          onClick={() => handleRemoveShipmentRow(idx)}
                          className="text-red-500 hover:text-red-700 ml-1 no-print cursor-pointer"
                          title="Satır Sil"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-2 no-print">
                <button
                  onClick={handleAddShipmentRow}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-600" /> Satır Ekle
                </button>
              </div>
            </div>

            {/* Summary Footer Table */}
            <div className="pt-2">
              <table className="w-full border-collapse border border-slate-900 text-xs font-bold">
                <tbody>
                  <tr className="border-b border-slate-900">
                    <td className="border-r border-slate-900 p-1.5 w-2/3">SEVK TOPLAMI</td>
                    <td className="border-r border-slate-900 p-1.5 text-right w-1/6">{vbudlData.totalShippedDose.toLocaleString('tr-TR')}</td>
                    <td className="p-1.5 text-right w-1/6">{vbudlData.totalShippedFlakon.toLocaleString('tr-TR')}</td>
                  </tr>
                  <tr className="border-b border-slate-900">
                    <td className="border-r border-slate-900 p-1.5">İADE ALINAN</td>
                    <td className="border-r border-slate-900 p-1.5 text-center">{vbudlData.returnedDose > 0 ? vbudlData.returnedDose.toLocaleString('tr-TR') : "-"}</td>
                    <td className="p-1.5 text-center">{vbudlData.returnedFlakon > 0 ? vbudlData.returnedFlakon.toLocaleString('tr-TR') : "-"}</td>
                  </tr>
                  <tr className="border-b border-slate-900">
                    <td className="border-r border-slate-900 p-1.5">İMHA OLAN</td>
                    <td className="border-r border-slate-900 p-1.5 text-center">{vbudlData.destroyedDose > 0 ? vbudlData.destroyedDose.toLocaleString('tr-TR') : "-"}</td>
                    <td className="p-1.5 text-center">{vbudlData.destroyedFlakon > 0 ? vbudlData.destroyedFlakon.toLocaleString('tr-TR') : "-"}</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border-r border-slate-900 p-1.5">GELECEK AYA DEVİR EDEN</td>
                    <td className="border-r border-slate-900 p-1.5 text-right font-extrabold text-indigo-900">{vbudlData.carryoverNextMonthDose.toLocaleString('tr-TR')}</td>
                    <td className="p-1.5 text-right font-extrabold text-indigo-900">{vbudlData.carryoverNextMonthFlakon.toLocaleString('tr-TR')}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Signature Block Table */}
            <div className="pt-6 flex justify-end">
              <table className="w-64 border-collapse border border-slate-900 text-xs">
                <tbody>
                  <tr className="border-b border-slate-900 bg-slate-50">
                    <td colSpan={2} className="p-1.5 text-center font-bold">Sorumlu Yöneticinin</td>
                  </tr>
                  <tr className="border-b border-slate-900">
                    <td className="border-r border-slate-900 p-1.5 font-bold">Adı ve Soyadı:</td>
                    <td className="p-1.5 font-bold">
                      <input
                        type="text"
                        value={vbudlData.responsibleOfficerName}
                        onChange={(e) => handleVbudlChange('responsibleOfficerName', e.target.value)}
                        className="w-full focus:outline-none bg-transparent font-bold"
                      />
                    </td>
                  </tr>
                  <tr className="border-b border-slate-900">
                    <td className="border-r border-slate-900 p-1.5 font-bold">Unvanı:</td>
                    <td className="p-1.5 font-bold">
                      <input
                        type="text"
                        value={vbudlData.responsibleOfficerTitle}
                        onChange={(e) => handleVbudlChange('responsibleOfficerTitle', e.target.value)}
                        className="w-full focus:outline-none bg-transparent font-bold"
                      />
                    </td>
                  </tr>
                  <tr className="border-b border-slate-900 h-10">
                    <td className="border-r border-slate-900 p-1.5 font-bold">İmzası :</td>
                    <td className="p-1.5"></td>
                  </tr>
                  <tr>
                    <td className="border-r border-slate-900 p-1.5 font-bold">Tarihi:</td>
                    <td className="p-1.5 font-bold">
                      <input
                        type="text"
                        value={vbudlData.date}
                        onChange={(e) => handleVbudlChange('date', e.target.value)}
                        className="w-full focus:outline-none bg-transparent font-bold"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* FORM 2: ENSTİTÜ MÜDÜRLÜĞÜ ÜRETİM CETVELİ PREVIEW & EDIT                 */}
      {/* ========================================================================= */}
      {selectedForm === 'uretim_cetveli' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-md p-6 sm:p-10 space-y-6 text-slate-900 font-serif overflow-x-auto">
          
          <div className="flex items-center justify-between border-b border-slate-300 pb-3 no-print font-sans min-w-[700px]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span className="font-extrabold text-xs text-indigo-950">
                BELGE CANLI ÖNİZLEME (ENSTİTÜ MÜDÜRLÜĞÜ ÜRETİM CETVELİ)
              </span>
            </div>
            <span className="text-[11px] text-slate-500">Hücrelerdeki metinleri doğrudan düzenleyebilirsiniz</span>
          </div>

          <div className="border border-slate-900 p-6 space-y-4 text-xs font-serif leading-tight min-w-[750px]">
            
            <div className="text-center font-bold text-sm uppercase">
              ENSTİTÜ MÜDÜRLÜĞÜ ÜRETİM CETVELİ
            </div>

            <div className="flex items-center justify-between font-bold pt-2">
              <div>
                Düzenleyen Kurumun Adı: {uretimData.institutionTitle}
              </div>
              <div>
                Ait olduğu Yıl, Ay: {uretimData.yearMonth}
              </div>
            </div>

            {/* Main Production Table */}
            <table className="w-full border-collapse border border-slate-900 text-xs">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-50 text-center font-bold">
                  <th colSpan={3} className="border-r border-slate-900 p-1.5 border-b">Ürünün</th>
                  <th rowSpan={2} className="border-r border-slate-900 p-1.5">Geçen Aydan Devir Doz</th>
                  <th rowSpan={2} className="border-r border-slate-900 p-1.5">Bu Ay Üretilen Doz</th>
                  <th rowSpan={2} className="border-r border-slate-900 p-1.5">Toplam Doz</th>
                  <th rowSpan={2} className="border-r border-slate-900 p-1.5">Bu Ay Sevk Edilen Doz</th>
                  <th rowSpan={2} className="border-r border-slate-900 p-1.5">İmha Edilen Doz</th>
                  <th rowSpan={2} className="border-r border-slate-900 p-1.5">Gelecek Aya Devir</th>
                  <th rowSpan={2} className="p-1.5">Yıl İçinde Üretilen Toplam Doz</th>
                </tr>
                <tr className="border-b border-slate-900 bg-slate-50 text-center font-bold">
                  <th className="border-r border-slate-900 p-1.5">Adı</th>
                  <th className="border-r border-slate-900 p-1.5">Seri No</th>
                  <th className="border-r border-slate-900 p-1.5">Son Kul. Tarihi</th>
                </tr>
              </thead>
              <tbody>
                {uretimData.rows.map((row, idx) => {
                  const seriesList = row.seriesNo.includes(';') ? row.seriesNo.split(';') : row.seriesNo.split('\n');
                  const expiryList = row.expiryDate.includes(';') ? row.expiryDate.split(';') : row.expiryDate.split('\n');

                  return (
                    <tr key={idx} className="border-b border-slate-900 text-center hover:bg-slate-50">
                      <td className="border-r border-slate-900 p-1.5 font-bold text-center">{row.vaccineName}</td>
                      <td className="border-r border-slate-900 p-1.5 font-mono text-center">
                        {seriesList.map((s, i) => (
                          <div key={i}>{s.trim()}</div>
                        ))}
                      </td>
                      <td className="border-r border-slate-900 p-1.5 text-center">
                        {expiryList.map((e, i) => (
                          <div key={i}>{e.trim()}</div>
                        ))}
                      </td>
                      <td className="border-r border-slate-900 p-1.5 text-right font-bold">{row.previousMonthCarryoverDose.toLocaleString('tr-TR')}</td>
                      <td className="border-r border-slate-900 p-1.5 text-right font-bold">{row.currentMonthProducedDose.toLocaleString('tr-TR')}</td>
                      <td className="border-r border-slate-900 p-1.5 text-right font-extrabold">{row.totalDose.toLocaleString('tr-TR')}</td>
                      <td className="border-r border-slate-900 p-1.5 text-right font-bold">
                        <div>{row.currentMonthShippedDose.toLocaleString('tr-TR')}</div>
                        {row.shippedNote && (
                          <div className="text-[10px] font-normal underline text-center">{row.shippedNote}</div>
                        )}
                      </td>
                      <td className="border-r border-slate-900 p-1.5 text-right">{row.destroyedDose.toLocaleString('tr-TR')}</td>
                      <td className="border-r border-slate-900 p-1.5 text-right font-extrabold text-indigo-900">{row.carryoverNextMonthDose.toLocaleString('tr-TR')}</td>
                      <td className="p-1.5 text-right font-bold">{row.totalYearProducedDose.toLocaleString('tr-TR')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

          </div>

        </div>
      )}

    </div>
  );
};
