import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { AuditLog } from '../types';
import { History, Search, Download, ShieldCheck, Filter, RefreshCw, X, Calendar, User, FileText } from 'lucide-react';
import { exportFullSystemToExcel } from '../utils/excelExport';

export const AuditHistoryModule: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('Tümü');

  useEffect(() => {
    refreshLogs();
  }, []);

  const refreshLogs = () => {
    setLogs(StorageService.getAuditLogs());
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.user.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR')) ||
      log.action.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR')) ||
      log.details.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR'));

    if (!matchesSearch) return false;

    if (moduleFilter !== 'Tümü' && log.module !== moduleFilter) return false;

    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs shrink-0">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              Sistem İşlem Geçmişi & Denetim İzi (Audit Log)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Etlik VKMAE Aşı Dağıtım Sisteminde gerçekleştirilen tüm işlemler canlı kayıt altındadır.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={refreshLogs}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-full border border-slate-300 flex items-center gap-2 cursor-pointer transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Yenile</span>
          </button>

          <button
            onClick={exportFullSystemToExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-full shadow-2xs flex items-center gap-2 cursor-pointer transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Tüm Verileri Excel (.xlsx) İndir</span>
          </button>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-indigo-600" />
              İşlem Logu Filtreleme
            </span>
            {(moduleFilter !== 'Tümü' || searchQuery !== '') && (
              <button
                onClick={() => {
                  setModuleFilter('Tümü');
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
              placeholder="Kullanıcı, işlem türü veya detay ara..."
              className="w-full bg-slate-50 border border-slate-200 rounded-full pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Modül Filtresi</label>
            <select
              value={moduleFilter}
              onChange={e => setModuleFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 font-medium focus:outline-none focus:border-indigo-500"
            >
              <option value="Tümü">Tüm Modüller</option>
              <option value="Envanter">Envanter & Seri Kayıtları</option>
              <option value="Dağıtım">İl Dağıtımı & Sevkiyat</option>
              <option value="İade">İade & Karantina</option>
              <option value="İmha">İmha & Iskarta</option>
              <option value="Güvenlik">Güvenlik & Oturum</option>
            </select>
          </div>

          <div className="flex items-end justify-end">
            <div className="text-right text-xs text-slate-500 font-medium">
              Toplam <strong>{filteredLogs.length} kaydolmuş işlem</strong> listeleniyor.
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Zaman / Tarih</th>
                <th className="p-3.5">Yetkili Kullanıcı</th>
                <th className="p-3.5">Modül</th>
                <th className="p-3.5">Eylem / İşlem Türü</th>
                <th className="p-3.5">İşlem Detayları</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Henüz kayıtlı işlem logu bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-indigo-50/40 transition-colors">
                    <td className="p-3.5 font-mono text-slate-500 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                        {new Date(log.timestamp).toLocaleString('tr-TR')}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-900 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {log.user}
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {log.module}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-800 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="p-3.5 text-slate-700 font-medium">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
