import * as XLSX from 'xlsx';
import { StorageService } from '../services/storageService';

export function exportFullSystemToExcel() {
  const vaccines = StorageService.getVaccines();
  const seriesList = StorageService.getSeries();
  const shipments = StorageService.getShipments();
  const returns = StorageService.getReturns();
  const destructions = StorageService.getDestructions();
  const auditLogs = StorageService.getAuditLogs();

  const wb = XLSX.utils.book_new();

  // 1. Aşı Envanteri ve Seri Stokları Sheet
  const seriesRows = seriesList.map((s, idx) => ({
    'Sıra No': idx + 1,
    'Aşı Ticari Adı': s.vaccineName,
    'Üretici Enstitü': 'Etlik VKMAE',
    'Seri Numarası': s.seriesNo,
    'Lot Numarası': s.lotNo,
    'Üretim Tarihi': s.productionDate,
    'Son Kullanma Tarihi (SKT)': s.expiryDate,
    'İlk Üretim Miktarı (Dozo)': s.initialDoseQuantity,
    'Mevcut Stok Miktarı (Dozo)': s.currentDoseQuantity,
    'Mevcut Flakon / Şişe': Math.ceil(s.currentDoseQuantity / 100),
    'Mevcut Sığır Dozu': Math.round(s.currentDoseQuantity / 2),
    'Dağıtılan Toplam Doz': s.distributedDoseQuantity,
    'İade Edilen Doz': s.returnedDoseQuantity,
    'İmha Edilen Doz': s.destroyedDoseQuantity,
    'Saklama Koşulları': s.storageConditions,
    'Stok Statüsü': s.status
  }));

  const wsSeries = XLSX.utils.json_to_sheet(seriesRows);
  XLSX.utils.book_append_sheet(wb, wsSeries, 'Aşı Envanteri & Stoklar');

  // 2. 81 İl Sevkiyat Kayıtları Sheet
  const shipmentRows = shipments.map((shp, idx) => ({
    'Sıra No': idx + 1,
    'Sevkiyat No': shp.shipmentNo,
    'Protokol No': shp.protocolNo,
    'Sevkiyat Tarihi': shp.date,
    'İl Adı': shp.provinceName,
    'İlçe Adı': shp.districtName,
    'Hedef Kurum / İl Müdürlüğü': shp.institutionName,
    'Aşı Ticari Adı': shp.vaccineName,
    'Seri No': shp.seriesNo,
    'Lot No': shp.lotNo,
    'Sevk Edilen Doz Miktarı': shp.doseQuantity,
    'Sevk Edilen Flakon Sayısı': shp.flakonQuantity,
    'Sevk Edilen Sığır Dozu': shp.sigirDoseQuantity,
    'İade Alınan Doz': shp.returnedDoseQuantity,
    'Sevk Eden Yetkili': shp.createdByName,
    'Kurye Notu / Açıklama': shp.courierNotes || '-',
    'Durum': shp.status
  }));

  const wsShipments = XLSX.utils.json_to_sheet(shipmentRows);
  XLSX.utils.book_append_sheet(wb, wsShipments, 'İl Sevkiyat Listesi');

  // 3. İl İade Kayıtları Sheet
  const returnRows = returns.map((ret, idx) => ({
    'Sıra No': idx + 1,
    'İade Protokol No': ret.returnNo,
    'İade Tarihi': ret.date,
    'İade Eden İl': ret.provinceName,
    'Kurum Adı': ret.institutionName,
    'Aşı Ticari Adı': ret.vaccineName,
    'Seri No': ret.seriesNo,
    'İade Doz Miktarı': ret.doseQuantity,
    'İade Gerekçesi': ret.returnReason,
    'İade Sonrası Statü': ret.returnStatus,
    'Kaydı Oluşturan Yetkili': ret.createdByName,
    'Notlar': ret.notes || '-'
  }));

  const wsReturns = XLSX.utils.json_to_sheet(returnRows);
  XLSX.utils.book_append_sheet(wb, wsReturns, 'İl İade Raporu');

  // 4. Aşı İmha Protokolleri Sheet
  const destructionRows = destructions.map((des, idx) => ({
    'Sıra No': idx + 1,
    'İmha Tutanak No': des.destructionNo,
    'Resmi Protokol No': des.protocolNo,
    'İmha Tarihi': des.date,
    'Aşı Ticari Adı': des.vaccineName,
    'Seri No': des.seriesNo,
    'Lot No': des.lotNo,
    'İmha Edilen Doz Miktarı': des.doseQuantity,
    'İmha Edilen Şişe Sayısı': Math.ceil(des.doseQuantity / 100),
    'İmha Gerekçesi': des.reason,
    'Protokol Durumu': des.status,
    'Onaylayan Komite / Yetkili': des.approvedByName || '-',
    'Açıklama / Tutanak Notları': des.notes || '-'
  }));

  const wsDestructions = XLSX.utils.json_to_sheet(destructionRows);
  XLSX.utils.book_append_sheet(wb, wsDestructions, 'İmha & Iskarta Tutanakları');

  // 5. İşlem & Denetim Geçmişi Sheet
  const auditRows = auditLogs.map((log, idx) => ({
    'Sıra No': idx + 1,
    'Tarih & Saat': new Date(log.timestamp).toLocaleString('tr-TR'),
    'Kullanıcı / Yetkili': log.user,
    'Sistem Modülü': log.module,
    'İşlem Türü': log.action,
    'İşlem Detayı / Açıklama': log.details
  }));

  const wsAudit = XLSX.utils.json_to_sheet(auditRows);
  XLSX.utils.book_append_sheet(wb, wsAudit, 'İşlem Geçmişi & Denetim İzi');

  // Write and Download Workbook
  const nowStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Etlik_VKMAE_Aasi_Envanter_ve_Dagitim_Raporu_${nowStr}.xlsx`);
}
