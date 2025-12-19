
import React, { useState } from 'react';
import { ProcessingResult, Tone } from '../types';

interface PostResultProps {
  result: ProcessingResult;
  onArchive: () => void;
  onRegenerate: (tone: Tone) => void;
  isRegenerating: boolean;
  articleUrl: string;
}

export const PostResult: React.FC<PostResultProps> = ({ result, onArchive, onRegenerate, isRegenerating, articleUrl }) => {
  const [activeTab, setActiveTab] = useState<'linkedin' | 'twitter'>('linkedin');
  const [copied, setCopied] = useState(false);
  const [selectedTone, setSelectedTone] = useState<Tone>(result.meta.appliedTone || 'AI Choice');

  const tones: Tone[] = ['Authoritative', 'Provocative', 'Controversial', 'AI Choice'];

  if (result.meta.status === 'SKIP') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center mt-4">
        <h3 className="text-lg font-bold text-amber-800">STATUS: SKIP</h3>
        <p className="text-amber-700 text-sm mb-4">Keyword match failed or content irrelevant.</p>
        
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {tones.map(t => (
            <button
              key={t}
              onClick={() => setSelectedTone(t)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${selectedTone === t ? 'bg-amber-600 text-white shadow-lg' : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-100'}`}
            >
              {t}
            </button>
          ))}
        </div>

        <button 
          onClick={() => onRegenerate(selectedTone)}
          className="px-6 py-2.5 bg-amber-600 text-white rounded-xl font-bold text-xs hover:bg-amber-700 shadow-lg shadow-amber-900/20"
        >
          Force Regeneration
        </button>
      </div>
    );
  }

  const { posts, meta } = result;
  if (!posts) return null;

  const getFullText = (platform: 'linkedin' | 'twitter') => {
    if (platform === 'linkedin') {
      return `${posts.linkedin.hook}\n\n${posts.linkedin.body}\n\n${posts.linkedin.kicker}\n\nSource: ${articleUrl}\n\n${posts.linkedin.hashtags.join(' ')}`;
    } else {
      return `${posts.twitter.content}\n\nSource: ${articleUrl}\n\n${posts.twitter.hashtags.join(' ')}`;
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getFullText(activeTab));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnSocial = (platform: 'linkedin' | 'twitter') => {
    const text = getFullText(platform);
    let url = '';
    
    if (platform === 'linkedin') {
      url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}&summary=${encodeURIComponent(text)}`;
    } else {
      url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    }
    
    window.open(url, '_blank', 'width=600,height=400');
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden mt-4 animate-in slide-in-from-top-4 duration-300 relative">
      {isRegenerating && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
            <p className="text-[10px] font-bold text-slate-600 uppercase">Regenerating in {selectedTone} tone...</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4">
        <div className="flex">
          <button
            onClick={() => setActiveTab('linkedin')}
            className={`px-4 py-3 font-bold text-xs transition-colors flex items-center space-x-2 ${activeTab === 'linkedin' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.3 3.3 0 0 0-3.3-3.3c-.9 0-1.9.4-2.4 1.2v-1.1H10v8.5h2.8v-4.5c0-1.2.2-2.4 1.7-2.4 1.5 0 1.5 1.4 1.5 2.5v4.4H18.8M6.7 8.5h2.8V19H6.7V8.5m1.4-1.2c-.9 0-1.6-.7-1.6-1.6 0-.9.7-1.6 1.6-1.6.9 0 1.6.7 1.6 1.6 0 .9-.7 1.6-1.6 1.6z" /></svg>
            <span>LinkedIn</span>
          </button>
          <button
            onClick={() => setActiveTab('twitter')}
            className={`px-4 py-3 font-bold text-xs transition-colors flex items-center space-x-2 ${activeTab === 'twitter' ? 'text-blue-400 border-b-2 border-blue-400 bg-white' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            <span>Twitter (X)</span>
          </button>
        </div>
        <div className="flex items-center space-x-2 py-2">
          <button
            onClick={copyToClipboard}
            className={`text-[10px] px-3 py-1.5 rounded-lg font-bold transition-all ${copied ? 'bg-green-500 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
          >
            {copied ? 'Copied!' : 'Copy Draft'}
          </button>
          <button
            onClick={onArchive}
            className="text-[10px] px-3 py-1.5 rounded-lg font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all"
          >
            Finalize & Archive
          </button>
        </div>
      </div>

      <div className="p-5">
        {/* Tone Selection Bar */}
        <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Select Draft Tone</span>
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Active: {result.meta.appliedTone || 'AI Choice'}</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {tones.map(t => (
              <button
                key={t}
                onClick={() => setSelectedTone(t)}
                className={`px-2 py-2 rounded-lg text-[9px] font-black transition-all border ${selectedTone === t ? 'bg-white border-blue-500 text-blue-600 shadow-sm ring-1 ring-blue-500/20' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            onClick={() => onRegenerate(selectedTone)}
            className="w-full mt-3 py-2 bg-slate-800 text-white rounded-lg text-[10px] font-bold hover:bg-slate-700 transition-all flex items-center justify-center space-x-2"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Regenerate in Selected Tone</span>
          </button>
        </div>

        <div className="mb-4 flex space-x-2">
          <button 
            onClick={() => shareOnSocial('linkedin')}
            className="flex-1 flex items-center justify-center space-x-2 bg-[#0077b5] text-white py-2 rounded-lg font-bold text-xs hover:bg-[#00669c] transition-all shadow-sm"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.3 3.3 0 0 0-3.3-3.3c-.9 0-1.9.4-2.4 1.2v-1.1H10v8.5h2.8v-4.5c0-1.2.2-2.4 1.7-2.4 1.5 0 1.5 1.4 1.5 2.5v4.4H18.8M6.7 8.5h2.8V19H6.7V8.5m1.4-1.2c-.9 0-1.6-.7-1.6-1.6 0-.9.7-1.6 1.6-1.6.9 0 1.6.7 1.6 1.6 0 .9-.7 1.6-1.6 1.6z" /></svg>
            <span>Share Draft on LinkedIn</span>
          </button>
          <button 
            onClick={() => shareOnSocial('twitter')}
            className="flex-1 flex items-center justify-center space-x-2 bg-black text-white py-2 rounded-lg font-bold text-xs hover:bg-slate-900 transition-all shadow-sm"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            <span>Share Draft on Twitter</span>
          </button>
        </div>

        {activeTab === 'linkedin' ? (
          <div className="space-y-3 text-slate-800 text-sm p-4 bg-slate-50 rounded-lg border border-slate-100">
            <p className="font-bold text-blue-900 leading-tight">{posts.linkedin.hook}</p>
            <p className="whitespace-pre-wrap leading-relaxed">{posts.linkedin.body}</p>
            <p className="italic text-slate-600">{posts.linkedin.kicker}</p>
            <p className="text-blue-500 font-medium underline break-all text-[11px]">Source: {articleUrl}</p>
            <p className="text-blue-600 font-medium">{posts.linkedin.hashtags.join(' ')}</p>
          </div>
        ) : (
          <div className="space-y-3 text-slate-800 text-sm p-4 bg-slate-50 rounded-lg border border-slate-100">
            <p className="leading-relaxed">{posts.twitter.content}</p>
            <p className="text-blue-500 font-medium underline break-all text-[11px]">Source: {articleUrl}</p>
            <p className="text-blue-400 font-medium">{posts.twitter.hashtags.join(' ')}</p>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex space-x-3">
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Sentiment</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                meta.sentiment === 'Positive' ? 'bg-green-100 text-green-700' :
                meta.sentiment === 'Negative' ? 'bg-red-100 text-red-700' :
                'bg-slate-100 text-slate-700'
              }`}>{meta.sentiment}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Virality</span>
              <span className="text-[10px] font-bold text-slate-700">{meta.viralityScore}/10</span>
            </div>
          </div>
          <span className="text-[9px] uppercase font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">{meta.sourceTopic}</span>
        </div>
      </div>
    </div>
  );
};
