import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  AlertTriangle,
  Search,
  Filter,
  Trash2,
  Edit3,
  Bookmark,
  Bell,
  Sparkles,
  FileSpreadsheet,
  Check,
  X,
  Tag,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { StorageService, formatNumber } from '../services/storageService';
import { NoteItem, NoteCategory, NotePriority, SeriesLot } from '../types';

export const NotesPlannerModule: React.FC = () => {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // New/Edit Note Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<NoteCategory>('Genel Not');
  const [formPriority, setFormPriority] = useState<NotePriority>('Orta');
  const [formDueDate, setFormDueDate] = useState<string>(
    new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]
  );

  const refreshNotes = () => {
    setNotes(StorageService.getNotes());
  };

  useEffect(() => {
    refreshNotes();
  }, []);

  // Generate Automatic Reminders based on Inventory Alerts
  const generateAutoReminders = () => {
    const seriesList: SeriesLot[] = StorageService.getSeries();
    let createdCount = 0;

    seriesList.forEach(s => {
      // Check for approaching SKT
      const expiry = new Date(s.expiryDate).getTime();
      const now = new Date().getTime();
      const diffDays = Math.ceil((expiry - now) / (1000 * 3600 * 24));

      if (diffDays > 0 && diffDays <= 90) {
        const title = `SKT Uyarısı: ${s.vaccineName} (${s.seriesNo})`;
        const exists = notes.some(n => n.title === title);
        if (!exists) {
          StorageService.saveNote({
            title,
            description: `${s.seriesNo} serisinin SKT'sine ${diffDays} gün kalmıştır. Kalan Stok: ${formatNumber(s.currentDoseQuantity)} Doz. Lütfen sevkiyat planlamasına alın.`,
            category: 'Aşı SKT Uyarısı',
            priority: diffDays <= 30 ? 'Yüksek' : 'Orta',
            dueDate: s.expiryDate
          });
          createdCount++;
        }
      }

      // Check for critical stock
      if (s.currentDoseQuantity > 0 && s.currentDoseQuantity <= 10000) {
        const title = `Kritik Stok Uyarısı: ${s.vaccineName} (${s.seriesNo})`;
        const exists = notes.some(n => n.title === title);
        if (!exists) {
          StorageService.saveNote({
            title,
            description: `${s.seriesNo} serisinde son ${formatNumber(s.currentDoseQuantity)} doz kalmıştır. Yeni imalat cetveli açılması önerilir.`,
            category: 'Üretim Görevi',
            priority: 'Yüksek',
            dueDate: new Date().toISOString().split('T')[0]
          });
          createdCount++;
        }
      }
    });

    refreshNotes();
    if (createdCount > 0) {
      alert(`${createdCount} adet akıllı envanter uyarısı ve hatırlatıcı not oluşturuldu!`);
    } else {
      alert('Sistem tarandı. Tüm envanter kayıtlarınızın otomatik uyarı notları günceldir.');
    }
  };

  const handleOpenNewModal = () => {
    setEditingNote(null);
    setFormTitle('');
    setFormDescription('');
    setFormCategory('Genel Not');
    setFormPriority('Orta');
    setFormDueDate(new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (note: NoteItem) => {
    setEditingNote(note);
    setFormTitle(note.title);
    setFormDescription(note.description);
    setFormCategory(note.category);
    setFormPriority(note.priority);
    setFormDueDate(note.dueDate);
    setIsModalOpen(true);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    StorageService.saveNote({
      id: editingNote?.id,
      title: formTitle.trim(),
      description: formDescription.trim(),
      category: formCategory,
      priority: formPriority,
      dueDate: formDueDate,
      completed: editingNote ? editingNote.completed : false
    });

    refreshNotes();
    setIsModalOpen(false);
  };

  const handleToggleCompleted = (id: string) => {
    StorageService.toggleNoteCompletion(id);
    refreshNotes();
  };

  const handleDeleteNote = (id: string) => {
    if (confirm('Bu hatırlatıcı notu silmek istediğinizden emin misiniz?')) {
      StorageService.deleteNote(id);
      refreshNotes();
    }
  };

  // Filter notes
  const filteredNotes = notes.filter(n => {
    const matchesSearch =
      !searchQuery ||
      n.title.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR')) ||
      n.description.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR'));

    const matchesCategory = selectedCategory === 'all' || n.category === selectedCategory;

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'completed'
        ? n.completed
        : !n.completed;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate stats
  const totalCount = notes.length;
  const completedCount = notes.filter(n => n.completed).length;
  const pendingCount = notes.filter(n => !n.completed).length;
  const highPriorityCount = notes.filter(n => !n.completed && n.priority === 'Yüksek').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Page Title & Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-lg border border-indigo-900/40 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 p-12 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center shrink-0 shadow-inner">
            <Bell className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">Notlar, Hatırlatıcılar & Planlayıcı</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                AKILLI TAKVİM
              </span>
            </div>
            <p className="text-xs text-indigo-200/80 mt-1">
              Aşı sevkiyat görevleri, imalat planları, SKT uyarıları ve özel operasyonel notlar
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={generateAutoReminders}
            className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-amber-400/30 transition-all flex items-center gap-2 cursor-pointer"
            title="Aşı envanterindeki kritik stok ve SKT kayıtlarından otomatik uyarı üret"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Otomatik Uyarı Üret</span>
          </button>

          <button
            onClick={handleOpenNewModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Not / Görev Ekle</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase">Toplam Kayıt</span>
            <div className="text-xl font-black text-slate-900 font-mono mt-0.5">{totalCount} Not</div>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Bookmark className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase">Bekleyen Görevler</span>
            <div className="text-xl font-black text-amber-600 font-mono mt-0.5">{pendingCount} Görev</div>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase">Yüksek Öncelikli</span>
            <div className="text-xl font-black text-rose-600 font-mono mt-0.5">{highPriorityCount} Kritik</div>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase">Tamamlananlar</span>
            <div className="text-xl font-black text-emerald-600 font-mono mt-0.5">{completedCount} Görev</div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Not başlığı veya içerik ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {['all', 'Aşı SKT Uyarısı', 'Üretim Görevi', 'Sevkiyat Planı', 'Denetim / Toplantı', 'Genel Not'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'all' ? 'Tüm Kategoriler' : cat}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
            }`}
          >
            Tümü
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'pending' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600'
            }`}
          >
            Bekleyenler
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'completed' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600'
            }`}
          >
            Tamamlananlar
          </button>
        </div>

      </div>

      {/* Notes Grid Display */}
      {filteredNotes.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <Bell className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">Kriterlerinize uygun not / hatırlatıcı bulunamadı.</h3>
          <p className="text-xs text-slate-400">"Yeni Not / Görev Ekle" butonunu kullanarak veya otomatik uyarı üreterek yeni kayıt oluşturabilirsiniz.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => {
            const isExpired = new Date(note.dueDate).getTime() < new Date().getTime() && !note.completed;

            return (
              <div
                key={note.id}
                className={`bg-white rounded-2xl border p-5 space-y-3 transition-all relative flex flex-col justify-between ${
                  note.completed
                    ? 'border-slate-200 bg-slate-50/60 opacity-75'
                    : isExpired
                    ? 'border-rose-300 bg-rose-50/20 shadow-xs'
                    : 'border-slate-200/90 hover:border-indigo-300 hover:shadow-md'
                }`}
              >
                <div className="space-y-2.5">
                  
                  {/* Category & Priority Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                      note.category === 'Aşı SKT Uyarısı' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                      note.category === 'Üretim Görevi' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
                      note.category === 'Sevkiyat Planı' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                      note.category === 'Denetim / Toplantı' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                      'bg-slate-100 text-slate-800 border-slate-200'
                    }`}>
                      {note.category}
                    </span>

                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold flex items-center gap-1 ${
                      note.priority === 'Yüksek' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      note.priority === 'Orta' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {note.priority === 'Yüksek' && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                      <span>Öncelik: {note.priority}</span>
                    </span>
                  </div>

                  {/* Title & Complete Checkbox */}
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggleCompleted(note.id)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${
                        note.completed
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 hover:border-indigo-500 bg-white'
                      }`}
                      title={note.completed ? 'Tamamlanmadı olarak işaretle' : 'Tamamlandı olarak işaretle'}
                    >
                      {note.completed && <Check className="w-3.5 h-3.5" />}
                    </button>

                    <h3 className={`text-xs font-extrabold leading-snug ${
                      note.completed ? 'line-through text-slate-400' : 'text-slate-900'
                    }`}>
                      {note.title}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className={`text-xs leading-relaxed ${note.completed ? 'text-slate-400' : 'text-slate-600'}`}>
                    {note.description}
                  </p>

                </div>

                {/* Footer info & Controls */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Calendar className={`w-3.5 h-3.5 ${isExpired ? 'text-rose-600' : 'text-slate-400'}`} />
                    <span className={isExpired ? 'text-rose-700 font-bold' : ''}>
                      {isExpired ? `Günü Geçti (${note.dueDate})` : `Hedef: ${note.dueDate}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(note)}
                      className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg cursor-pointer transition-colors"
                      title="Düzenle"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg cursor-pointer transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* NEW / EDIT NOTE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
            
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white flex items-center justify-between border-b border-indigo-900/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-400/30">
                  <Bell className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-sm font-extrabold text-white">
                  {editingNote ? 'Not / Hatırlatıcı Düzenle' : 'Yeni Not / Görev Oluştur'}
                </h3>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="p-6 space-y-4 text-xs text-slate-700">
              
              <div className="space-y-1">
                <label className="font-bold text-slate-800">Not / Görev Başlığı</label>
                <input
                  type="text"
                  placeholder="Örn: PPR Aşısı Üretim Cetveli Kontrolü"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-800">Kategori</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as NoteCategory)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800"
                  >
                    <option value="Aşı SKT Uyarısı">Aşı SKT Uyarısı</option>
                    <option value="Üretim Görevi">Üretim Görevi</option>
                    <option value="Sevkiyat Planı">Sevkiyat Planı</option>
                    <option value="Denetim / Toplantı">Denetim / Toplantı</option>
                    <option value="Genel Not">Genel Not</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-800">Öncelik Derecesi</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as NotePriority)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800"
                  >
                    <option value="Yüksek">Yüksek (Kritik)</option>
                    <option value="Orta">Orta (Normal)</option>
                    <option value="Düşük">Düşük (Rutin)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800">Hedef / Son Tarih</label>
                <input
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800">Açıklama & Detaylar</label>
                <textarea
                  rows={3}
                  placeholder="Aşı serisi, il adı, protokol no veya gerekli detayları yazın..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  {editingNote ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
