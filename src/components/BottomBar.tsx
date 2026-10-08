/**
 * CitySphere - Bottom Control Bar
 * Time controls, simulation clock, help hints
 */

import React, { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FlaskConical,
} from 'lucide-react';
import { useCityStore } from '../stores/cityStore';
import { TIMEZONE } from '../config/city';

const TIME_MARKS = ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00'];

const BottomBar: React.FC = () => {
  const simulationPlaying = useCityStore((s) => s.simulationPlaying);
  const setSimulationPlaying = useCityStore((s) => s.setSimulationPlaying);
  const scenarioLabOpen = useCityStore((s) => s.scenarioLabOpen);
  const setScenarioLabOpen = useCityStore((s) => s.setScenarioLabOpen);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timeStr = currentTime.toLocaleTimeString('en-IN', {
    timeZone: TIMEZONE,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });

  const dateStr = currentTime.toLocaleDateString('en-IN', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });

  // Compute current hour position on timeline (0-1)
  const hours = parseInt(
    currentTime.toLocaleTimeString('en-IN', {
      timeZone: TIMEZONE,
      hour12: false,
      hour: '2-digit',
    })
  );
  const minutes = parseInt(
    currentTime.toLocaleTimeString('en-IN', {
      timeZone: TIMEZONE,
      hour12: false,
      minute: '2-digit',
    }).split(':')[1] || '0'
  );
  const dayProgress = Math.max(0, Math.min(1, ((hours - 6) * 60 + minutes) / (15 * 60)));

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
      {/* Main controls */}
      <div className="cs-panel px-4 py-2.5 flex items-center gap-4">
        {/* Date & Time */}
        <div className="text-center min-w-[70px]">
          <div className="text-[10px] font-mono text-slate-800 font-semibold">{dateStr}</div>
          <div className="text-[9px] text-cs-text-muted font-medium">{timeStr} IST</div>
        </div>

        <div className="w-px h-5 bg-cs-border" />

        {/* Simulation Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSimulationPlaying(!simulationPlaying)}
            className={`cs-btn p-1.5 ${simulationPlaying ? 'cs-btn-primary' : ''}`}
            title={simulationPlaying ? 'Pause' : 'Play'}
          >
            {simulationPlaying ? <Pause size={11} /> : <Play size={11} />}
          </button>
          <button
            onClick={() => {
              setSimulationPlaying(false);
            }}
            className="cs-btn p-1.5"
            title="Reset"
          >
            <RotateCcw size={11} />
          </button>
        </div>

        <div className="w-px h-5 bg-cs-border" />

        {/* Timeline */}
        <div className="flex items-center gap-0 min-w-[240px] relative">
          {TIME_MARKS.map((mark, i) => (
            <div key={mark} className="flex-1 flex flex-col items-center">
              <div className="text-[7px] text-cs-text-muted mb-1 font-medium">{mark}</div>
              <div className="w-full h-1 relative">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      i / (TIME_MARKS.length - 1) <= dayProgress
                        ? 'linear-gradient(90deg, #3b82f6, #8b5cf6)'
                        : 'rgba(203, 213, 225, 0.7)',
                  }}
                />
              </div>
            </div>
          ))}
          {/* Progress indicator */}
          <div
            className="absolute h-3 w-1.5 -ml-0.5 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600 shadow-xs"
            style={{
              left: `${dayProgress * 100}%`,
              bottom: -1,
            }}
          />
        </div>

        <div className="w-px h-5 bg-cs-border" />

        {/* What-If Button */}
        <button
          onClick={() => setScenarioLabOpen(!scenarioLabOpen)}
          className={`cs-btn gap-1.5 ${scenarioLabOpen ? 'cs-btn-primary' : 'bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-fuchsia-500/10 text-indigo-700 border-indigo-200 hover:border-indigo-400'}`}
        >
          <FlaskConical size={11} />
          <span className="text-[9px] font-bold tracking-wider uppercase">What-If</span>
        </button>
      </div>

      {/* Help hints */}
      <div className="cs-panel px-3 py-1 flex items-center gap-2.5 text-[7.5px] font-semibold text-slate-500 tracking-wider">
        <span>DRAG PAN</span>
        <span className="text-slate-300">·</span>
        <span>RIGHT DRAG ROTATE / PITCH</span>
        <span className="text-slate-300">·</span>
        <span>SCROLL ZOOM</span>
        <span className="text-slate-300">·</span>
        <span>CLICK BUILDING / JUNCTION</span>
      </div>
    </div>
  );
};

export default BottomBar;
