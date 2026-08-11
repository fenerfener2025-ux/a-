import * as XLSX from 'xlsx';
import {
  Vaccine, SeriesLot, Shipment, ReturnRecord, DestructionRecord, StockMovement,
  AuditLog, Institution, SearchResultItem
} from '../types';
import {
  INITIAL_VACCINES, INITIAL_SERIES, INITIAL_SHIPMENTS,
  INITIAL_RETURNS, INITIAL_DESTRUCTIONS, INITIAL_MOVEMENTS, INITIAL_INSTITUTIONS
} from '../data/initialData';
import { TURKEY_PROVINCES } from '../data/turkeyData';
import { db } from '../lib/firebase';
import {
  collection, doc, setDoc, getDocs, onSnapshot, writeBatch
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
