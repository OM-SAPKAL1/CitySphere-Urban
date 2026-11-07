/**
 * CitySphere — What-If Scenario Lab
 * Right-side drawer with proper slide animation and Pune Urban Event template.
 *
 * Lifecycle states:
 *   CLOSED → SELECTING → DRAFT → READY → RUNNING → COMPLETED | FAILED
 *
 * IMPORTANT: Opening the drawer / selecting a template NEVER mutates the
 * baseline simulation state. Only an explicit "RUN SCENARIO" action may
 * compute scenario-specific results, stored in isolated local state only.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FlaskConical,
  ChevronLeft,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Users,
  MapPin,
  Calendar,
  BarChart3,
  Info,
  Play,
} from 'lucide-react';
import { useCityStore } from '../stores/cityStore';

// ─── Scenario lifecycle state machine ────────────────────────────────────────

type DrawerStatus =
  | 'CLOSED'
  | 'SELECTING'
  | 'DRAFT'
  | 'READY'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED';

interface ScenarioConfig {
  populationIncreasePct: number;
  studyArea: string;
  eventStartTime: string;
  eventEndTime: string;
  arrivalProfile: string;
  departureProfile: string;
  modeShareAssumption: string;
}

interface ScenarioResult {
  ranAt: Date;
  note: string;
}

const DEFAULT_CONFIG: ScenarioConfig = {
  populationIncreasePct: 25,
  studyArea: 'Pune Shivajinagar-Deccan Study Area (1 km x 1 km)',
  eventStartTime: '09:00',
  eventEndTime: '21:00',
  arrivalProfile: 'Gradual (2-hour ramp-up)',
  departureProfile: 'Dispersed (3-hour ramp-down)',
  modeShareAssumption: 'Existing mode split - Pune CTTP 2019 baseline',
};

// ─── Component ────────────────────────────────────────────────────────────────

const WhatIfScenario: React.FC = () => {
  const scenarioLabOpen = useCityStore((s) => s.scenarioLabOpen);
  const setScenarioLabOpen = useCityStore((s) => s.setScenarioLabOpen);

  const [status, setStatus] = useState<DrawerStatus>('CLOSED');
  const [config, setConfig] = useState<ScenarioConfig>(DEFAULT_CONFIG);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleClose = useCallback(() => {
    setScenarioLabOpen(false);
    setStatus('CLOSED');
    setResult(null);
    setErrorMsg('');
  }, [setScenarioLabOpen]);

  const handleSelectTemplate = useCallback(() => { setStatus('DRAFT'); }, []);
  const handleBack = useCallback(() => { setStatus('SELECTING'); setResult(null); setErrorMsg(''); }, []);
  const handleMarkReady = useCallback(() => { setStatus('READY'); }, []);

  const handleRunScenario = useCallback(async () => {
    setStatus('RUNNING');
    setErrorMsg('');
    await new Promise((r) => setTimeout(r, 2200));
    setStatus('COMPLETED');
    setResult({
      ranAt: new Date(),
      note: 'The scenario configuration was accepted but full traffic-simulation results are not yet available. The backend demand model for population-surge events requires Phase 2 integration (OD matrix + dynamic assignment engine). No baseline values were modified.',
    });
  }, []);

  React.useEffect(() => {
    if (!scenarioLabOpen && status !== 'CLOSED') { setStatus('CLOSED'); setResult(null); setErrorMsg(''); }
    if (scenarioLabOpen && status === 'CLOSED') { setStatus('SELECTING'); }
  }, [scenarioLabOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {scenarioLabOpen && (
        <motion.div
          key="whatif-drawer"
          initial={{ x: 480, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 480, opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.32, 0, 0.16, 1] }}
          className="fixed top-0 right-0 z-40 h-full w-[460px] max-w-[96vw] flex flex-col shadow-2xl"
          style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(18px)', borderLeft: '1px solid rgba(226,232,240,0.85)', pointerEvents: 'all' }}
        >
          <div className="flex-shrink-0 px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(226,232,240,0.85)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-fuchsia-500 flex items-center justify-center text-white shadow-md">
                <FlaskConical size={14} />
              </div>
              <div>
                <div className="text-[12px] font-extrabold tracking-widest text-slate-800 uppercase">What-If Scenario Lab</div>
                <div className="text-[9px] text-slate-500 font-medium mt-0.5">Create and explore alternative urban scenarios.</div>
              </div>
            </div>
            <button onClick={handleClose} aria-label="Close What-If Scenario Lab" className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors">
              <X size={14} />
            </button>
          </div>

          <div className="flex-shrink-0 px-5 py-2.5" style={{ borderBottom: '1px solid rgba(226,232,240,0.85)' }}>
            <StatusPill status={status} />
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            <AnimatePresence mode="wait">
              {status === 'SELECTING' && <SelectingView key="selecting" onSelectTemplate={handleSelectTemplate} />}
              {(status === 'DRAFT' || status === 'READY') && (
                <DraftView key="draft" config={config} setConfig={setConfig} status={status} onMarkReady={handleMarkReady} onBack={handleBack} onRun={handleRunScenario} onClose={handleClose} />
              )}
              {status === 'RUNNING' && <RunningView key="running" />}
              {status === 'COMPLETED' && result && <CompletedView key="completed" result={result} config={config} onBack={handleBack} onClose={handleClose} />}
              {status === 'FAILED' && <FailedView key="failed" errorMsg={errorMsg} onBack={handleBack} />}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── Status Pill ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<DrawerStatus, string> = {
  CLOSED:    'text-slate-400 bg-slate-100',
  SELECTING: 'text-slate-600 bg-slate-100',
  DRAFT:     'text-amber-700 bg-amber-50 border border-amber-200',
  READY:     'text-indigo-700 bg-indigo-50 border border-indigo-200',
  RUNNING:   'text-blue-700 bg-blue-50 border border-blue-200',
  COMPLETED: 'text-emerald-700 bg-emerald-50 border border-emerald-200',
  FAILED:    'text-red-700 bg-red-50 border border-red-200',
};
const STATUS_LABEL: Record<DrawerStatus, string> = {
  CLOSED: 'Closed', SELECTING: 'No active scenario', DRAFT: 'Draft - not run',
  READY: 'Ready to run', RUNNING: 'Running...', COMPLETED: 'Completed', FAILED: 'Failed',
};
const StatusPill: React.FC<{ status: DrawerStatus }> = ({ status }) => (
  <span className={`inline-block text-[9px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full ${STATUS_STYLES[status] ?? STATUS_STYLES.SELECTING}`}>
    {STATUS_LABEL[status] ?? 'No active scenario'}
  </span>
);

// ─── View: SELECTING ─────────────────────────────────────────────────────────

const SelectingView: React.FC<{ onSelectTemplate: () => void }> = ({ onSelectTemplate }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22 }} className="p-5 space-y-5">
    <SectionLabel>Suggested Scenarios</SectionLabel>
    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-indigo-50/40 shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-fuchsia-500" />
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white shadow-md flex-shrink-0"><Users size={16} /></div>
            <div>
              <div className="text-[11px] font-bold text-slate-800 leading-tight">Pune Urban Event</div>
              <div className="text-[10px] font-semibold text-indigo-600 mt-0.5">25% Population Surge</div>
            </div>
          </div>
          <span className="flex-shrink-0 text-[8px] font-bold tracking-widest uppercase px-2 py-1 rounded-full border border-amber-300 text-amber-700 bg-amber-50">Template - Not Run</span>
        </div>
        <p className="text-[10px] text-slate-600 leading-relaxed">Explore how a temporary population increase within a selected Pune study area may affect traffic, congestion, travel time, and estimated vehicle emissions.</p>
        <div className="flex flex-col gap-2 pt-1">
          <InfoRow icon={<MapPin size={10} />} label="Study Area" value="Shivajinagar-Deccan, Pune" />
          <InfoRow icon={<Users size={10} />} label="Population Increase" value="+25% (temporary)" />
          <InfoRow icon={<Calendar size={10} />} label="Duration" value="Configurable" />
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onSelectTemplate} className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[10px] font-bold tracking-wide text-white bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 transition-all shadow-sm">
            <FlaskConical size={11} />Select Scenario
          </button>
          <button disabled title="Custom scenario creation available in Phase 2" className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[10px] font-semibold text-slate-400 border border-slate-200 bg-slate-50 cursor-not-allowed">
            Create Custom
          </button>
        </div>
      </div>
    </div>
    <Note>Selecting a scenario template does not activate it or modify the live city state. Configuration and explicit Run Scenario are required.</Note>
  </motion.div>
);

// ─── View: DRAFT / READY ─────────────────────────────────────────────────────

const DraftView: React.FC<{
  config: ScenarioConfig;
  setConfig: React.Dispatch<React.SetStateAction<ScenarioConfig>>;
  status: DrawerStatus;
  onMarkReady: () => void;
  onBack: () => void;
  onRun: () => void;
  onClose: () => void;
}> = ({ config, setConfig, status, onMarkReady, onBack, onRun, onClose }) => {
  const isReady = status === 'READY';
  const update = <K extends keyof ScenarioConfig>(k: K, v: ScenarioConfig[K]) => setConfig((prev) => ({ ...prev, [k]: v }));
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22 }} className="p-5 space-y-5">
      <button onClick={onBack} className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"><ChevronLeft size={12} />Back to scenarios</button>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white shadow-md flex-shrink-0"><Users size={16} /></div>
        <div>
          <div className="text-[13px] font-extrabold text-slate-800">Pune Urban Event</div>
          <div className="text-[10px] text-indigo-600 font-semibold mt-0.5">25% Population Surge</div>
        </div>
      </div>
      <div className="space-y-3">
        <SectionLabel>Parameters</SectionLabel>
        <FieldRow label="Population Increase (%)">
          <input type="number" min={1} max={200} value={config.populationIncreasePct} onChange={(e) => update('populationIncreasePct', parseInt(e.target.value) || 25)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 transition" />
        </FieldRow>
        <FieldRow label="Study Area">
          <input type="text" value={config.studyArea} onChange={(e) => update('studyArea', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 transition" />
        </FieldRow>
        <div className="grid grid-cols-2 gap-2">
          <FieldRow label="Event Start">
            <input type="time" value={config.eventStartTime} onChange={(e) => update('eventStartTime', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 transition" />
          </FieldRow>
          <FieldRow label="Event End">
            <input type="time" value={config.eventEndTime} onChange={(e) => update('eventEndTime', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 transition" />
          </FieldRow>
        </div>
        <FieldRow label="Arrival Profile">
          <select value={config.arrivalProfile} onChange={(e) => update('arrivalProfile', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 transition">
            <option>Gradual (2-hour ramp-up)</option><option>Sharp (30-min surge)</option><option>Uniform (spread evenly)</option>
          </select>
        </FieldRow>
        <FieldRow label="Departure Profile">
          <select value={config.departureProfile} onChange={(e) => update('departureProfile', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 transition">
            <option>Dispersed (3-hour ramp-down)</option><option>Sharp (60-min exodus)</option><option>Uniform (spread evenly)</option>
          </select>
        </FieldRow>
        <FieldRow label="Mode-Share Assumption">
          <select value={config.modeShareAssumption} onChange={(e) => update('modeShareAssumption', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 transition">
            <option>Existing mode split - Pune CTTP 2019 baseline</option><option>Increased private vehicle share (+10%)</option><option>Increased public transit share (+15%)</option>
          </select>
        </FieldRow>
      </div>
      <div className="space-y-2">
        <SectionLabel>Assumptions and Data Availability</SectionLabel>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5">
          <AssumptionRow available label="Study area boundary" detail="1 km x 1 km OSM geometry" />
          <AssumptionRow available label="Road network" detail="OpenStreetMap (loaded)" />
          <AssumptionRow available={false} label="OD demand matrix" detail="Phase 2 - not connected" />
          <AssumptionRow available={false} label="Dynamic assignment" detail="Phase 2 - not connected" />
          <AssumptionRow available={false} label="Emissions model" detail="Phase 2 - not connected" />
        </div>
        <Note>A +{config.populationIncreasePct}% population increase is NOT automatically converted to a +{config.populationIncreasePct}% traffic increase. Demand depends on trip generation, mode share, and time-of-day distribution - all requiring the Phase 2 traffic model.</Note>
      </div>
      <div className="space-y-2 pb-4">
        {!isReady ? (
          <button onClick={onMarkReady} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-bold text-white bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 transition-all shadow">
            <CheckCircle2 size={13} />Confirm Configuration
          </button>
        ) : (
          <button onClick={onRun} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all shadow">
            <Play size={13} />Run Scenario
          </button>
        )}
        <button onClick={onClose} className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] font-semibold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-all">
          <X size={12} />Cancel and Close
        </button>
      </div>
    </motion.div>
  );
};

// ─── View: RUNNING ────────────────────────────────────────────────────────────

const RunningView: React.FC = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} className="flex flex-col items-center justify-center h-64 gap-4 p-8">
    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg"><Loader2 size={26} className="animate-spin" /></div>
    <div className="text-center">
      <div className="text-[12px] font-bold text-slate-800">Running Scenario...</div>
      <div className="text-[10px] text-slate-500 mt-1">Preparing demand model and checking data availability.</div>
    </div>
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }} />
      ))}
    </div>
  </motion.div>
);

// ─── View: COMPLETED ──────────────────────────────────────────────────────────

const CompletedView: React.FC<{ result: ScenarioResult; config: ScenarioConfig; onBack: () => void; onClose: () => void }> = ({ result, config, onBack, onClose }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22 }} className="p-5 space-y-5">
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md"><CheckCircle2 size={16} /></div>
      <div>
        <div className="text-[12px] font-extrabold text-slate-800">Scenario Run Completed</div>
        <div className="text-[9px] text-slate-500 font-medium mt-0.5">{result.ranAt.toLocaleTimeString()}</div>
      </div>
    </div>
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex gap-2.5">
      <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
      <p className="text-[10px] text-amber-800 leading-relaxed">{result.note}</p>
    </div>
    <SectionLabel>Configuration Used</SectionLabel>
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5">
      <InfoRow icon={<Users size={10} />} label="Population Surge" value={`+${config.populationIncreasePct}%`} />
      <InfoRow icon={<MapPin size={10} />} label="Study Area" value={config.studyArea} />
      <InfoRow icon={<Clock size={10} />} label="Event Window" value={`${config.eventStartTime} to ${config.eventEndTime}`} />
      <InfoRow icon={<BarChart3 size={10} />} label="Arrival" value={config.arrivalProfile} />
      <InfoRow icon={<BarChart3 size={10} />} label="Departure" value={config.departureProfile} />
    </div>
    <SectionLabel>Metric Availability</SectionLabel>
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5">
      <MetricAvailRow label="Traffic volume change" available={false} reason="Requires OD demand model (Phase 2)" />
      <MetricAvailRow label="Congestion index change" available={false} reason="Requires dynamic assignment (Phase 2)" />
      <MetricAvailRow label="Travel time change" available={false} reason="Requires dynamic assignment (Phase 2)" />
      <MetricAvailRow label="Estimated CO2 change" available={false} reason="Requires emissions model (Phase 2)" />
      <MetricAvailRow label="Bottleneck identification" available={false} reason="Requires network flow analysis (Phase 2)" />
    </div>
    <Note>The baseline Digital Twin simulation was NOT modified by this scenario run. All results above reflect only the scenario-isolated state.</Note>
    <div className="space-y-2 pb-4">
      <button onClick={onBack} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-bold text-indigo-700 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-all">
        <ChevronLeft size={13} />Reconfigure Scenario
      </button>
      <button onClick={onClose} className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] font-semibold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-all">
        <X size={12} />Close and Return to Baseline
      </button>
    </div>
  </motion.div>
);

// ─── View: FAILED ─────────────────────────────────────────────────────────────

const FailedView: React.FC<{ errorMsg: string; onBack: () => void }> = ({ errorMsg, onBack }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22 }} className="p-5 space-y-4">
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white shadow-md"><AlertCircle size={16} /></div>
      <div className="text-[12px] font-extrabold text-slate-800">Scenario Failed</div>
    </div>
    {errorMsg && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-[10px] text-red-700">{errorMsg}</div>}
    <button onClick={onBack} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-bold text-indigo-700 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-all">
      <ChevronLeft size={13} />Back
    </button>
  </motion.div>
);

// ─── Shared helpers ───────────────────────────────────────────────────────────

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-[8.5px] font-bold tracking-[0.18em] text-slate-500 uppercase">{children}</div>
);

const Note: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex gap-2 rounded-lg bg-blue-50 border border-blue-100 p-2.5">
    <Info size={12} className="text-blue-500 flex-shrink-0 mt-0.5" />
    <p className="text-[9.5px] text-blue-700 leading-relaxed">{children}</p>
  </div>
);

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-start gap-2">
    <span className="text-slate-400 flex-shrink-0 mt-0.5">{icon}</span>
    <span className="text-[9px] text-slate-500 font-medium w-24 flex-shrink-0">{label}</span>
    <span className="text-[9px] text-slate-700 font-semibold leading-snug">{value}</span>
  </div>
);

const FieldRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">{label}</label>
    {children}
  </div>
);

const AssumptionRow: React.FC<{ available: boolean; label: string; detail: string }> = ({ available, label, detail }) => (
  <div className="flex items-center gap-2">
    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 ${available ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
      {available ? <CheckCircle2 size={9} /> : <X size={9} />}
    </div>
    <span className="text-[9px] text-slate-700 font-medium flex-1">{label}</span>
    <span className="text-[9px] text-slate-400">{detail}</span>
  </div>
);

const MetricAvailRow: React.FC<{ label: string; available: boolean; reason?: string }> = ({ label, available, reason }) => (
  <div className="flex items-start gap-2">
    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${available ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
      {available ? <CheckCircle2 size={9} /> : <X size={9} />}
    </div>
    <div className="flex-1">
      <div className="text-[9px] text-slate-700 font-medium">{label}</div>
      {!available && reason && <div className="text-[8.5px] text-slate-400 mt-0.5">{reason}</div>}
    </div>
    <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded ${available ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-100'}`}>
      {available ? 'Available' : 'Not available'}
    </span>
  </div>
);

export default WhatIfScenario;
