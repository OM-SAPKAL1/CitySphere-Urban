import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description: string;
  emptyMessage: string;
  Icon: LucideIcon;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, description, emptyMessage, Icon }) => {
  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <Icon className="text-cs-accent" />
          {title}
        </h1>
        <p className="text-slate-500 mt-2 max-w-2xl">{description}</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50 p-12 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
          <Icon size={32} />
        </div>
        <h3 className="text-lg font-medium text-slate-700 mb-2">Module Not Yet Connected</h3>
        <p className="text-slate-500 max-w-md mx-auto">{emptyMessage}</p>
        <button className="mt-6 px-4 py-2 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 shadow-sm transition-colors">
          View Implementation Plan
        </button>
      </div>
    </div>
  );
};

export default PlaceholderPage;
