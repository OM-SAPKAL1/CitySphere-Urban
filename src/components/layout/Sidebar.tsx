import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Globe, LayoutDashboard, Brain, TestTube, BarChart2, Zap, 
  MapPin, Settings, FileText, Factory, Car, Wind, Trash2, Leaf
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const navGroups = [
    {
      title: 'OVERVIEW',
      items: [{ name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> }],
    },
    {
      title: 'DIGITAL TWIN',
      items: [{ name: 'Digital Twin', path: '/digital-twin', icon: <Globe size={18} /> }],
    },
    {
      title: 'INTELLIGENCE',
      items: [
        { name: 'AI Predictions', path: '/predictions', icon: <Brain size={18} /> },
        { name: 'Scenario Lab', path: '/scenario-lab', icon: <TestTube size={18} /> },
        { name: 'Comparison', path: '/comparison', icon: <BarChart2 size={18} /> },
        { name: 'Optimization', path: '/optimization', icon: <Zap size={18} /> },
      ],
    },
    {
      title: 'CITY SYSTEMS',
      items: [
        { name: 'Energy', path: '/energy', icon: <Zap size={18} /> },
        { name: 'Traffic', path: '/traffic', icon: <Car size={18} /> },
        { name: 'Waste', path: '/waste', icon: <Trash2 size={18} /> },
        { name: 'Renewables', path: '/renewables', icon: <Leaf size={18} /> },
        { name: 'Environment', path: '/environment', icon: <Wind size={18} /> },
      ],
    },
    {
      title: 'MANAGEMENT',
      items: [
        { name: 'Reports', path: '/reports', icon: <FileText size={18} /> },
        { name: 'Settings', path: '/settings', icon: <Settings size={18} /> },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800">
      <div className="p-5 flex items-center gap-3 border-b border-slate-800">
        <div className="w-8 h-8 rounded-md bg-cs-accent flex items-center justify-center text-white">
          <Globe size={20} />
        </div>
        <div>
          <h1 className="text-white font-bold tracking-wide leading-tight">CitySphere</h1>
          <p className="text-[9px] text-slate-400 font-semibold tracking-wider">URBAN INTELLIGENCE PLATFORM</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
        {navGroups.map((group, idx) => (
          <div key={idx} className="mb-6 px-3">
            <h2 className="text-[10px] font-bold text-slate-500 tracking-wider mb-2 px-3">{group.title}</h2>
            <nav className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-cs-accent/10 text-cs-accent-light border border-cs-accent/20' 
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                    }`
                  }
                >
                  {item.icon}
                  {item.name}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
