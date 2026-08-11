import React, { useState } from 'react';
import { ShieldCheck, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { AppLogo } from './AppLogo';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    setTimeout(() => {
      if (password.trim() === '1907') {
        onLoginSuccess();
      } else {
        setError('Hatalı Şifre! Lütfen geçerli yetkili parolasını giriniz.');
        setIsSubmitting(false);
      }
    }, 200);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Background Decorative Gradient Blobs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 space-y-6 relative z-10">
        
        {/* Emblem & Header */}
        <div className="text-center space-y-3 flex flex-col items-center">
          <div className="mb-1">
            <AppLogo size="xl" showSubtitle={false} lightBackground={true} />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-indigo-50 text-indigo-800 border border-indigo-100 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              T.C. Tarım ve Orman Bakanlığı
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-snug">
              Etlik VKMAE Aşı Üretim Takip Sistemi
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Etlik Veteriner Kontrol Merkez Araştırma Enstitüsü
            </p>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 flex items-start gap-3 animate-shake">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs font-semibold text-rose-800 leading-snug">
              {error}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              Yetkili Parolası
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Parolanızı Giriniz..."
                required
                autoFocus
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-4 py-3 text-sm text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all shadow-inner"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-indigo-700 to-indigo-900 hover:from-indigo-800 hover:to-indigo-950 text-white font-extrabold text-xs py-3.5 rounded-2xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-[0.99] disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Doğrulanıyor...' : 'Giriş Yap'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Helper Note */}
        <div className="pt-2 border-t border-slate-100 text-center space-y-1">
          <p className="text-[11px] text-slate-500 font-semibold">
            Etlik VKMAE Bilgi İşlem Dairesi • Yetkili Erişim Paneli
          </p>
          <p className="text-[10px] text-slate-400 font-medium">
            Güvenlik Protokolü v2.4 — Tüm Oturum İşlemleri Kayıt Altındadır
          </p>
        </div>

      </div>

    </div>
  );
};
