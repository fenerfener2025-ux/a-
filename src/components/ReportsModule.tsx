import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Printer,
  FileText,
  Download,
  Building2,
  Calendar,
  CheckCircle2,
  Layers,
  Truck,
  RotateCcw,
  ShieldAlert
} from 'lucide-react';
import { StorageService, convertKoyunToFlakon, convertKoyunToSigir } from '../services/storageService';
import { Shipment, SeriesLot, ReturnRecord, DestructionRecord } from '../types';
import { exportFullSystemToExcel } from '../utils/excelExport';
import {
  generateVBUDLWordDoc,
  generateUretimCetveliWordDoc,
  buildVBUDLFormDataFromStore,
  buildUretimCetveliFormDataFromStore
} from '../utils/wordFormGenerator';

export const ReportsModule: React.FC = () => {
  const [activeReportType, setActiveReportType] = useState<'inventory' | 'shipments' | 'returns' | 'destructions'>('shipments');
  const [selectedShipmentForPrint, setSelectedShipmentForPrint] = useState<Shipment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const seriesList = StorageService.getSeries();
  const shipments = StorageService.getShipments();
  const returns = StorageService.getReturns();
  const destructions = StorageService.getDestructions();

  const handleDownloadVbudlWord = async () => {
    const data = buildVBUDLFormDataFromStore('Ocak 2026', '');
    await generateVBUDLWordDoc(data);
  };

  const handleDownloadUretimCetveliWord = async () => {
    const data = buildUretimCetveliFormDataFromStore('2026-Ocak');
    await generateUretimCetveliWordDoc(data);
  };

  // Export to Excel (.xlsx) using xlsx library
  const handleExportExcel = () => {
    exportFullSystemToExcel();
  };

  // Trigger browser window.print()
  const handlePrintDocument = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
            Raporlama & Resmi Kurum Protokol Üretici
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            T.C. Tarım ve Orman Bakanlığı antetli resmi sevk, iade ve stok protokol raporları.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadVbudlWord}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            VBÜDL Word (.docx)
          </button>

          <button
            onClick={handleDownloadUretimCetveliWord}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            Üretim Cetveli Word (.docx)
          </button>

          <button
            onClick={handleExportExcel}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Excel İndir (.xlsx)
          </button>
        </div>
      </div>

      {/* Report Type Sub-Tabs & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex bg-slate-100 p-1 rounded-full w-fit border border-slate-200">
          <button
            onClick={() => setActiveReportType('shipments')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeReportType === 'shipments' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            İl Dağıtım Protokolleri
          </button>
          <button
            onClick={() => setActiveReportType('inventory')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeReportType === 'inventory' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Merkez Stok Envanteri
          </button>
          <button
            onClick={() => setActiveReportType('returns')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeReportType === 'returns' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            İade Raporları
          </button>
          <button
            onClick={() => setActiveReportType('destructions')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeReportType === 'destructions' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            İmha Tutanakları
          </button>
        </div>

        <div className="relative max-w-xs w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rapor veya protokol ara..."
            className="w-full bg-white border border-slate-200 rounded-full px-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Main Report Table & Official Document Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
        
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            {activeReportType === 'shipments' && 'Resmi İl Sevkiyat Protokol Belgeleri'}
            {activeReportType === 'inventory' && 'Etlik Veteriner Merkez Stok Envanteri'}
            {activeReportType === 'returns' && 'İl İade Tutanak Listesi'}
            {activeReportType === 'destructions' && 'Aşı İmha ve Iskarta Tutanakları'}
          </h3>
          <span className="text-xs text-slate-400">Herhangi bir kayda tıklayarak resmi antetli çıktısını alın</span>
        </div>

        {/* Shipments List to Print Official Document */}
        {activeReportType === 'shipments' && (
          <div className="space-y-3">
            {shipments.map(s => (
              <div
                key={s.id}
                className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between hover:border-emerald-300 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{s.shipmentNo}</span>
                    <span className="text-xs font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      {s.protocolNo}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    <strong>{s.provinceName}</strong> ({s.institutionName}) • {s.doseQuantity.toLocaleString('tr-TR')} Doz {s.vaccineName} ({s.seriesNo})
                  </p>
                </div>

                <button
                  onClick={() => setSelectedShipmentForPrint(s)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Resmi Yazıyı Görüntüle & Yazdır
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Inventory Report Table */}
        {activeReportType === 'inventory' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Seri No</th>
                  <th className="p-3">Aşı Adı</th>
                  <th className="p-3 text-right">İlk Üretim (Doz)</th>
                  <th className="p-3 text-right">Mevcut Stok (Doz)</th>
                  <th className="p-3 text-right">Flakon Sayısı</th>
                  <th className="p-3 text-right">Sığır Doz Karşılığı</th>
                  <th className="p-3 text-center">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {seriesList.map(s => (
                  <tr key={s.id}>
                    <td className="p-3 font-bold text-slate-900">{s.seriesNo}</td>
                    <td className="p-3 text-slate-700">{s.vaccineName}</td>
                    <td className="p-3 text-right">{s.initialDoseQuantity.toLocaleString('tr-TR')}</td>
                    <td className="p-3 text-right font-extrabold text-emerald-700">{s.currentDoseQuantity.toLocaleString('tr-TR')}</td>
                    <td className="p-3 text-right font-semibold">{convertKoyunToFlakon(s.currentDoseQuantity).toLocaleString('tr-TR')}</td>
                    <td className="p-3 text-right font-semibold">{convertKoyunToSigir(s.currentDoseQuantity).toLocaleString('tr-TR')}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* ================================================== */}
      {/* PRINT PREVIEW MODAL: T.C. ANTETLİ RESMİ ÜST YAZI  */}
      {/* ================================================== */}
      {selectedShipmentForPrint && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            
            {/* Modal Controls Bar */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
              <span className="font-bold text-xs text-emerald-400">
                RESMİ BELGE ÖNİZLEME (YAZDIRMAYA HAZIR)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintDocument}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Yazdır / PDF Olarak Kaydet
                </button>
                <button
                  onClick={() => setSelectedShipmentForPrint(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-lg"
                >
                  Kapat
                </button>
              </div>
            </div>

            {/* Official Paper Document Area (Antetli Yazı) */}
            <div id="official-document-paper" className="p-10 text-slate-900 font-serif space-y-6 bg-white leading-relaxed text-sm">
              
              {/* Header Crest & Ministry Title */}
              <div className="text-center space-y-1 border-b-2 border-slate-900 pb-4">
                <div className="font-bold text-base uppercase tracking-wider">
                  T.C. TARIM VE ORMAN BAKANLIĞI
                </div>
                <div className="font-bold text-sm uppercase">
                  ETLİK VETERİNER KONTROL MERKEZ ARAŞTIRMA ENSTİTÜSÜ MÜDÜRLÜĞÜ
                </div>
                <div className="text-xs font-sans text-slate-600">
                  Aşı Üretim, Kalite Kontrol ve Ulusal Dağıtım Başmüdürlüğü — ANKARA
                </div>
              </div>

              {/* Protocol Metadata */}
              <div className="flex items-start justify-between text-xs font-sans pt-2">
                <div>
                  <p><strong>Sayı:</strong> 81294812-730.02-{selectedShipmentForPrint.protocolNo}</p>
                  <p><strong>Konu:</strong> Aşı Sevkiyatı ve Teslimat Protokolü</p>
                </div>
                <div className="text-right">
                  <p><strong>Tarih:</strong> {selectedShipmentForPrint.date}</p>
                  <p><strong>Sevk Kodu:</strong> {selectedShipmentForPrint.shipmentNo}</p>
                </div>
              </div>

              {/* Target Address */}
              <div className="pt-4 text-center font-bold text-base uppercase">
                T.C. {selectedShipmentForPrint.provinceName.toUpperCase()} VALİLİĞİ<br />
                {selectedShipmentForPrint.institutionName.toUpperCase()} MÜDÜRLÜĞÜNE
              </div>

              {/* Body Text */}
              <p className="text-justify indent-8">
                Enstitümüz Aşı Üretim Tesislerinde üretilen ve kalite kontrol biyolojik testleri tamamlanan aşağıda dökümü yapılan aşı serisi, Bakanlığımız Hayvan Sağlığı Mücadele Programı kapsamında Müdürlüğünüze sevk edilmiştir.
              </p>

              {/* Vaccine Table */}
              <table className="w-full text-left text-xs font-sans border-collapse border border-slate-800 my-4">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-800 font-bold">
                    <th className="border border-slate-800 p-2">Aşı Adı</th>
                    <th className="border border-slate-800 p-2">Seri No / Lot</th>
                    <th className="border border-slate-800 p-2 text-right">Miktar (Koyun Dozu)</th>
                    <th className="border border-slate-800 p-2 text-right">Flakon Adedi</th>
                    <th className="border border-slate-800 p-2">SKT Tarihi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-800 p-2 font-semibold">{selectedShipmentForPrint.vaccineName}</td>
                    <td className="border border-slate-800 p-2">{selectedShipmentForPrint.seriesNo} ({selectedShipmentForPrint.lotNo})</td>
                    <td className="border border-slate-800 p-2 text-right font-bold">{selectedShipmentForPrint.doseQuantity.toLocaleString('tr-TR')} Doz</td>
                    <td className="border border-slate-800 p-2 text-right">{selectedShipmentForPrint.flakonQuantity.toLocaleString('tr-TR')} Flakon</td>
                    <td className="border border-slate-800 p-2">2027-01-15</td>
                  </tr>
                </tbody>
              </table>

              <p className="text-justify indent-8">
                Aşıların nakliyesi esnasında +2°C ile +8°C soğuk zincir muhafaza koşullarına riayet edilmiş olup, teslim esnasında soğuk zincir indikatörlerinin kontrol edilmesi ve aşıların derhal il soğuk hava deposuna aktarılması hususunda;
              </p>

              <p className="indent-8 font-semibold">
                Gereğini ve bilgilerinizi arz rica ederim.
              </p>

              {/* Signatures */}
              <div className="pt-12 grid grid-cols-2 text-center text-xs font-sans">
                <div>
                  <p className="font-bold">Teslim Eden</p>
                  <p className="mt-8 font-semibold">{selectedShipmentForPrint.createdByName}</p>
                  <p className="text-slate-500">Etlik Vet. Sevkiyat Amiri</p>
                </div>
                <div>
                  <p className="font-bold">Teslim Alan Kurum Yetkilisi</p>
                  <p className="mt-8 font-semibold">İmza / Mühür</p>
                  <p className="text-slate-500">{selectedShipmentForPrint.institutionName}</p>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
