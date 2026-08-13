import * as XLSX from 'xlsx';
import {
  Vaccine, SeriesLot, Shipment, ReturnRecord, DestructionRecord, StockMovement,
  AuditLog, Institution, SearchResultItem, NoteItem, NoteCategory, NotePriority
} from '../types';
import {
  INITIAL_VACCINES, INITIAL_SERIES, INITIAL_SHIPMENTS,
  INITIAL_RETURNS, INITIAL_DESTRUCTIONS, INITIAL_MOVEMENTS, INITIAL_INSTITUTIONS
} from '../data/initialData';
import { TURKEY_PROVINCES } from '../data/turkeyData';
import { db } from '../lib/firebase';
import {
  collection, doc, setDoc, deleteDoc, getDocs, onSnapshot, writeBatch
} from 'firebase/firestore';

const STORAGE_KEYS = {
  VACCINES: 'etlik_vaccines_v1',
  SERIES: 'etlik_series_v1',
  SHIPMENTS: 'etlik_shipments_v1',
  RETURNS: 'etlik_returns_v1',
  DESTRUCTIONS: 'etlik_destructions_v1',
  MOVEMENTS: 'etlik_movements_v1',
  AUDIT_LOGS: 'etlik_audit_v1',
  INSTITUTIONS: 'etlik_institutions_v1',
  SETTINGS: 'etlik_settings_v1',
  NOTES: 'etlik_notes_v1',
};

// Unit Conversion Helpers
export function convertKoyunToFlakon(koyunDoses: number): number {
  return Math.ceil(koyunDoses / 100);
}

export function convertKoyunToSigir(koyunDoses: number): number {
  return Math.round(koyunDoses / 2);
}

export function formatDoseDisplay(koyunDoses: number): string {
  const flakon = convertKoyunToFlakon(koyunDoses);
  const sigir = convertKoyunToSigir(koyunDoses);
  return `${koyunDoses.toLocaleString('tr-TR')} Koyun Dozu (${flakon.toLocaleString('tr-TR')} Flakon / ${sigir.toLocaleString('tr-TR')} Sığır Dozu)`;
}

export function formatNumber(num: number): string {
  return num.toLocaleString('tr-TR');
}

export class StorageService {
  private static isInitialized = false;

  private static getItem<T>(key: string, fallback: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      console.error(`Error reading ${key} from localStorage:`, e);
      return fallback;
    }
  }

  private static setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error saving ${key} to localStorage:`, e);
    }
  }

  // Initialize Storage & Setup Real-time Firestore Sync
  public static initializeStorage(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Purge legacy mock data from local storage
    const purgeMockStorage = (key: string) => {
      const val = localStorage.getItem(key);
      if (val && (val.includes('vac-001') || val.includes('ser-001') || val.includes('shp-001') || val.includes('Pestivac'))) {
        localStorage.removeItem(key);
      }
    };
    Object.values(STORAGE_KEYS).forEach(purgeMockStorage);

    // Load clean initial state to localStorage
    if (!localStorage.getItem(STORAGE_KEYS.VACCINES)) {
      this.setItem(STORAGE_KEYS.VACCINES, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SERIES)) {
      this.setItem(STORAGE_KEYS.SERIES, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SHIPMENTS)) {
      this.setItem(STORAGE_KEYS.SHIPMENTS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.RETURNS)) {
      this.setItem(STORAGE_KEYS.RETURNS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.DESTRUCTIONS)) {
      this.setItem(STORAGE_KEYS.DESTRUCTIONS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.MOVEMENTS)) {
      this.setItem(STORAGE_KEYS.MOVEMENTS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.INSTITUTIONS)) {
      this.setItem(STORAGE_KEYS.INSTITUTIONS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.NOTES)) {
      const initialNotes: NoteItem[] = [
        {
          id: 'note-101',
          title: 'Şarbon Aşısı Seri 2025/3 SKT Kontrolü ve Numune Talebi',
          description: 'Etlik merkez depoda kalan 2025/3 serisi Şarbon aşılarının SKT yaklaşması sebebiyle kalite kontrol laboratuvarına numune gönderilecek.',
          category: 'Aşı SKT Uyarısı',
          priority: 'Yüksek',
          dueDate: '2026-08-20',
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdByName: 'Etlik Sevk Yetkilisi'
        },
        {
          id: 'note-102',
          title: 'TİGEM ve Numune Dağıtımları İrsaliye Onayı',
          description: 'TİGEM İşletmelerine sevk edilen 20.000 doz Şarbon aşısının teslim tutanaklarının il müdürlüklerinden teyidi alınacak.',
          category: 'Sevkiyat Planı',
          priority: 'Orta',
          dueDate: '2026-08-25',
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdByName: 'Etlik Sevk Yetkilisi'
        },
        {
          id: 'note-103',
          title: 'Gelecek Ay Üretim Cetveli ve Aşı Hammadde Tedariği',
          description: '2026 son çeyrek PPR ve Anthrax aşı imalatı için üretim cetvelleri Enstitü Müdürlüğü makam onayına sunulacak.',
          category: 'Üretim Görevi',
          priority: 'Yüksek',
          dueDate: '2026-09-01',
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdByName: 'Etlik Üretim Sorumlusu'
        }
      ];
      this.setItem(STORAGE_KEYS.NOTES, initialNotes);
    }

    // Subscribe to Firestore for live synchronization
    this.setupFirestoreSubscriptions();
    this.purgeOldMockDataFromFirestore();
  }

  private static async purgeOldMockDataFromFirestore() {
    try {
      const mockVaccineIds = ["vac-001", "vac-002", "vac-003", "vac-004", "vac-005", "vac-006"];
      const mockSeriesIds = ["ser-001", "ser-002", "ser-003", "ser-004", "ser-005"];
      const mockShipmentIds = ["shp-001", "shp-002", "shp-003", "shp-004", "shp-005", "shp-006"];
      const mockReturnIds = ["ret-001", "ret-002"];
      const mockDestructionIds = ["des-001", "des-002"];

      const batch = writeBatch(db);
      let count = 0;

      mockVaccineIds.forEach(id => { batch.delete(doc(db, 'vaccines', id)); count++; });
      mockSeriesIds.forEach(id => { batch.delete(doc(db, 'series', id)); count++; });
      mockShipmentIds.forEach(id => { batch.delete(doc(db, 'shipments', id)); count++; });
      mockReturnIds.forEach(id => { batch.delete(doc(db, 'returns', id)); count++; });
      mockDestructionIds.forEach(id => { batch.delete(doc(db, 'destructions', id)); count++; });

      if (count > 0) {
        await batch.commit();
      }
    } catch (err) {
      console.warn('Firestore mock cleanup notice:', err);
    }
  }

  private static setupFirestoreSubscriptions() {
    try {
      onSnapshot(collection(db, 'vaccines'), (snap) => {
        const items: Vaccine[] = [];
        snap.forEach(d => items.push(d.data() as Vaccine));
        this.setItem(STORAGE_KEYS.VACCINES, items);
      });

      onSnapshot(collection(db, 'series'), (snap) => {
        const items: SeriesLot[] = [];
        snap.forEach(d => items.push(d.data() as SeriesLot));
        this.setItem(STORAGE_KEYS.SERIES, items);
      });

      onSnapshot(collection(db, 'shipments'), (snap) => {
        const items: Shipment[] = [];
        snap.forEach(d => items.push(d.data() as Shipment));
        this.setItem(STORAGE_KEYS.SHIPMENTS, items);
      });

      onSnapshot(collection(db, 'returns'), (snap) => {
        const items: ReturnRecord[] = [];
        snap.forEach(d => items.push(d.data() as ReturnRecord));
        this.setItem(STORAGE_KEYS.RETURNS, items);
      });

      onSnapshot(collection(db, 'destructions'), (snap) => {
        const items: DestructionRecord[] = [];
        snap.forEach(d => items.push(d.data() as DestructionRecord));
        this.setItem(STORAGE_KEYS.DESTRUCTIONS, items);
      });

      onSnapshot(collection(db, 'notes'), (snap) => {
        const items: NoteItem[] = [];
        snap.forEach(d => items.push(d.data() as NoteItem));
        this.setItem(STORAGE_KEYS.NOTES, items);
      });
    } catch (err) {
      console.warn('Firestore subscription active in fallback mode:', err);
    }
  }

  public static resetToInitial(): void {
    localStorage.clear();
    this.initializeStorage();
  }

  // Getters
  public static getVaccines(): Vaccine[] {
    return this.getItem(STORAGE_KEYS.VACCINES, []);
  }

  public static getSeries(): SeriesLot[] {
    return this.getItem(STORAGE_KEYS.SERIES, []);
  }

  public static getShipments(): Shipment[] {
    return this.getItem(STORAGE_KEYS.SHIPMENTS, []);
  }

  public static getReturns(): ReturnRecord[] {
    return this.getItem(STORAGE_KEYS.RETURNS, []);
  }

  public static getDestructions(): DestructionRecord[] {
    return this.getItem(STORAGE_KEYS.DESTRUCTIONS, []);
  }

  public static getMovements(): StockMovement[] {
    return this.getItem(STORAGE_KEYS.MOVEMENTS, []);
  }

  public static getInstitutions(): Institution[] {
    return this.getItem(STORAGE_KEYS.INSTITUTIONS, []);
  }

  public static getAuditLogs(): AuditLog[] {
    return this.getItem(STORAGE_KEYS.AUDIT_LOGS, []);
  }

  // Add Log
  public static addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): void {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      ...log,
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString()
    };
    logs.unshift(newLog);
    this.setItem(STORAGE_KEYS.AUDIT_LOGS, logs.slice(0, 200));

    // Save to Firestore asynchronously
    setDoc(doc(db, 'audit_logs', newLog.id), newLog).catch(e => console.error('Firestore log error:', e));
  }

  // Save / Add Vaccine
  public static addVaccine(vacData: Omit<Vaccine, 'id' | 'createdAt'>): Vaccine {
    const vaccines = this.getVaccines();
    const newVac: Vaccine = {
      ...vacData,
      id: `vac-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    vaccines.unshift(newVac);
    this.setItem(STORAGE_KEYS.VACCINES, vaccines);

    // Write to Firestore
    setDoc(doc(db, 'vaccines', newVac.id), newVac).catch(e => console.error('Firestore addVaccine error:', e));

    this.addAuditLog({
      user: 'Sistem Kullanıcısı',
      action: 'Yeni Aşı Kaydı',
      module: 'Envanter',
      entityType: 'Aşı',
      entityId: newVac.id,
      details: `${newVac.name} aşısı sisteme eklendi.`
    });
    return newVac;
  }

  // Add New Series / Production
  public static addSeries(seriesData: Omit<SeriesLot, 'id' | 'createdAt' | 'currentDoseQuantity' | 'distributedDoseQuantity' | 'returnedDoseQuantity' | 'destroyedDoseQuantity' | 'status'> & { allowDuplicate?: boolean }): SeriesLot {
    const seriesList = this.getSeries();
    
    // Check duplicate series number
    const existing = seriesList.find(s => s.seriesNo.toLocaleUpperCase('tr-TR') === seriesData.seriesNo.toLocaleUpperCase('tr-TR'));
    if (existing && !seriesData.allowDuplicate) {
      throw new Error(`"${seriesData.seriesNo}" numaralı seri zaten kayıtlı!`);
    }

    const newSeries: SeriesLot = {
      ...seriesData,
      id: `ser-${Date.now()}`,
      currentDoseQuantity: seriesData.initialDoseQuantity,
      distributedDoseQuantity: 0,
      returnedDoseQuantity: 0,
      destroyedDoseQuantity: 0,
      status: 'Aktif',
      createdAt: new Date().toISOString()
    };

    seriesList.unshift(newSeries);
    this.setItem(STORAGE_KEYS.SERIES, seriesList);

    // Write to Firestore
    setDoc(doc(db, 'series', newSeries.id), newSeries).catch(e => console.error('Firestore addSeries error:', e));

    // Stock Movement Log
    this.addStockMovement({
      seriesId: newSeries.id,
      seriesNo: newSeries.seriesNo,
      vaccineName: newSeries.vaccineName,
      movementType: 'Üretim (Giriş)',
      beforeQuantity: 0,
      changeQuantity: newSeries.initialDoseQuantity,
      afterQuantity: newSeries.initialDoseQuantity,
      referenceNo: newSeries.seriesNo,
      description: `Etlik Üretim Depo Girişi: ${newSeries.seriesNo} (${formatDoseDisplay(newSeries.initialDoseQuantity)})`
    });

    this.addAuditLog({
      user: 'Sistem Kullanıcısı',
      action: 'Yeni Seri Üretim Girişi',
      module: 'Envanter',
      entityType: 'Seri/Lot',
      entityId: newSeries.id,
      details: `${newSeries.seriesNo} serisinden ${newSeries.initialDoseQuantity} doz üretim kaydı oluşturuldu.`
    });

    return newSeries;
  }

  // Add Shipment (İl Sevkiyatı)
  public static createShipment(shipmentData: {
    provinceCode: string;
    provinceName: string;
    districtName: string;
    institutionName: string;
    seriesId: string;
    doseQuantity: number;
    courierNotes?: string;
    createdByName: string;
  }): Shipment {
    const seriesList = this.getSeries();
    const series = seriesList.find(s => s.id === shipmentData.seriesId);
    if (!series) {
      throw new Error("Seçilen seri veritabanında bulunamadı.");
    }

    if (shipmentData.doseQuantity <= 0) {
      throw new Error("Gönderilecek doz miktarı 0'dan büyük olmalıdır.");
    }
    if (shipmentData.doseQuantity > series.currentDoseQuantity) {
      throw new Error(
        `STOK YETERSİZ! Stokta mevcut: ${series.currentDoseQuantity.toLocaleString('tr-TR')} doz. Talep edilen: ${shipmentData.doseQuantity.toLocaleString('tr-TR')} doz. Eksik Miktar: ${(shipmentData.doseQuantity - series.currentDoseQuantity).toLocaleString('tr-TR')} doz.`
      );
    }

    // Update Series Stock
    const beforeQty = series.currentDoseQuantity;
    series.currentDoseQuantity -= shipmentData.doseQuantity;
    series.distributedDoseQuantity += shipmentData.doseQuantity;
    if (series.currentDoseQuantity <= 10000) {
      series.status = 'Kritik Stok';
    }
    this.setItem(STORAGE_KEYS.SERIES, seriesList);

    // Write updated series to Firestore
    setDoc(doc(db, 'series', series.id), series).catch(e => console.error('Firestore update series stock error:', e));

    // Create Shipment Object
    const shipments = this.getShipments();
    const shipmentNo = `SVK-${new Date().getFullYear()}-${String(shipments.length + 101).padStart(4, '0')}`;
    const protocolNo = `PRT-${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`;

    const newShipment: Shipment = {
      id: `shp-${Date.now()}`,
      shipmentNo,
      protocolNo,
      date: new Date().toISOString().split('T')[0],
      country: "Türkiye",
      provinceCode: shipmentData.provinceCode,
      provinceName: shipmentData.provinceName,
      districtName: shipmentData.districtName,
      institutionId: `inst-${shipmentData.provinceCode}-${Date.now()}`,
      institutionName: shipmentData.institutionName,
      vaccineId: series.vaccineId,
      vaccineName: series.vaccineName,
      seriesId: series.id,
      seriesNo: series.seriesNo,
      lotNo: series.lotNo,
      doseQuantity: shipmentData.doseQuantity,
      flakonQuantity: convertKoyunToFlakon(shipmentData.doseQuantity),
      sigirDoseQuantity: convertKoyunToSigir(shipmentData.doseQuantity),
      returnedDoseQuantity: 0,
      courierNotes: shipmentData.courierNotes,
      createdByName: shipmentData.createdByName || "Etlik Sevk Yetkilisi",
      status: "Tamamlandı",
      createdAt: new Date().toISOString()
    };

    shipments.unshift(newShipment);
    this.setItem(STORAGE_KEYS.SHIPMENTS, shipments);

    // Write new shipment to Firestore
    setDoc(doc(db, 'shipments', newShipment.id), newShipment).catch(e => console.error('Firestore add shipment error:', e));

    this.ensureInstitution(newShipment.provinceCode, newShipment.provinceName, newShipment.districtName, newShipment.institutionName);

    this.addStockMovement({
      seriesId: series.id,
      seriesNo: series.seriesNo,
      vaccineName: series.vaccineName,
      movementType: 'İl Sevkiyatı (Çıkış)',
      beforeQuantity: beforeQty,
      changeQuantity: -shipmentData.doseQuantity,
      afterQuantity: series.currentDoseQuantity,
      referenceNo: shipmentNo,
      description: `${shipmentData.provinceName} (${shipmentData.institutionName}) Sevkiyatı - ${protocolNo}`
    });

    this.addAuditLog({
      user: shipmentData.createdByName || 'Sevk Sorumlusu',
      action: 'İl Sevkiyatı',
      module: 'Dağıtım',
      entityType: 'Sevkiyat',
      entityId: newShipment.id,
      details: `${shipmentData.provinceName} iline ${series.seriesNo} serisinden ${shipmentData.doseQuantity} doz sevk edildi.`
    });

    return newShipment;
  }

  // Create Return (İade)
  public static createReturn(returnData: {
    shipmentId: string;
    doseQuantity: number;
    returnReason: string;
    returnStatus: ReturnRecord['returnStatus'];
    createdByName: string;
    notes?: string;
  }): ReturnRecord {
    const shipments = this.getShipments();
    const shipment = shipments.find(s => s.id === returnData.shipmentId);
    if (!shipment) {
      throw new Error("Seçilen sevkiyat kaydı bulunamadı.");
    }

    const maxReturnable = shipment.doseQuantity - shipment.returnedDoseQuantity;
    if (returnData.doseQuantity <= 0) {
      throw new Error("İade miktarı 0'dan büyük olmalıdır.");
    }
    if (returnData.doseQuantity > maxReturnable) {
      throw new Error(
        `FAZLA İADE ENGELİ! Bu sevkiyattan en fazla ${maxReturnable.toLocaleString('tr-TR')} doz iade alınabilir. Girilen: ${returnData.doseQuantity.toLocaleString('tr-TR')} doz.`
      );
    }

    shipment.returnedDoseQuantity += returnData.doseQuantity;
    this.setItem(STORAGE_KEYS.SHIPMENTS, shipments);
    setDoc(doc(db, 'shipments', shipment.id), shipment).catch(e => console.error('Firestore update shipment error:', e));

    const seriesList = this.getSeries();
    const series = seriesList.find(s => s.id === shipment.seriesId);
    if (series) {
      series.returnedDoseQuantity += returnData.doseQuantity;
      if (returnData.returnStatus === 'Kullanılabilir Stok') {
        const before = series.currentDoseQuantity;
        series.currentDoseQuantity += returnData.doseQuantity;
        
        this.addStockMovement({
          seriesId: series.id,
          seriesNo: series.seriesNo,
          vaccineName: series.vaccineName,
          movementType: 'İade (Giriş)',
          beforeQuantity: before,
          changeQuantity: returnData.doseQuantity,
          afterQuantity: series.currentDoseQuantity,
          referenceNo: shipment.shipmentNo,
          description: `${shipment.provinceName} İadesi Stok Girişi - ${returnData.returnReason}`
        });
      }
      this.setItem(STORAGE_KEYS.SERIES, seriesList);
      setDoc(doc(db, 'series', series.id), series).catch(e => console.error('Firestore update series return error:', e));
    }

    const returns = this.getReturns();
    const returnNo = `IAD-${new Date().getFullYear()}-${String(returns.length + 1).padStart(4, '0')}`;
    const newReturn: ReturnRecord = {
      id: `ret-${Date.now()}`,
      returnNo,
      shipmentId: shipment.id,
      shipmentNo: shipment.shipmentNo,
      seriesId: shipment.seriesId,
      seriesNo: shipment.seriesNo,
      vaccineName: shipment.vaccineName,
      provinceName: shipment.provinceName,
      institutionName: shipment.institutionName,
      doseQuantity: returnData.doseQuantity,
      returnReason: returnData.returnReason,
      returnStatus: returnData.returnStatus,
      date: new Date().toISOString().split('T')[0],
      createdByName: returnData.createdByName || 'Sistem Kullanıcısı',
      notes: returnData.notes
    };

    returns.unshift(newReturn);
    this.setItem(STORAGE_KEYS.RETURNS, returns);
    setDoc(doc(db, 'returns', newReturn.id), newReturn).catch(e => console.error('Firestore add return error:', e));

    this.addAuditLog({
      user: returnData.createdByName,
      action: 'İade Kaydı',
      module: 'İade',
      entityType: 'İade',
      entityId: newReturn.id,
      details: `${shipment.provinceName} ilinden ${returnData.doseQuantity} doz iade alındı (${returnData.returnStatus}).`
    });

    return newReturn;
  }

  // Create Destruction (İmha)
  public static createDestruction(destructionData: {
    seriesId: string;
    doseQuantity: number;
    reason: DestructionRecord['reason'];
    protocolNo: string;
    notes?: string;
  }): DestructionRecord {
    const seriesList = this.getSeries();
    const series = seriesList.find(s => s.id === destructionData.seriesId);
    if (!series) {
      throw new Error("Seçilen seri bulunamadı.");
    }

    if (destructionData.doseQuantity <= 0) {
      throw new Error("İmha dozu 0'dan büyük olmalıdır.");
    }
    if (destructionData.doseQuantity > series.currentDoseQuantity) {
      throw new Error(
        `İmha edilecek miktar (${destructionData.doseQuantity.toLocaleString('tr-TR')}), mevcut stoktan (${series.currentDoseQuantity.toLocaleString('tr-TR')}) fazla olamaz!`
      );
    }

    const before = series.currentDoseQuantity;
    series.currentDoseQuantity -= destructionData.doseQuantity;
    series.destroyedDoseQuantity += destructionData.doseQuantity;
    this.setItem(STORAGE_KEYS.SERIES, seriesList);
    setDoc(doc(db, 'series', series.id), series).catch(e => console.error('Firestore update series destruction error:', e));

    const destructions = this.getDestructions();
    const destructionNo = `IMH-${new Date().getFullYear()}-${String(destructions.length + 1).padStart(4, '0')}`;

    const newDestruction: DestructionRecord = {
      id: `des-${Date.now()}`,
      destructionNo,
      seriesId: series.id,
      seriesNo: series.seriesNo,
      lotNo: series.lotNo,
      vaccineName: series.vaccineName,
      doseQuantity: destructionData.doseQuantity,
      reason: destructionData.reason,
      protocolNo: destructionData.protocolNo || `IMH-PRT-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'İmha Edildi',
      date: new Date().toISOString().split('T')[0],
      approvedByName: 'Enstitü Müdürü',
      notes: destructionData.notes
    };

    destructions.unshift(newDestruction);
    this.setItem(STORAGE_KEYS.DESTRUCTIONS, destructions);
    setDoc(doc(db, 'destructions', newDestruction.id), newDestruction).catch(e => console.error('Firestore add destruction error:', e));

    this.addStockMovement({
      seriesId: series.id,
      seriesNo: series.seriesNo,
      vaccineName: series.vaccineName,
      movementType: 'İmha (Çıkış)',
      beforeQuantity: before,
      changeQuantity: -destructionData.doseQuantity,
      afterQuantity: series.currentDoseQuantity,
      referenceNo: destructionNo,
      description: `Aşı İmha Kaydı: ${destructionData.reason} (${destructionData.protocolNo})`
    });

    this.addAuditLog({
      user: 'Enstitü Müdürü',
      action: 'Aşı İmha İşlemi',
      module: 'İmha',
      entityType: 'İmha',
      entityId: newDestruction.id,
      details: `${series.seriesNo} serisinden ${destructionData.doseQuantity} doz imha edildi.`
    });

    return newDestruction;
  }

  // UPDATE & DELETE METHODS FOR DATA CORRECTION (Düzeltme & Güncelleme Fonksiyonları)

  // 1. Update Vaccine Definition
  public static updateVaccine(vaccineId: string, updates: Partial<Vaccine>): Vaccine {
    const vaccines = this.getVaccines();
    const idx = vaccines.findIndex(v => v.id === vaccineId);
    if (idx === -1) throw new Error("Aşı bulunamadı.");

    const updated = { ...vaccines[idx], ...updates };
    vaccines[idx] = updated;
    this.setItem(STORAGE_KEYS.VACCINES, vaccines);
    setDoc(doc(db, 'vaccines', vaccineId), updated).catch(e => console.error(e));

    this.addAuditLog({
      user: 'Sistem Kullanıcısı',
      action: 'Aşı Bilgisi Güncellendi',
      module: 'Envanter',
      entityType: 'Aşı',
      entityId: vaccineId,
      details: `${updated.name} aşı tanımı güncellendi.`
    });
    return updated;
  }

  // 2. Delete Vaccine
  public static deleteVaccine(vaccineId: string): void {
    const vaccines = this.getVaccines();
    const vac = vaccines.find(v => v.id === vaccineId);
    const filtered = vaccines.filter(v => v.id !== vaccineId);
    this.setItem(STORAGE_KEYS.VACCINES, filtered);
    deleteDoc(doc(db, 'vaccines', vaccineId)).catch(e => console.error(e));

    this.addAuditLog({
      user: 'Sistem Kullanıcısı',
      action: 'Aşı Tanımı Silindi',
      module: 'Envanter',
      entityType: 'Aşı',
      entityId: vaccineId,
      details: `${vac?.name || vaccineId} aşı tanımı sistemden silindi.`
    });
  }

  // 3. Update Production Series / Lot
  public static updateSeries(seriesId: string, updates: Partial<SeriesLot>): SeriesLot {
    const seriesList = this.getSeries();
    const idx = seriesList.findIndex(s => s.id === seriesId);
    if (idx === -1) throw new Error("Güncellenecek seri bulunamadı.");

    const existing = seriesList[idx];
    const updated = { ...existing, ...updates };

    // Re-evaluate stock status if dose qty changed
    if (updated.currentDoseQuantity <= 0) {
      updated.status = 'Tükendi';
    } else if (updated.currentDoseQuantity <= 10000) {
      updated.status = 'Kritik Stok';
    } else if (updated.status === 'Tükendi' || updated.status === 'Kritik Stok') {
      updated.status = 'Aktif';
    }

    seriesList[idx] = updated;
    this.setItem(STORAGE_KEYS.SERIES, seriesList);
    setDoc(doc(db, 'series', seriesId), updated).catch(e => console.error(e));

    this.addAuditLog({
      user: 'Sistem Kullanıcısı',
      action: 'Seri Kaydı Güncellendi',
      module: 'Envanter',
      entityType: 'Seri/Lot',
      entityId: seriesId,
      details: `${updated.seriesNo} numaralı serinin verileri düzeltildi/güncellendi.`
    });
    return updated;
  }

  // 4. Delete Production Series / Lot
  public static deleteSeries(seriesId: string): void {
    const seriesList = this.getSeries();
    const target = seriesList.find(s => s.id === seriesId);
    if (!target) return;

    const filtered = seriesList.filter(s => s.id !== seriesId);
    this.setItem(STORAGE_KEYS.SERIES, filtered);
    deleteDoc(doc(db, 'series', seriesId)).catch(e => console.error(e));

    this.addAuditLog({
      user: 'Sistem Kullanıcısı',
      action: 'Seri Kaydı Silindi',
      module: 'Envanter',
      entityType: 'Seri/Lot',
      entityId: seriesId,
      details: `${target.seriesNo} numaralı seri kaydı silindi.`
    });
  }

  // 5. Update Shipment Record (Fix wrong quantity or institution)
  public static updateShipment(shipmentId: string, updates: Partial<Shipment>): Shipment {
    const shipments = this.getShipments();
    const idx = shipments.findIndex(s => s.id === shipmentId);
    if (idx === -1) throw new Error("Sevkiyat kaydı bulunamadı.");

    const existing = shipments[idx];
    const seriesList = this.getSeries();
    const seriesIdx = seriesList.findIndex(s => s.id === existing.seriesId);

    // If dose quantity changed, adjust series stock
    if (updates.doseQuantity !== undefined && updates.doseQuantity !== existing.doseQuantity && seriesIdx !== -1) {
      const diff = updates.doseQuantity - existing.doseQuantity; // Positive if increased, negative if decreased
      const series = seriesList[seriesIdx];

      if (diff > 0 && series.currentDoseQuantity < diff) {
        throw new Error(`Stok Yetersiz! Seride kalan stok: ${series.currentDoseQuantity.toLocaleString('tr-TR')} Doz`);
      }

      series.currentDoseQuantity -= diff;
      series.distributedDoseQuantity += diff;
      if (series.currentDoseQuantity <= 10000) series.status = 'Kritik Stok';
      else if (series.currentDoseQuantity > 10000 && series.status === 'Kritik Stok') series.status = 'Aktif';

      seriesList[seriesIdx] = series;
      this.setItem(STORAGE_KEYS.SERIES, seriesList);
      setDoc(doc(db, 'series', series.id), series).catch(e => console.error(e));
    }

    const updated: Shipment = {
      ...existing,
      ...updates,
      flakonQuantity: updates.doseQuantity ? convertKoyunToFlakon(updates.doseQuantity) : existing.flakonQuantity,
      sigirDoseQuantity: updates.doseQuantity ? convertKoyunToSigir(updates.doseQuantity) : existing.sigirDoseQuantity
    };

    shipments[idx] = updated;
    this.setItem(STORAGE_KEYS.SHIPMENTS, shipments);
    setDoc(doc(db, 'shipments', shipmentId), updated).catch(e => console.error(e));

    this.addAuditLog({
      user: 'Sevk Sorumlusu',
      action: 'Sevkiyat Kaydı Düzeltildi',
      module: 'Dağıtım',
      entityType: 'Sevkiyat',
      entityId: shipmentId,
      details: `${updated.shipmentNo} numaralı sevkiyat verisi düzeltildi.`
    });
    return updated;
  }

  // 6. Delete Shipment (Rollback stock to series)
  public static deleteShipment(shipmentId: string): void {
    const shipments = this.getShipments();
    const target = shipments.find(s => s.id === shipmentId);
    if (!target) return;

    // Rollback stock to series
    const seriesList = this.getSeries();
    const series = seriesList.find(s => s.id === target.seriesId);
    if (series) {
      const netDoseToRestore = target.doseQuantity - target.returnedDoseQuantity;
      series.currentDoseQuantity += netDoseToRestore;
      series.distributedDoseQuantity = Math.max(0, series.distributedDoseQuantity - target.doseQuantity);
      if (series.currentDoseQuantity > 10000 && series.status === 'Kritik Stok') series.status = 'Aktif';

      this.setItem(STORAGE_KEYS.SERIES, seriesList);
      setDoc(doc(db, 'series', series.id), series).catch(e => console.error(e));
    }

    const filtered = shipments.filter(s => s.id !== shipmentId);
    this.setItem(STORAGE_KEYS.SHIPMENTS, filtered);
    deleteDoc(doc(db, 'shipments', shipmentId)).catch(e => console.error(e));

    this.addAuditLog({
      user: 'Sevk Sorumlusu',
      action: 'Sevkiyat Kaydı İptal/Silindi',
      module: 'Dağıtım',
      entityType: 'Sevkiyat',
      entityId: shipmentId,
      details: `${target.shipmentNo} sevkiyatı silindi, ${target.doseQuantity} doz stok seriye iade edildi.`
    });
  }

  // 7. Update Return Record
  public static updateReturn(returnId: string, updates: Partial<ReturnRecord>): ReturnRecord {
    const returns = this.getReturns();
    const idx = returns.findIndex(r => r.id === returnId);
    if (idx === -1) throw new Error("İade kaydı bulunamadı.");

    const updated = { ...returns[idx], ...updates };
    returns[idx] = updated;
    this.setItem(STORAGE_KEYS.RETURNS, returns);
    setDoc(doc(db, 'returns', returnId), updated).catch(e => console.error(e));

    this.addAuditLog({
      user: 'Sistem Kullanıcısı',
      action: 'İade Kaydı Güncellendi',
      module: 'İade',
      entityType: 'İade',
      entityId: returnId,
      details: `${updated.returnNo} numaralı iade kaydı güncellendi.`
    });
    return updated;
  }

  // 8. Delete Return Record
  public static deleteReturn(returnId: string): void {
    const returns = this.getReturns();
    const target = returns.find(r => r.id === returnId);
    if (!target) return;

    // Rollback return stats if needed
    const shipments = this.getShipments();
    const shipment = shipments.find(s => s.id === target.shipmentId);
    if (shipment) {
      shipment.returnedDoseQuantity = Math.max(0, shipment.returnedDoseQuantity - target.doseQuantity);
      this.setItem(STORAGE_KEYS.SHIPMENTS, shipments);
      setDoc(doc(db, 'shipments', shipment.id), shipment).catch(e => console.error(e));
    }

    const filtered = returns.filter(r => r.id !== returnId);
    this.setItem(STORAGE_KEYS.RETURNS, filtered);
    deleteDoc(doc(db, 'returns', returnId)).catch(e => console.error(e));

    this.addAuditLog({
      user: 'Sistem Kullanıcısı',
      action: 'İade Kaydı Silindi',
      module: 'İade',
      entityType: 'İade',
      entityId: returnId,
      details: `${target.returnNo} numaralı iade kaydı silindi.`
    });
  }

  // 9. Update Destruction Record
  public static updateDestruction(destructionId: string, updates: Partial<DestructionRecord>): DestructionRecord {
    const destructions = this.getDestructions();
    const idx = destructions.findIndex(d => d.id === destructionId);
    if (idx === -1) throw new Error("İmha kaydı bulunamadı.");

    const updated = { ...destructions[idx], ...updates };
    destructions[idx] = updated;
    this.setItem(STORAGE_KEYS.DESTRUCTIONS, destructions);
    setDoc(doc(db, 'destructions', destructionId), updated).catch(e => console.error(e));

    this.addAuditLog({
      user: 'Enstitü Müdürü',
      action: 'İmha Kaydı Güncellendi',
      module: 'İmha',
      entityType: 'İmha',
      entityId: destructionId,
      details: `${updated.destructionNo} numaralı imha tutanağı güncellendi.`
    });
    return updated;
  }

  // 10. Delete Destruction Record (Rollback stock)
  public static deleteDestruction(destructionId: string): void {
    const destructions = this.getDestructions();
    const target = destructions.find(d => d.id === destructionId);
    if (!target) return;

    // Restore destroyed stock to series
    const seriesList = this.getSeries();
    const series = seriesList.find(s => s.id === target.seriesId);
    if (series) {
      series.currentDoseQuantity += target.doseQuantity;
      series.destroyedDoseQuantity = Math.max(0, series.destroyedDoseQuantity - target.doseQuantity);
      if (series.currentDoseQuantity > 0 && series.status === 'Tükendi') series.status = 'Aktif';

      this.setItem(STORAGE_KEYS.SERIES, seriesList);
      setDoc(doc(db, 'series', series.id), series).catch(e => console.error(e));
    }

    const filtered = destructions.filter(d => d.id !== destructionId);
    this.setItem(STORAGE_KEYS.DESTRUCTIONS, filtered);
    deleteDoc(doc(db, 'destructions', destructionId)).catch(e => console.error(e));

    this.addAuditLog({
      user: 'Enstitü Müdürü',
      action: 'İmha Kaydı Silindi',
      module: 'İmha',
      entityType: 'İmha',
      entityId: destructionId,
      details: `${target.destructionNo} tutanağı silindi, ${target.doseQuantity} doz stoğa geri eklendi.`
    });
  }

  // NOTES & REMINDERS (PLANNER) METHODS

  public static getNotes(): NoteItem[] {
    return this.getItem<NoteItem[]>(STORAGE_KEYS.NOTES, []);
  }

  public static saveNote(noteInput: Partial<NoteItem>): NoteItem {
    const notes = this.getNotes();
    let noteItem: NoteItem;

    if (noteInput.id) {
      const idx = notes.findIndex(n => n.id === noteInput.id);
      if (idx !== -1) {
        noteItem = {
          ...notes[idx],
          ...noteInput,
          updatedAt: new Date().toISOString()
        };
        notes[idx] = noteItem;
      } else {
        noteItem = {
          id: noteInput.id,
          title: noteInput.title || 'Yeni Not',
          description: noteInput.description || '',
          category: noteInput.category || 'Genel Not',
          priority: noteInput.priority || 'Orta',
          dueDate: noteInput.dueDate || new Date().toISOString().split('T')[0],
          completed: noteInput.completed || false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdByName: noteInput.createdByName || 'Etlik Sevk Yetkilisi'
        };
        notes.unshift(noteItem);
      }
    } else {
      noteItem = {
        id: `note-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        title: noteInput.title || 'Yeni Not',
        description: noteInput.description || '',
        category: noteInput.category || 'Genel Not',
        priority: noteInput.priority || 'Orta',
        dueDate: noteInput.dueDate || new Date().toISOString().split('T')[0],
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdByName: noteInput.createdByName || 'Etlik Sevk Yetkilisi'
      };
      notes.unshift(noteItem);
    }

    this.setItem(STORAGE_KEYS.NOTES, notes);
    setDoc(doc(db, 'notes', noteItem.id), noteItem).catch(e => console.error('Firestore save note error:', e));

    this.addAuditLog({
      user: 'Etlik Yetkilisi',
      action: 'Not / Hatırlatıcı Kaydedildi',
      module: 'Sistem',
      entityType: 'Not',
      entityId: noteItem.id,
      details: `"${noteItem.title}" başlıklı not kaydedildi.`
    });

    return noteItem;
  }

  public static deleteNote(id: string): void {
    const notes = this.getNotes();
    const filtered = notes.filter(n => n.id !== id);
    this.setItem(STORAGE_KEYS.NOTES, filtered);
    deleteDoc(doc(db, 'notes', id)).catch(e => console.error('Firestore delete note error:', e));

    this.addAuditLog({
      user: 'Etlik Yetkilisi',
      action: 'Not / Hatırlatıcı Silindi',
      module: 'Sistem',
      entityType: 'Not',
      entityId: id,
      details: `Not silindi.`
    });
  }

  public static toggleNoteCompletion(id: string): void {
    const notes = this.getNotes();
    const target = notes.find(n => n.id === id);
    if (!target) return;

    target.completed = !target.completed;
    target.updatedAt = new Date().toISOString();

    this.setItem(STORAGE_KEYS.NOTES, notes);
    setDoc(doc(db, 'notes', id), target).catch(e => console.error('Firestore toggle note error:', e));
  }

  // FULL DATABASE MULTI-SHEET EXCEL EXPORT & JSON BACKUP / RESTORE

  public static exportFullDatabaseExcel(): void {
    try {
      const workbook = XLSX.utils.book_new();

      // Sheet 1: Üretim Serileri
      const seriesData = this.getSeries().map(s => ({
        'Seri No': s.seriesNo,
        'Lot No': s.lotNo,
        'Aşı Adı': s.vaccineName,
        'Üretim Miktarı (Doz)': s.initialDoseQuantity,
        'Üretim (Flakon)': convertKoyunToFlakon(s.initialDoseQuantity),
        'Mevcut Stok (Doz)': s.currentDoseQuantity,
        'Mevcut Stok (Flakon)': convertKoyunToFlakon(s.currentDoseQuantity),
        'Dağıtılan Doz': s.distributedDoseQuantity,
        'İade Edilen Doz': s.returnedDoseQuantity,
        'İmha Edilen Doz': s.destroyedDoseQuantity,
        'Son Kullanma Tarihi (SKT)': s.expiryDate,
        'Depo Koşulları': s.storageConditions,
        'Durum': s.status
      }));
      const wsSeries = XLSX.utils.json_to_sheet(seriesData);
      XLSX.utils.book_append_sheet(workbook, wsSeries, 'Üretim Serileri');

      // Sheet 2: İl Sevkiyatları
      const shipmentsData = this.getShipments().map(shp => ({
        'Sevkiyat İrsaliye No': shp.shipmentNo,
        'Protokol No': shp.protocolNo,
        'Sevkiyat Tarihi': shp.date,
        'Sevk Edilen İl': shp.provinceName,
        'İl Kodu': shp.provinceCode,
        'Alıcı Kurum': shp.institutionName,
        'Aşı Adı': shp.vaccineName,
        'Seri No': shp.seriesNo,
        'Lot No': shp.lotNo,
        'Sevk Doz Miktarı': shp.doseQuantity,
        'Flakon Miktarı (100 doza 1)': shp.flakonQuantity,
        'Sığır Doz Karşılığı': shp.sigirDoseQuantity,
        'Kurye / Sürücü Notları': shp.courierNotes || '-',
        'Oluşturan Yetkili': shp.createdByName,
        'Sevkiyat Durumu': shp.status
      }));
      const wsShipments = XLSX.utils.json_to_sheet(shipmentsData);
      XLSX.utils.book_append_sheet(workbook, wsShipments, 'İl Sevkiyatları');

      // Sheet 3: İadeler
      const returnsData = this.getReturns().map(r => ({
        'İade İrsaliye No': r.returnNo,
        'Kaynak Sevkiyat No': r.shipmentNo,
        'İade Eden İl': r.provinceName,
        'Alıcı / İade Kurum': r.institutionName,
        'Aşı Adı': r.vaccineName,
        'Seri No': r.seriesNo,
        'İade Doz Miktarı': r.doseQuantity,
        'Flakon Karşılığı': convertKoyunToFlakon(r.doseQuantity),
        'İade Sebebi': r.returnReason,
        'Stok Durumu': r.returnStatus,
        'İade Tarihi': r.date,
        'Kayıt Eden': r.createdByName
      }));
      const wsReturns = XLSX.utils.json_to_sheet(returnsData);
      XLSX.utils.book_append_sheet(workbook, wsReturns, 'İl İadeleri');

      // Sheet 4: İmha Tutanakları
      const destructionsData = this.getDestructions().map(d => ({
        'İmha Kayıt No': d.destructionNo,
        'İmha Protokol / Tutanak No': d.protocolNo,
        'Aşı Adı': d.vaccineName,
        'Seri No': d.seriesNo,
        'Lot No': d.lotNo,
        'İmha Edilen Doz': d.doseQuantity,
        'Flakon Miktarı': convertKoyunToFlakon(d.doseQuantity),
        'İmha Gerekçesi': d.reason,
        'Tutanak Durumu': d.status,
        'İmha Tarihi': d.date,
        'Onaylayan Yetkili': d.approvedByName || '-'
      }));
      const wsDestructions = XLSX.utils.json_to_sheet(destructionsData);
      XLSX.utils.book_append_sheet(workbook, wsDestructions, 'İmha Tutanakları');

      // Sheet 5: Aşı Tanımları
      const vaccinesData = this.getVaccines().map(v => ({
        'Aşı ID': v.id,
        'Aşı Adı': v.name,
        'Üretici Enstitü': v.producer,
        'Aşı Tipi': v.type,
        'Kullanım Amacı': v.purpose,
        'Birim Tipi': v.unit,
        'Açıklama': v.description,
        'Aktif Durum': v.active ? 'Aktif' : 'Pasif'
      }));
      const wsVaccines = XLSX.utils.json_to_sheet(vaccinesData);
      XLSX.utils.book_append_sheet(workbook, wsVaccines, 'Aşı Türleri');

      // Sheet 6: Stok Hareket Kütüğü
      const movementsData = this.getMovements().map(m => ({
        'İşlem Tarihi': m.date,
        'Aşı Adı': m.vaccineName,
        'Seri No': m.seriesNo,
        'Hareket Türü': m.movementType,
        'Önceki Doz': m.beforeQuantity,
        'Miktar Değişimi': m.changeQuantity,
        'Sonraki Doz': m.afterQuantity,
        'Referans Belge No': m.referenceNo,
        'Açıklama': m.description
      }));
      const wsMovements = XLSX.utils.json_to_sheet(movementsData);
      XLSX.utils.book_append_sheet(workbook, wsMovements, 'Stok Hareket Kütüğü');

      // Sheet 7: Kurum Rehberi
      const institutionsData = this.getInstitutions().map(i => ({
        'Kurum ID': i.id,
        'İl Adı': i.provinceName,
        'İl Kodu': i.provinceCode,
        'İlçe Adı': i.districtName,
        'Kurum Ünvanı': i.name,
        'Kurum Tipi': i.type
      }));
      const wsInst = XLSX.utils.json_to_sheet(institutionsData);
      XLSX.utils.book_append_sheet(workbook, wsInst, 'Kurum Rehberi');

      // Sheet 8: Notlar & Hatırlatıcılar
      const notesData = this.getNotes().map(n => ({
        'Not Başlığı': n.title,
        'Açıklama': n.description,
        'Kategori': n.category,
        'Öncelik Derecesi': n.priority,
        'Hedef / Son Tarih': n.dueDate,
        'Tamamlandı mı': n.completed ? 'Evet' : 'Hayır',
        'Oluşturan': n.createdByName || 'Etlik Yetkilisi'
      }));
      const wsNotes = XLSX.utils.json_to_sheet(notesData);
      XLSX.utils.book_append_sheet(workbook, wsNotes, 'Notlar ve Planlar');

      // Generate & Download File
      const fileName = `Etlik_VKMAE_Tam_Veritabani_Yedegi_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error('Multi-sheet Excel Export Error:', err);
      alert('Excel yedekleme sırasında bir hata oluştu.');
    }
  }

  public static exportFullDatabaseJSON(): void {
    const backupData = {
      appName: 'Etlik VKMAE Aşı & Seri Yönetim Portalı',
      exportDate: new Date().toISOString(),
      vaccines: this.getVaccines(),
      series: this.getSeries(),
      shipments: this.getShipments(),
      returns: this.getReturns(),
      destructions: this.getDestructions(),
      movements: this.getMovements(),
      auditLogs: this.getAuditLogs(),
      institutions: this.getInstitutions(),
      notes: this.getNotes()
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Etlik_Asi_Envanter_Yedek_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  public static async importFullDatabaseJSON(jsonStr: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonStr);
      if (data.vaccines && Array.isArray(data.vaccines)) this.setItem(STORAGE_KEYS.VACCINES, data.vaccines);
      if (data.series && Array.isArray(data.series)) this.setItem(STORAGE_KEYS.SERIES, data.series);
      if (data.shipments && Array.isArray(data.shipments)) this.setItem(STORAGE_KEYS.SHIPMENTS, data.shipments);
      if (data.returns && Array.isArray(data.returns)) this.setItem(STORAGE_KEYS.RETURNS, data.returns);
      if (data.destructions && Array.isArray(data.destructions)) this.setItem(STORAGE_KEYS.DESTRUCTIONS, data.destructions);
      if (data.movements && Array.isArray(data.movements)) this.setItem(STORAGE_KEYS.MOVEMENTS, data.movements);
      if (data.institutions && Array.isArray(data.institutions)) this.setItem(STORAGE_KEYS.INSTITUTIONS, data.institutions);
      if (data.notes && Array.isArray(data.notes)) this.setItem(STORAGE_KEYS.NOTES, data.notes);

      // Sync to Firestore
      const syncColl = async (collName: string, items: any[]) => {
        if (!items) return;
        const batch = writeBatch(db);
        items.forEach(item => {
          if (item.id) {
            batch.set(doc(db, collName, item.id), item);
          }
        });
        await batch.commit().catch(e => console.error(e));
      };

      await syncColl('vaccines', data.vaccines || []);
      await syncColl('series', data.series || []);
      await syncColl('shipments', data.shipments || []);
      await syncColl('returns', data.returns || []);
      await syncColl('destructions', data.destructions || []);
      await syncColl('notes', data.notes || []);

      this.addAuditLog({
        user: 'Sistem Yöneticisi',
        action: 'Veritabanı Yedekten Geri Yüklendi',
        module: 'Sistem',
        entityType: 'Yedek',
        entityId: 'backup-import',
        details: 'JSON yedeği ile tüm veritabanı başarıyla güncellendi.'
      });

      return true;
    } catch (err) {
      console.error('JSON Restore Error:', err);
      throw new Error('Yüklenen JSON yedek dosyası geçersiz veya bozuk formatta!');
    }
  }

  public static async resetDatabaseToDefaults(): Promise<void> {
    localStorage.removeItem(STORAGE_KEYS.VACCINES);
    localStorage.removeItem(STORAGE_KEYS.SERIES);
    localStorage.removeItem(STORAGE_KEYS.SHIPMENTS);
    localStorage.removeItem(STORAGE_KEYS.RETURNS);
    localStorage.removeItem(STORAGE_KEYS.DESTRUCTIONS);
    localStorage.removeItem(STORAGE_KEYS.MOVEMENTS);
    localStorage.removeItem(STORAGE_KEYS.INSTITUTIONS);

    this.isInitialized = false;
    this.initializeStorage();
  }

  private static addStockMovement(mov: Omit<StockMovement, 'id' | 'date'>): void {
    const movements = this.getMovements();
    const newMov: StockMovement = {
      ...mov,
      id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    movements.unshift(newMov);
    this.setItem(STORAGE_KEYS.MOVEMENTS, movements);
    setDoc(doc(db, 'movements', newMov.id), newMov).catch(e => console.error('Firestore add movement error:', e));
  }

  private static ensureInstitution(provinceCode: string, provinceName: string, districtName: string, name: string) {
    const institutions = this.getInstitutions();
    const exists = institutions.some(i => i.name.toLocaleLowerCase('tr-TR') === name.toLocaleLowerCase('tr-TR') && i.provinceName === provinceName);
    if (!exists) {
      const inst: Institution = {
        id: `inst-${provinceCode}-${Date.now()}`,
        country: 'Türkiye',
        provinceCode,
        provinceName,
        districtName,
        name,
        type: name.includes('İlçe') ? 'İlçe Müdürlüğü' : name.includes('Enstitü') ? 'Enstitü' : 'İl Müdürlüğü',
        createdAt: new Date().toISOString()
      };
      institutions.push(inst);
      this.setItem(STORAGE_KEYS.INSTITUTIONS, institutions);
      setDoc(doc(db, 'institutions', inst.id), inst).catch(e => console.error('Firestore add institution error:', e));
    }
  }

  public static globalSearch(query: string): SearchResultItem[] {
    if (!query || query.trim().length < 2) return [];
    const q = query.trim().toLocaleLowerCase('tr-TR');
    const results: SearchResultItem[] = [];

    const vaccines = this.getVaccines();
    vaccines.forEach(v => {
      if (v.name.toLocaleLowerCase('tr-TR').includes(q) || v.type.toLocaleLowerCase('tr-TR').includes(q) || v.purpose.toLocaleLowerCase('tr-TR').includes(q)) {
        results.push({
          id: v.id,
          category: 'Aşı',
          title: v.name,
          subtitle: `${v.type} Aşı • ${v.producer}`,
          badgeText: v.unit,
          badgeColor: 'bg-indigo-100 text-indigo-800',
          targetView: 'inventory',
          actionData: v
        });
      }
    });

    const series = this.getSeries();
    series.forEach(s => {
      if (
        s.seriesNo.toLocaleLowerCase('tr-TR').includes(q) ||
        s.lotNo.toLocaleLowerCase('tr-TR').includes(q) ||
        s.vaccineName.toLocaleLowerCase('tr-TR').includes(q)
      ) {
        results.push({
          id: s.id,
          category: 'Seri / Lot',
          title: `${s.seriesNo} (${s.lotNo})`,
          subtitle: `${s.vaccineName} • Stok: ${s.currentDoseQuantity.toLocaleString('tr-TR')} Doz • SKT: ${s.expiryDate}`,
          badgeText: s.status,
          badgeColor: s.status === 'Aktif' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800',
          targetView: 'inventory',
          actionData: s
        });
      }
    });

    TURKEY_PROVINCES.forEach(p => {
      if (p.name.toLocaleLowerCase('tr-TR').includes(q) || p.code === q || p.region.toLocaleLowerCase('tr-TR').includes(q)) {
        results.push({
          id: `prov-${p.code}`,
          category: 'İl',
          title: `${p.code} - ${p.name}`,
          subtitle: `${p.region} Bölgesi • ${p.districts.length} İlçe`,
          badgeText: 'Türkiye İli',
          badgeColor: 'bg-indigo-100 text-indigo-800',
          targetView: 'distribution',
          actionData: p
        });
      }
    });

    const institutions = this.getInstitutions();
    institutions.forEach(inst => {
      if (inst.name.toLocaleLowerCase('tr-TR').includes(q) || inst.provinceName.toLocaleLowerCase('tr-TR').includes(q)) {
        results.push({
          id: inst.id,
          category: 'Kurum',
          title: inst.name,
          subtitle: `${inst.provinceName} / ${inst.districtName} • ${inst.type}`,
          badgeText: inst.provinceName,
          badgeColor: 'bg-purple-100 text-purple-800',
          targetView: 'distribution',
          actionData: inst
        });
      }
    });

    const shipments = this.getShipments();
    shipments.forEach(shp => {
      if (
        shp.shipmentNo.toLocaleLowerCase('tr-TR').includes(q) ||
        shp.protocolNo.toLocaleLowerCase('tr-TR').includes(q) ||
        shp.provinceName.toLocaleLowerCase('tr-TR').includes(q) ||
        shp.seriesNo.toLocaleLowerCase('tr-TR').includes(q)
      ) {
        results.push({
          id: shp.id,
          category: 'Sevkiyat',
          title: `${shp.shipmentNo} (${shp.protocolNo})`,
          subtitle: `${shp.provinceName} - ${shp.institutionName} • ${shp.doseQuantity.toLocaleString('tr-TR')} Doz (${shp.seriesNo})`,
          badgeText: shp.date,
          badgeColor: 'bg-indigo-100 text-indigo-800',
          targetView: 'distribution',
          actionData: shp
        });
      }
    });

    return results;
  }

  // Export Array Data to Quality Excel (.xlsx) File
  public static exportToExcel(data: any[], fileName: string, sheetName = 'Aşı Takip Verileri') {
    try {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error('Excel Export Error:', err);
    }
  }
}
