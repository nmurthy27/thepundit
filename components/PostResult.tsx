
import React, { useState } from 'react';
import { ProcessingResult, Tone } from '../types';
import { getLinkedInIntentUrl } from '../services/linkedinService';

interface PostResultProps {
  result: ProcessingResult;
  onArchive: () => void;
  onRegenerate: (tone: Tone) => void;
  isRegenerating: boolean;
  articleUrl: string;
}

export const PostResult: React.FC<PostResultProps> = ({ 
  result, onArchive, onRegenerate, isRegenerating, articleUrl 
}) => {
  const [activeTab, setActiveTab] = useState<'linkedin' | 'twitter'>('linkedin');
  const [copied, setCopied] = useState(false);
  const [selectedTone, setSelectedTone] = useState<Tone>(result.meta.appliedTone || 'AI Choice');

  const tones: Tone[] = ['Authoritative', 'Provocative', 'Controversial', 'AI Choice'];

  if (result.meta.status === 'SKIP') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center mt-4">
        <h3 className="text-lg font-bold text-amber-800 uppercase tracking-widest">Status: Skip</h3>
        <p className="text-amber-700 text-sm mb-4">Content irrelevant to defined brand keywords.</p>
        <button 
          onClick={() => onRegenerate('AI Choice')}
          className="px-6 py-2.5 bg-amber-600 text-white rounded-xl font-bold text-xs"
        >
          Force Manual Regeneration
        </button>
      </div>
    );
  }

  const { posts } = result;
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

  const handleLinkedInShare = () => {
    const text = getFullText('linkedin');
    window.open(getLinkedInIntentUrl(text), '_blank', 'width=800,height=600');
  };

  const shareTwitter = () => {
    const text = getFullText('twitter');
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  return (
    <div className="bg-white rounded-2xl shadow-inner border border-slate-100 overflow-hidden mt-4 relative">
      {isRegenerating && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
            <p className="text-[10px] font-black text-slate-600 uppercase">Updating Perspective...</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4">
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
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={onArchive}
            className="text-[10px] px-3 py-1.5 rounded-lg font-bold bg-blue-600 text-white hover:bg-blue-700"
          >
            Finalize & Archive
          </button>
        </div>
      </div>

      <div className="p-5">
        <div className="mb-6 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[10px] font-black uppercase text-slate-500">Refine POV Tone</span>
            <span className="text-[10px] font-black text-blue-600">Tone: {result.meta.appliedTone || 'AI Choice'}</span>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {tones.map(t => (
              <button
                key={t}
                onClick={() => setSelectedTone(t)}
                className={`px-2 py-2 rounded-xl text-[9px] font-black transition-all border ${selectedTone === t ? 'bg-white border-blue-500 text-blue-600 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            onClick={() => onRegenerate(selectedTone)}
            className="w-full py-2 bg-slate-900 text-white rounded-xl text-[10px] font-bold hover:bg-slate-800 transition-all"
          >
            Regenerate Draft
          </button>
        </div>

        <button 
          onClick={activeTab === 'linkedin' ? handleLinkedInShare : shareTwitter}
          className={`w-full flex items-center justify-center space-x-2 py-4 rounded-xl font-black text-xs transition-all shadow-lg mb-6 ${activeTab === 'linkedin' ? 'bg-[#0077b5] text-white' : 'bg-black text-white'}`}
        >
          <span>Post to {activeTab === 'linkedin' ? 'LinkedIn' : 'Twitter'}</span>
        </button>

        <div className="space-y-4 text-slate-800 text-sm p-6 bg-slate-50/50 rounded-2xl border border-slate-100/50 relative">
          <div className="absolute top-4 right-4 text-slate-200">
            <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H16.017C14.9124 8 14.017 7.10457 14.017 6V3L14.017 3H21.017V15C21.017 18.3137 18.3307 21 15.017 21H14.017ZM3.017 21L3.017 18C3.017 16.8954 3.91243 16 5.017 16H8.017C8.56928 16 9.017 15.5523 9.017 15V9C9.017 8.44772 8.56928 8 8.017 8H5.017C3.91243 8 3.017 7.10457 3.017 6V3L3.017 3H10.017V15C10.017 18.3137 7.33072 21 4.017 21H3.017Z" /></svg>
          </div>
          {activeTab === 'linkedin' ? (
            <>
              <p className="font-black text-slate-900 text-base leading-tight">{posts.linkedin.hook}</p>
              <p className="whitespace-pre-wrap leading-relaxed">{posts.linkedin.body}</p>
              <p className="italic font-bold text-slate-600">{posts.linkedin.kicker}</p>
              <div className="mt-6 pt-4 border-t border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Source Link</p>
                <p className="text-blue-500 font-black text-xs break-all">Source: {articleUrl}</p>
              </div>
              <p className="text-blue-600 font-black">{posts.linkedin.hashtags.join(' ')}</p>
            </>
          ) : (
            <>
              <p className="leading-relaxed font-bold text-base">{posts.twitter.content}</p>
              <div className="mt-6 pt-4 border-t border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Source Link</p>
                <p className="text-blue-500 font-black text-xs break-all">Source: {articleUrl}</p>
              </div>
              <p className="text-blue-400 font-black">{posts.twitter.hashtags.join(' ')}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
