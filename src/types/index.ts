export type VaccineType = 'Viral' | 'Bakteriyel' | 'Paraziter' | 'Karma' | 'Diğer';

export type UnitType = 'Koyun Dozu' | 'Sığır Dozu' | 'Şişe/Flakon';

export interface Vaccine {
  id: string;
  name: string;
  producer: string; // e.g. "Etlik Veteriner Kontrol Merkez Araştırma Enstitüsü"
  type: VaccineType;
  purpose: string; // Usage purpose e.g. "PPR Hastalığına Karşı Koruyucu Aşı"
  unit: UnitType;
  description: string;
  active: boolean;
  createdAt: string;
}

export interface TechnicalValue {
  key: string;
  value: string;
  unit?: string;
}

export interface SeriesLot {
  id: string;
  vaccineId: string;
  vaccineName: string;
  seriesNo: string; // e.g. "PPR-2026-001"
  lotNo: string;    // e.g. "L-8821"
  productionDate: string; // ISO date YYYY-MM-DD
  expiryDate: string;     // SKT ISO date
  initialDoseQuantity: number; // Initial production in Koyun Dozu
  currentDoseQuantity: number; // Current available stock in Koyun Dozu
  distributedDoseQuantity: number; // Total distributed
  returnedDoseQuantity: number;    // Total returned
  destroyedDoseQuantity: number;   // Total destroyed
  storageConditions: string;       // e.g. "+2°C ile +8°C arasında karanlıkta"
  technicalValues: TechnicalValue[];
  notes?: string;
  status: 'Aktif' | 'Kritik Stok' | 'SKT Yaklaşan' | 'Tükendi' | 'Karantina' | 'İmha Edildi';
  createdAt: string;
}

export interface Province {
  code: string; // 01 to 81
  name: string;
  region: string; // İç Anadolu, Marmara, vb.
  districts: string[];
}

export interface Institution {
  id: string;
  country: string;
  provinceCode: string;
  provinceName: string;
  districtName: string;
  name: string; // e.g. "Ankara İl Tarım ve Orman Müdürlüğü"
  type: 'İl Müdürlüğü' | 'İlçe Müdürlüğü' | 'Enstitü' | 'Veteriner Birlikleri' | 'Diğer';
  createdAt: string;
}

export interface Shipment {
  id: string;
  shipmentNo: string;  // e.g. "SVK-2026-0042"
  protocolNo: string;  // e.g. "PRT-2026/812"
  date: string;
  country: string;
  provinceCode: string;
  provinceName: string;
  districtName: string;
  institutionId: string;
  institutionName: string;
  vaccineId: string;
  vaccineName: string;
  seriesId: string;
  seriesNo: string;
  lotNo: string;
  doseQuantity: number; // In Koyun Dozu
  flakonQuantity: number; // Calculated (1 Flakon = 100 Koyun Dozu)
  sigirDoseQuantity: number; // Calculated (100 Koyun = 50 Sığır)
  returnedDoseQuantity: number; // How much of this shipment was returned
  courierNotes?: string;
  createdByName: string;
  status: 'Tamamlandı' | 'Yolda' | 'İptal';
  createdAt: string;
}

export type ReturnStatus = 'Kullanılabilir Stok' | 'Karantina' | 'İnceleme' | 'İmha Bekliyor';

export interface ReturnRecord {
  id: string;
  returnNo: string; // e.g. "IAD-2026-0012"
  shipmentId: string;
  shipmentNo: string;
  seriesId: string;
  seriesNo: string;
  vaccineName: string;
  provinceName: string;
  institutionName: string;
  doseQuantity: number;
  returnReason: string;
  returnStatus: ReturnStatus;
  date: string;
  createdByName: string;
  notes?: string;
}

export type DestructionStatus = 'Taslak' | 'Onay Bekliyor' | 'Onaylandı' | 'İmha Edildi';

export interface DestructionRecord {
  id: string;
  destructionNo: string; // e.g. "IMH-2026-0005"
  seriesId: string;
  seriesNo: string;
  lotNo: string;
  vaccineName: string;
  doseQuantity: number;
  reason: 'SKT Doldu' | 'Soğuk Zincir Kırılması' | 'Ambalaj Hasarı' | 'Laboratuvar Iskarta' | 'Diğer';
  protocolNo: string;
  status: DestructionStatus;
  date: string;
  approvedByName?: string;
  notes?: string;
}

export interface StockMovement {
  id: string;
  date: string;
  seriesId: string;
  seriesNo: string;
  vaccineName: string;
  movementType: 'Üretim (Giriş)' | 'İl Sevkiyatı (Çıkış)' | 'İade (Giriş)' | 'İmha (Çıkış)' | 'Stok Düzeltme';
  beforeQuantity: number;
  changeQuantity: number; // positive or negative
  afterQuantity: number;
  referenceNo: string; // shipment, return or destruction ID/No
  description: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  module: 'Envanter' | 'Dağıtım' | 'İade' | 'İmha' | 'Güvenlik' | 'Sistem';
  entityType: string;
  entityId: string;
  details: string;
}

export interface SearchResultItem {
  id: string;
  category: 'Aşı' | 'Seri / Lot' | 'İl' | 'Kurum' | 'Sevkiyat' | 'İade / İmha';
  title: string;
  subtitle: string;
  badgeText?: string;
  badgeColor?: string;
  targetView: 'inventory' | 'distribution' | 'returns' | 'reports';
  actionData?: any;
}
