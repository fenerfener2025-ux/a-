import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Package, Truck, Building2, MapPin, ArrowRight, ShieldCheck } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { SearchResultItem } from '../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItem: (item: SearchResultItem) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectItem
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent handles toggle
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (val.trim().length >= 2) {
      const res = StorageService.globalSearch(val);
      setResults(res);
    } else {
      setResults([]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-24 px-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Search Header Input */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50">
          <Search className="w-5 h-5 text-indigo-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleSearchChange}
            placeholder="Aşı adı, Seri No (örn: PPR-2026), İl, Kurum veya Sevkiyat No ara..."
            className="flex-1 bg-transparent border-none text-slate-800 placeholder-slate-400 focus:outline-none text-base font-medium"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]); }}
              className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block bg-slate-200 text-slate-600 text-xs px-2 py-1 rounded font-mono">
            ESC
          </kbd>
        </div>

        {/* Search Results Body */}
        <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100">
          {query.trim().length < 2 ? (
            <div className="py-12 text-center text-slate-400">
              <Search className="w-10 h-10 mx-auto mb-3 text-slate-300 stroke-[1.5]" />
              <p className="text-sm font-medium text-slate-600">Aramak için en az 2 karakter yazın</p>
              <p className="text-xs text-slate-400 mt-1">Örnekler: "PPR", "Ankara", "Şap", "06", "SAP-2026", "SVK-2026"</p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <X className="w-10 h-10 mx-auto mb-3 text-rose-300 stroke-[1.5]" />
              <p className="text-sm font-medium text-slate-600">"{query}" ile eşleşen sonuç bulunamadı</p>
              <p className="text-xs text-slate-400 mt-1">Lütfen farklı bir seri numarası, il adı veya aşı ismi deneyin.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
                Bulunan Sonuçlar ({results.length})
              </div>
              {results.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectItem(item);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-xl hover:bg-indigo-50/80 transition-colors flex items-center justify-between gap-3 group border border-transparent hover:border-indigo-200 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                      {item.category === 'Aşı' && <Package className="w-5 h-5" />}
                      {item.category === 'Seri / Lot' && <ShieldCheck className="w-5 h-5" />}
                      {item.category === 'İl' && <MapPin className="w-5 h-5" />}
                      {item.category === 'Kurum' && <Building2 className="w-5 h-5" />}
                      {item.category === 'Sevkiyat' && <Truck className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 group-hover:text-indigo-900 text-sm">
                          {item.title}
                        </span>
                        {item.badgeText && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                            {item.badgeText}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{item.subtitle}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between px-4">
          <span>Etlik Veteriner Akıllı Arama Motoru</span>
          <span className="text-slate-400">Sonuç üzerine tıklayarak ilgili dosyaya gidin</span>
        </div>

      </div>
    </div>
  );
};
