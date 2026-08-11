import React from 'react';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  lightBackground?: boolean;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  lightBackground = true
}) => {
  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const titleSizes = {
    sm: 'text-sm font-extrabold',
    md: 'text-base font-black',
    lg: 'text-lg font-black',
    xl: 'text-2xl font-black'
  };

  return (
    <div className="inline-flex items-center gap-3 select-none">
      {/* High-Quality Vector Emblem Logo Icon */}
      <div className={`relative ${iconSizes[size]} shrink-0 rounded-2xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-indigo-800 p-0.5 shadow-md shadow-indigo-900/20 group hover:scale-105 transition-all duration-200`}>
        <div className="w-full h-full rounded-[14px] bg-gradient-to-b from-indigo-900 to-slate-950 p-1.5 flex items-center justify-center relative overflow-hidden border border-indigo-400/20">
          
          {/* Subtle Ambient Glow Effect inside Logo */}
          <div className="absolute -top-3 -right-3 w-8 h-8 bg-amber-400/30 rounded-full blur-md" />
          <div className="absolute -bottom-3 -left-3 w-8 h-8 bg-emerald-500/20 rounded-full blur-md" />

          {/* SVG Vector Crest / Syringe & Shield */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="w-full h-full text-white relative z-10"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Outer Crest Shield */}
            <path
              d="M12 2L4 5v6c0 5.25 3.4 10.15 8 11 4.6-.85 8-5.75 8-11V5l-8-3z"
              className="fill-indigo-600/30 stroke-indigo-300/80"
            />
            {/* Vaccine Syringe / Cross Element inside */}
            <path d="M12 7v8" className="stroke-amber-300 stroke-[2.2]" />
            <path d="M8 11h8" className="stroke-amber-300 stroke-[2.2]" />
            <circle cx="12" cy="12" r="1.5" className="fill-emerald-400 stroke-none" />
          </svg>
        </div>
      </div>

      {/* Brand Text */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className={`${titleSizes[size]} tracking-tight leading-none ${lightBackground ? 'text-slate-900' : 'text-white'}`}>
            AŞI ÜRETİM TAKİP
          </span>
          <span className="text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-600 text-white px-1.5 py-0.5 rounded shadow-2xs">
            Etlik
          </span>
        </div>

        {showSubtitle && (
          <span className={`text-[11px] font-semibold tracking-normal mt-1 leading-none ${lightBackground ? 'text-slate-500' : 'text-indigo-200/80'}`}>
            Etlik VKMAE Aşı & Seri Yönetim Portalı
          </span>
        )}
      </div>
    </div>
  );
};
