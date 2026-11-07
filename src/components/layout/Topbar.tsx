import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, User, MapPin } from 'lucide-react';
import { CITY_CENTER } from '../../config/city';

const Topbar: React.FC = () => {
  const location = useLocation();
  const pathName = location.pathname.substring(1).replace('-', ' ') || 'dashboard';
  const title = pathName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10 shadow-sm">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
          <MapPin size={14} className="text-cs-accent" />
          <span className="font-medium">{CITY_CENTER.studyArea}</span>
        </div>

        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-green-600 tracking-wide text-xs">SIMULATION READY</span>
        </div>

        <div className="flex items-center gap-4 border-l border-slate-200 pl-6">
          <button className="text-slate-400 hover:text-slate-600 transition-colors">
            <Bell size={18} />
          </button>
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 border border-slate-300 overflow-hidden cursor-pointer">
            <User size={16} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
