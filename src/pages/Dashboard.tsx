import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, TestTube, Brain, Activity, Zap, Car, Trash2, Leaf, Wind } from 'lucide-react';
import { cityService } from '../services/cityService';
import { Badge } from '../components/common/Badge';
import MiniCesiumMap from '../components/MiniCesiumMap';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState([] as any[]);

  // Fetch metrics summary on mount and refresh every minute
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const summary = await cityService.getMetricsSummary();
        // Map summary fields to dashboard cards
        const metricCards = [
          { icon: <Zap size={20} />, label: 'Energy Demand', value: summary.energyDemand ?? '--', unit: 'kW' },
          { icon: <Car size={20} />, label: 'Traffic Congestion', value: summary.trafficCongestion ?? '--', unit: '%' },
          { icon: <Trash2 size={20} />, label: 'Waste Generation', value: summary.wasteGeneration ?? '--', unit: 'kg' },
          { icon: <Leaf size={20} />, label: 'Renewable Energy', value: summary.renewableEnergy ?? '--', unit: '%' },
          { icon: <Wind size={20} />, label: 'CO₂ Emissions', value: summary.co2Emissions ?? '--', unit: 'kg/hr' },
          { icon: <Globe size={20} />, label: 'Grid Dependency', value: summary.gridDependency ?? '--', unit: '%' },
        ];
        setMetrics(metricCards);
      } catch (e) {
        console.error('Failed to load dashboard metrics', e);
      }
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60_000);
    return () => clearInterval(interval);
  }, []);



  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 h-full overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">City Overview</h1>
        <p className="text-slate-500 mt-1">Monitor urban systems and prepare simulation scenarios.</p>
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map((metric, idx) => (
          <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
            <div className="w-8 h-8 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center mb-3">
              {metric.icon}
            </div>
            <div className="text-2xl font-semibold text-slate-800 tracking-tight">
              {metric.value} <span className="text-sm text-slate-400 font-normal">{metric.unit}</span>
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">{metric.label}</div>
            <div className="text-[9px] text-slate-400 mt-2 uppercase tracking-wider">Awaiting Data Integration</div>
          </div>
        ))}
      </div>

      {/* Main Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6 min-h-[400px] flex flex-col">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">City Map Placeholder</h3>
          <div className="flex-1 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center">
            <div className="text-center">
              <Globe className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Interactive Map View</p>
              <p className="text-sm text-slate-400 mt-1">Navigate to Digital Twin for full visualization</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 min-h-[190px] flex flex-col">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Urban Systems Overview</h3>
            <div className="flex-1 flex items-center justify-center text-sm text-slate-500 text-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
              System health metrics will appear here
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 min-h-[186px] flex flex-col">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Scenarios Placeholder</h3>
            <div className="flex-1 flex items-center justify-center text-sm text-slate-500 text-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
              Saved scenarios history
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 uppercase tracking-wider">Quick Actions</h3>
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={() => navigate('/digital-twin')}
            className="flex items-center gap-2 px-4 py-2 bg-cs-accent text-white rounded-md font-medium shadow-sm hover:bg-cs-accent-light transition-colors"
          >
            <Globe size={16} /> Open Digital Twin
          </button>
          <button 
            onClick={() => navigate('/scenario-lab')}
            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-md font-medium shadow-sm hover:bg-slate-50 transition-colors"
          >
            <TestTube size={16} /> Create Scenario
          </button>
          <button 
            onClick={() => navigate('/predictions')}
            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-md font-medium shadow-sm hover:bg-slate-50 transition-colors"
          >
            <Brain size={16} /> View Predictions
          </button>
        </div>
      </div>

      <div className="mt-12 text-center text-sm text-slate-400 bg-slate-100/50 rounded-lg p-4">
        City data, simulation outputs, and AI predictions will be connected during subsequent development phases.
      </div>
    </div>
  );
};

export default Dashboard;
