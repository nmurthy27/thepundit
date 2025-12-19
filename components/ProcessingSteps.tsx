
import React from 'react';
import { ProcessingPhase } from '../types';

interface ProcessingStepsProps {
  currentPhase: ProcessingPhase;
}

export const ProcessingSteps: React.FC<ProcessingStepsProps> = ({ currentPhase }) => {
  const phases = [
    { id: ProcessingPhase.ANALYSIS, label: 'Analysis & Filtering' },
    { id: ProcessingPhase.OPINION, label: 'Opinion Generation' },
    { id: ProcessingPhase.DRAFTING, label: 'Drafting Post' },
    { id: ProcessingPhase.COMPLETED, label: 'Final Output' }
  ];

  const getStatus = (phase: ProcessingPhase) => {
    const order = Object.values(ProcessingPhase);
    const currentIndex = order.indexOf(currentPhase);
    const phaseIndex = order.indexOf(phase);

    if (currentPhase === ProcessingPhase.ERROR) return 'text-red-500';
    if (phaseIndex < currentIndex) return 'text-blue-600 font-bold';
    if (phaseIndex === currentIndex) return 'text-blue-500 animate-pulse font-bold';
    return 'text-slate-400';
  };

  return (
    <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-8 py-6 px-4 bg-white rounded-xl shadow-sm border border-slate-100 mb-8">
      {phases.map((phase, idx) => (
        <div key={phase.id} className="flex items-center space-x-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${getStatus(phase.id).includes('blue-600') ? 'border-blue-600 bg-blue-50' : 'border-slate-200'}`}>
            <span className="text-sm">{idx + 1}</span>
          </div>
          <span className={`text-sm ${getStatus(phase.id)}`}>{phase.label}</span>
        </div>
      ))}
    </div>
  );
};
