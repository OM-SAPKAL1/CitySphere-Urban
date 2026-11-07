import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import Dashboard from '../pages/Dashboard';
import DigitalTwin from '../pages/DigitalTwin';
import PlaceholderPage from '../pages/PlaceholderPage';
import { 
  Brain, TestTube, BarChart2, Zap, Car, Trash2, Leaf, Wind, FileText, Settings, AlertTriangle
} from 'lucide-react';

const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="digital-twin" element={<DigitalTwin />} />
        
        {/* Placeholders */}
        <Route path="predictions" element={
          <PlaceholderPage 
            title="AI Predictions" 
            description="Explore forecasts for urban energy, traffic, waste, and renewable generation."
            emptyMessage="Prediction models and forecast visualizations are planned for a subsequent phase."
            Icon={Brain} 
          />
        } />
        <Route path="scenario-lab" element={
          <PlaceholderPage 
            title="Scenario Lab" 
            description="Configure urban interventions and evaluate their simulated impact."
            emptyMessage="Scenario configuration and simulation will be implemented later."
            Icon={TestTube} 
          />
        } />
        <Route path="comparison" element={
          <PlaceholderPage 
            title="Comparison" 
            description="Compare the baseline city state against proposed scenarios."
            emptyMessage="Scenario comparison will be available after simulation integration."
            Icon={BarChart2} 
          />
        } />
        <Route path="optimization" element={
          <PlaceholderPage 
            title="Optimization" 
            description="Evaluate alternative urban strategies against cost and sustainability objectives."
            emptyMessage="Optimization algorithms will be integrated later."
            Icon={Zap} 
          />
        } />
        
        {/* City Systems Placeholders */}
        <Route path="energy" element={<PlaceholderPage title="Energy" description="City-wide energy grid monitoring" emptyMessage="Energy systems tracking will be added later." Icon={Zap} />} />
        <Route path="traffic" element={<PlaceholderPage title="Traffic" description="Real-time traffic management" emptyMessage="Traffic data integration is pending." Icon={Car} />} />
        <Route path="waste" element={<PlaceholderPage title="Waste" description="Waste collection and processing" emptyMessage="Waste management metrics will be implemented in future phases." Icon={Trash2} />} />
        <Route path="renewables" element={<PlaceholderPage title="Renewables" description="Renewable energy generation tracking" emptyMessage="Renewables integration will be added later." Icon={Leaf} />} />
        <Route path="environment" element={<PlaceholderPage title="Environment" description="Air quality and environment sensing" emptyMessage="Environmental sensors are not yet connected." Icon={Wind} />} />
        
        {/* Management Placeholders */}
        <Route path="reports" element={<PlaceholderPage title="Reports" description="Generate and export city reports" emptyMessage="Reporting features are planned for future." Icon={FileText} />} />
        <Route path="settings" element={<PlaceholderPage title="Settings" description="Platform configuration and user settings" emptyMessage="Settings panel is under construction." Icon={Settings} />} />
        
        {/* 404 */}
        <Route path="*" element={
          <PlaceholderPage 
            title="Not Found" 
            description="The requested page could not be found."
            emptyMessage="Please navigate using the sidebar."
            Icon={AlertTriangle} 
          />
        } />
      </Route>
    </Routes>
  );
};

export default AppRouter;
