
import React, { useState } from 'react';
import { analyzeProfession } from '../services/geminiService';
import { OnboardingData, FeedSource } from '../types';

interface OnboardingProps {
  userName: string;
  onComplete: (data: OnboardingData) => void;
  onSkip: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ userName, onComplete, onSkip }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [profession, setProfession] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<OnboardingData | null>(null);

  // Discovery phase: Get AI suggestions
  const handleStartAnalysis = async () => {
    if (!profession.trim()) return;
    setIsLoading(true);
    try {
      const result = await analyzeProfession(profession);
      setData(result);
      setStep(2);
    } catch (err) {
      alert("Analysis failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Confirmation of Sources & Companies
  const handleConfirmSourcesAndCompanies = () => {
    setStep(3);
  };

  // Step 3: Final confirmation of Keywords
  const handleFinalize = () => {
    if (data) {
      onComplete(data);
    }
  };

  const removeSource = (name: string) => {
    if (!data) return;
    setData({
      ...data,
      suggestedSources: data.suggestedSources.filter(s => s.name !== name)
    });
  };

  const removeCompany = (name: string) => {
    if (!data) return;
    setData({
      ...data,
      suggestedCompanies: data.suggestedCompanies.filter(c => c !== name)
    });
  };

  const removeKeyword = (kw: string) => {
    if (!data) return;
    setData({
      ...data,
      suggestedKeywords: data.suggestedKeywords.filter(k => k !== kw)
    });
  };

  const addKeyword = (kw: string) => {
    if (!data || !kw.trim()) return;
    setData({
      ...data,
      suggestedKeywords: [...data.suggestedKeywords, kw.trim()]
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-40 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-4xl w-full max-h-[90vh] flex flex-col bg-slate-900/60 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl relative z-10 overflow-hidden">
        
        {/* Progress Header */}
        <div className="flex items-center justify-between mb-8 shrink-0">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex flex-col items-center space-y-2 flex-1 relative">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm z-10 transition-all ${
                step === s ? 'bg-blue-600 text-white scale-110 shadow-lg shadow-blue-500/30' : 
                step > s ? 'bg-green-500 text-white' : 'bg-slate-800 text-slate-500'
              }`}>
                {step > s ? '✓' : s}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${step === s ? 'text-blue-400' : 'text-slate-600'}`}>
                {s === 1 ? 'Discovery' : s === 2 ? 'Market Setup' : 'Brand Voice'}
              </span>
              {s < 3 && <div className={`absolute top-5 left-[60%] w-[80%] h-0.5 ${step > s ? 'bg-green-500' : 'bg-slate-800'}`}></div>}
            </div>
          ))}
        </div>

        {/* Step 1: Industry Selection */}
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto">
            <div className="text-center">
              <h2 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase leading-none">thesocial<br/><span className="text-blue-500">pundit</span></h2>
              <p className="text-slate-400 font-medium">What industry or profession should we monitor for your personal brand, {userName}?</p>
            </div>
            
            <div className="space-y-4">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Industry / Requirements</label>
              <textarea 
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                placeholder="e.g., Marketing Director in AdTech focusing on Programmatic and OOH Advertising..."
                className="w-full h-40 px-8 py-6 rounded-[2rem] bg-slate-800/50 border border-white/5 focus:border-blue-500 focus:outline-none text-white transition-all resize-none text-lg placeholder-slate-600"
              />
            </div>

            <div className="flex flex-col space-y-4 pt-4">
              <button 
                onClick={handleStartAnalysis}
                disabled={!profession.trim() || isLoading}
                className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-xl shadow-2xl shadow-blue-900/40 hover:bg-blue-500 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center space-x-3"
              >
                {isLoading ? (
                  <>
                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <span>Initialize My Feed</span>
                )}
              </button>
              <button onClick={onSkip} className="text-slate-500 hover:text-slate-300 font-black text-xs uppercase tracking-widest py-2 transition-all">Setup Manually</button>
            </div>
          </div>
        )}

        {/* Step 2: Confirming Sources & Companies */}
        {step === 2 && data && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col h-full overflow-hidden">
            <div className="text-center shrink-0">
              <h2 className="text-3xl font-black text-white mb-2 tracking-tighter leading-none">Market Configuration</h2>
              <p className="text-slate-400 font-medium text-sm">Review the publications and companies thesocialpundit will track.</p>
            </div>

            <div className="space-y-8 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div>
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-2 flex items-center justify-between">
                  <span>Recommended Publications ({data.suggestedSources.length})</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.suggestedSources.map(s => (
                    <div key={s.name} className="flex items-center justify-between bg-slate-800/40 border border-white/5 p-4 rounded-2xl group transition-all hover:bg-slate-800/60">
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-white font-bold text-[12px] truncate">{s.name}</span>
                        <span className="text-slate-500 text-[9px] truncate">{s.url}</span>
                      </div>
                      <button onClick={() => removeSource(s.name)} className="text-slate-600 hover:text-red-500 p-1 shrink-0 ml-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-2">Key Companies ({data.suggestedCompanies.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {data.suggestedCompanies.map(c => (
                    <div key={c} className="flex items-center space-x-2 bg-slate-800/40 border border-white/5 pl-4 pr-2 py-2 rounded-xl group hover:border-blue-500/30">
                      <span className="text-slate-300 text-[11px] font-bold">🏢 {c}</span>
                      <button onClick={() => removeCompany(c)} className="text-slate-600 hover:text-red-500">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={handleConfirmSourcesAndCompanies}
              className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-blue-900/20 hover:bg-blue-500 transition-all active:scale-[0.98] shrink-0"
            >
              Confirm & Continue to Keywords
            </button>
          </div>
        )}

        {/* Step 3: Brand Voice / Keywords */}
        {step === 3 && data && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col h-full overflow-hidden">
            <div className="text-center shrink-0">
              <h2 className="text-3xl font-black text-white mb-2 tracking-tighter leading-none">Brand Keywords</h2>
              <p className="text-slate-400 font-medium text-sm">Define the core topics that trigger post generation.</p>
            </div>

            <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="bg-blue-600/10 border border-blue-500/20 p-5 rounded-2xl">
                <p className="text-blue-300 text-xs italic leading-relaxed text-center font-medium">"{data.analysis}"</p>
              </div>

              <div>
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 ml-2 flex items-center justify-between">
                  <span>Tracked Keywords ({data.suggestedKeywords.length})</span>
                </h4>
                <div className="flex flex-wrap gap-3">
                  {data.suggestedKeywords.map(kw => (
                    <div key={kw} className="flex items-center space-x-2 bg-slate-800/40 border border-white/5 pl-4 pr-2 py-3 rounded-2xl group transition-all hover:border-blue-500/50">
                      <span className="text-white text-[13px] font-black tracking-tight">#{kw}</span>
                      <button onClick={() => removeKeyword(kw)} className="text-slate-600 hover:text-red-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <input 
                  type="text" 
                  placeholder="Add another keyword..."
                  onKeyDown={(e) => { if(e.key === 'Enter') { addKeyword(e.currentTarget.value); e.currentTarget.value = ''; } }}
                  className="w-full bg-slate-800/30 border border-white/5 rounded-2xl py-4 px-6 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all text-sm"
                />
              </div>
            </div>

            <div className="flex space-x-4 shrink-0">
              <button 
                onClick={() => setStep(2)}
                className="flex-1 bg-slate-800 text-slate-300 py-5 rounded-[2rem] font-black text-lg hover:bg-slate-700 transition-all"
              >
                Back
              </button>
              <button 
                onClick={handleFinalize}
                className="flex-[2] bg-blue-600 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-blue-900/20 hover:bg-blue-500 transition-all active:scale-[0.98]"
              >
                Finalize & Start Tracking
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
};