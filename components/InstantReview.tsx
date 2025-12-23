
import React, { useState } from 'react';
import { Tone, ProcessingResult } from '../types';
import { processUrlInstant } from '../services/geminiService';
import { PostResult } from './PostResult';

interface InstantReviewProps {
  keywords: string[];
  onArchive: (result: ProcessingResult, url: string) => void;
}

export const InstantReview: React.FC<InstantReviewProps> = ({ keywords, onArchive }) => {
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async (tone: Tone = 'AI Choice') => {
    if (!url.trim()) return;
    setIsProcessing(true);
    setError(null);
    try {
      const res = await processUrlInstant(url, keywords, tone);
      setResult(res);
    } catch (err: any) {
      setError(err.message || "Failed to process URL. Please check the link and try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleArchive = () => {
    if (result) {
      onArchive(result, url);
      setResult(null);
      setUrl('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-10">
        <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Instant Review</h2>
        <p className="text-slate-500 font-medium tracking-tight">Paste any industry article link for immediate POV drafting.</p>
      </header>

      <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm mb-10 transition-all focus-within:border-blue-300">
        <div className="flex flex-col space-y-6">
          <div className="relative">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-4">Article Link / URL</label>
            <div className="flex space-x-4">
              <input 
                type="text" 
                value={url} 
                onChange={(e) => setUrl(e.target.value)} 
                placeholder="https://techcrunch.com/2025/01/..." 
                className="flex-1 bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl outline-none transition-all font-medium text-slate-700 focus:bg-white"
              />
              <button 
                onClick={() => handleProcess()}
                disabled={isProcessing || !url.trim()}
                className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black shadow-xl hover:bg-blue-600 disabled:bg-slate-300 transition-all active:scale-95 flex items-center space-x-3 shrink-0"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Reading...</span>
                  </>
                ) : (
                  <span>Generate Insights</span>
                )}
              </button>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 text-slate-400 text-xs font-bold px-2">
            <div className="flex items-center space-x-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              <span>Instant Grounding</span>
            </div>
            <div className="flex items-center space-x-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>Verified Sources</span>
            </div>
            <div className="flex items-center space-x-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              <span>Custom Tone Control</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-6 rounded-2xl mb-8 animate-in fade-in slide-in-from-top-4">
          <p className="text-red-600 font-bold text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
          <div className="flex items-center justify-between mb-4 px-4">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Generated Insights</h3>
            <button onClick={() => setResult(null)} className="text-[10px] font-black uppercase text-slate-400 hover:text-red-500">Clear Result</button>
          </div>
          <PostResult 
            result={result} 
            onArchive={handleArchive} 
            onRegenerate={(tone) => handleProcess(tone)} 
            isRegenerating={isProcessing} 
            articleUrl={url} 
          />
        </div>
      )}
    </div>
  );
};
