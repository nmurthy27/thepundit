
import React, { useState, useCallback, useEffect } from 'react';
import { processNewsItem } from './services/geminiService';
import { AppView, NewsArticle, FeedSource, ProcessingResult, User, OnboardingData, Tone } from './types';
import { DEFAULT_KEYWORDS } from './constants';
import { PostResult } from './components/PostResult';
import { LoginPage } from './components/LoginPage';
import { Onboarding } from './components/Onboarding';
import { auth, loginWithEmail, registerWithEmail, logout, saveUserSettings, getUserSettings } from './services/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

const INITIAL_SOURCES: FeedSource[] = [
  { id: 'ooh-1', name: 'Billboard Insider', url: 'https://billboardinsider.com', active: true },
  { id: 'ooh-2', name: 'OOH Today', url: 'https://oohtoday.com', active: true },
  { id: 'ooh-3', name: 'DailyDOOH', url: 'https://dailydooh.com', active: true },
  { id: 'ooh-4', name: 'Sixteen:Nine', url: 'https://sixteen-nine.net', active: true },
  { id: 'ooh-5', name: 'Digital Signage Today', url: 'https://digitalsignagetoday.com', active: true },
  { id: 'ooh-6', name: 'OAAA Insights', url: 'https://oaaa.org', active: true },
  { id: 'ooh-7', name: 'The OOH Digest', url: 'https://oohdigest.com', active: true },
  { id: 'gen-1', name: 'Ad Age', url: 'https://adage.com', active: true },
  { id: 'gen-2', name: 'Adweek', url: 'https://adweek.com', active: true },
  { id: 'gen-3', name: 'The Drum', url: 'https://thedrum.com', active: true },
  { id: 'gen-4', name: 'Campaign', url: 'https://campaignlive.co.uk', active: true },
  { id: 'gen-5', name: 'Digiday', url: 'https://digiday.com', active: true },
  { id: 'at-1', name: 'AdExchanger', url: 'https://adexchanger.com', active: true },
  { id: 'at-2', name: 'ExchangeWire', url: 'https://exchangewire.com', active: true },
  { id: 'at-3', name: 'MarTech', url: 'https://martech.org', active: true },
  { id: 'at-4', name: 'MediaPost', url: 'https://mediapost.com', active: true }
];

const INITIAL_COMPANIES = ['Google', 'Meta', 'Amazon', 'The Trade Desk', 'JCDecaux', 'Clear Channel', 'Lamar Advertising'];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<AppView>(AppView.LOGIN);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [keywords, setKeywords] = useState<string[]>(DEFAULT_KEYWORDS);
  const [newKeyword, setNewKeyword] = useState('');
  const [companies, setCompanies] = useState<string[]>(INITIAL_COMPANIES);
  const [newCompany, setNewCompany] = useState('');
  const [sources, setSources] = useState<FeedSource[]>(INITIAL_SOURCES);
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [archivedArticles, setArchivedArticles] = useState<NewsArticle[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  // Auth State Listener & Initial Settings Sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fUser: FirebaseUser | null) => {
      setIsLoadingAuth(true);
      if (fUser) {
        const u: User = {
          uid: fUser.uid,
          name: fUser.displayName || 'The Pundit',
          email: fUser.email || '',
          provider: 'email',
          avatar: fUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${fUser.uid}`
        };
        setUser(u);
        setLoginError(null);
        
        const settings = await getUserSettings(fUser.uid);
        if (settings && (settings.sources?.length > 0 || settings.keywords?.length > 0)) {
          if (settings.sources) setSources(settings.sources);
          if (settings.keywords) setKeywords(settings.keywords);
          if (settings.companies) setCompanies(settings.companies);
          if (settings.archive) setArchivedArticles(settings.archive);
          setView(AppView.INBOX);
        } else {
          setView(AppView.ONBOARDING);
        }
      } else {
        setUser(null);
        setView(AppView.LOGIN);
      }
      setIsLoadingAuth(false);
    });
    return unsubscribe;
  }, []);

  // Periodic Auto-Save to Firestore
  useEffect(() => {
    if (user && view !== AppView.LOGIN && view !== AppView.ONBOARDING) {
      const timer = setTimeout(() => {
        saveUserSettings(user.uid, {
          sources,
          keywords,
          companies,
          archive: archivedArticles,
          name: user.name,
          email: user.email
        });
      }, 3000); // Debounce saves
      return () => clearTimeout(timer);
    }
  }, [sources, keywords, companies, archivedArticles, user, view]);

  const handleLogin = async (email: string, pass: string) => {
    setLoginError(null);
    try {
      await loginWithEmail(email, pass);
    } catch (err: any) {
      setLoginError(err.message);
    }
  };

  const handleRegister = async (name: string, email: string, pass: string) => {
    setLoginError(null);
    try {
      await registerWithEmail(name, email, pass);
    } catch (err: any) {
      setLoginError(err.message);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setView(AppView.LOGIN);
    setLoginError(null);
  };

  const completeOnboarding = (data: OnboardingData) => {
    const newSources: FeedSource[] = data.suggestedSources.map(s => ({
      id: Math.random().toString(36).substr(2, 9),
      name: s.name,
      url: s.url,
      active: true
    }));
    
    setSources(newSources);
    setKeywords(data.suggestedKeywords);
    setCompanies(data.suggestedCompanies);
    
    if (user) {
      saveUserSettings(user.uid, {
        sources: newSources,
        keywords: data.suggestedKeywords,
        companies: data.suggestedCompanies,
        archive: [],
        name: user.name,
        email: user.email
      });
    }
    
    setView(AppView.INBOX);
  };

  const skipOnboarding = () => {
    setView(AppView.INBOX);
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()]);
      setNewKeyword('');
    }
  };

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter(k => k !== kw));
  };

  const addCompany = () => {
    if (newCompany.trim() && !companies.includes(newCompany.trim())) {
      setCompanies([...companies, newCompany.trim()]);
      setNewCompany('');
    }
  };

  const removeCompany = (company: string) => {
    setCompanies(companies.filter(c => c !== company));
  };

  const addSource = () => {
    if (newSourceUrl.trim()) {
      try {
        const urlStr = newSourceUrl.startsWith('http') ? newSourceUrl : `https://${newSourceUrl}`;
        const urlObj = new URL(urlStr);
        const name = urlObj.hostname.replace('www.', '');
        setSources([...sources, { id: Date.now().toString(), url: urlObj.href, name, active: true }]);
        setNewSourceUrl('');
      } catch (e) {
        alert('Please enter a valid URL');
      }
    }
  };

  const toggleSource = (id: string) => {
    setSources(sources.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  const removeSource = (id: string) => {
    setSources(sources.filter(s => s.id !== id));
  };

  const deleteArticle = (id: string) => {
    setArticles(articles.filter(a => a.id !== id));
    setArchivedArticles(archivedArticles.filter(a => a.id !== id));
    if (selectedArticleId === id) setSelectedArticleId(null);
  };

  const archiveArticle = (id: string) => {
    const article = articles.find(a => a.id === id);
    if (article) {
      setArchivedArticles([article, ...archivedArticles]);
      setArticles(articles.filter(a => a.id !== id));
      setSelectedArticleId(null);
    }
  };

  const scanFeeds = async () => {
    setIsScanning(true);
    await new Promise(r => setTimeout(r, 1500));

    const activeSources = sources.filter(s => s.active);
    if (activeSources.length === 0) {
      alert("No active sources to scan.");
      setIsScanning(false);
      return;
    }

    const mockArticles: NewsArticle[] = activeSources.flatMap(source => {
      if (Math.random() > 0.4) {
        const companyMention = companies.length > 0 ? companies[Math.floor(Math.random() * companies.length)] : 'Industry';
        const keywordMention = keywords.length > 0 ? keywords[Math.floor(Math.random() * keywords.length)] : 'Innovation';

        const titlePool = [
          `${companyMention} sets a new standard for ${keywordMention}`,
          `Why ${source.name} believes ${companyMention} is winning in ${keywordMention}`,
          `Analysis: The implications of ${companyMention}'s latest ${keywordMention} push`,
          `How ${keywordMention} is reshaping the industry for players like ${companyMention}`
        ];
        const randomTitle = titlePool[Math.floor(Math.random() * titlePool.length)];
        
        return [{
          id: Math.random().toString(36).substr(2, 9),
          title: randomTitle,
          summary: `New insights from ${source.name} detail how ${companyMention} is leveraging ${keywordMention} to drive growth and market share in the current economic climate. Experts suggest this is a pivotal moment for the industry.`,
          link: source.url,
          sourceName: source.name,
          publishedDate: new Date().toISOString(),
          matchedKeywords: [companyMention, keywordMention],
          processingStatus: 'IDLE' as const
        }];
      }
      return [];
    });

    setArticles(prev => {
      const existingTitles = new Set([...prev, ...archivedArticles].map(a => a.title));
      const news = mockArticles.filter(f => !existingTitles.has(f.title));
      return [...news, ...prev];
    });
    setIsScanning(false);
  };

  const generatePost = async (article: NewsArticle, tone: Tone = 'AI Choice') => {
    setArticles(prev => prev.map(a => a.id === article.id ? { ...a, processingStatus: 'PROCESSING' } : a));
    try {
      const input = `TITLE: ${article.title}\nSUMMARY: ${article.summary}\nSOURCE: ${article.sourceName}`;
      const result = await processNewsItem(input, [...keywords, ...companies], article.link, tone);
      setArticles(prev => prev.map(a => a.id === article.id ? { ...a, processingStatus: 'COMPLETED' as const, result } : a));
    } catch (err) {
      console.error("ThePundit: Generation Error", err);
      setArticles(prev => prev.map(a => a.id === article.id ? { ...a, processingStatus: 'ERROR' } : a));
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
          <h1 className="text-xl font-black text-white tracking-widest uppercase">Initializing ThePundit...</h1>
        </div>
      </div>
    );
  }

  if (view === AppView.LOGIN || !user) {
    return <LoginPage onLogin={handleLogin} onRegister={handleRegister} error={loginError} />;
  }

  if (view === AppView.ONBOARDING) {
    return <Onboarding userName={user.name} onComplete={completeOnboarding} onSkip={skipOnboarding} />;
  }

  const activeTabClass = "bg-blue-600 text-white shadow-lg shadow-blue-900/40";
  const inactiveTabClass = "text-slate-400 hover:bg-slate-800";

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 text-white flex flex-col fixed inset-y-0 shadow-2xl z-20">
        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex items-center space-x-3 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-2xl shadow-xl shadow-blue-900/40">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-black tracking-tighter leading-none">THE<br/><span className="text-blue-400">PUNDIT</span></h1>
          </div>

          <nav className="space-y-1">
            {[
              { id: AppView.INBOX, label: 'Inbox', count: articles.length },
              { id: AppView.ARCHIVE, label: 'Archive', count: archivedArticles.length },
              { id: AppView.SOURCES, label: 'Sources' },
              { id: AppView.KEYWORDS, label: 'Keywords' },
              { id: AppView.COMPANIES, label: 'Companies' }
            ].map(nav => (
              <button 
                key={nav.id}
                onClick={() => { setView(nav.id as AppView); setSelectedArticleId(null); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${view === nav.id ? activeTabClass : inactiveTabClass}`}
              >
                <span>{nav.label}</span>
                {nav.count !== undefined && nav.count > 0 && <span className="ml-auto bg-slate-800 px-2 py-0.5 rounded text-[10px]">{nav.count}</span>}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="p-6 border-t border-slate-900 bg-black/20">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <img src={user.avatar} className="w-10 h-10 rounded-xl bg-slate-700 shadow-lg border border-white/10" alt="Avatar" />
            <div className="overflow-hidden">
              <p className="text-xs font-black truncate">{user.name}</p>
              <button onClick={handleLogout} className="text-[10px] text-slate-500 hover:text-white uppercase font-black tracking-widest transition-colors">Sign Out</button>
            </div>
          </div>
          <button 
            onClick={scanFeeds}
            disabled={isScanning}
            className={`w-full py-3.5 rounded-xl font-black text-sm shadow-xl transition-all ${isScanning ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-900 hover:bg-blue-50 active:scale-95'}`}
          >
            {isScanning ? 'Scanning...' : 'Refresh Inbox'}
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64 p-10">
        {(view === AppView.INBOX || view === AppView.ARCHIVE) && (
          <div className="max-w-4xl mx-auto">
            <header className="mb-10 flex items-end justify-between">
              <div>
                <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">{view === AppView.INBOX ? 'Content Inbox' : 'Post Archive'}</h2>
                <p className="text-slate-500 font-medium">Monitoring {sources.filter(s => s.active).length} premium industry channels for brand signals.</p>
              </div>
            </header>

            <div className="space-y-6">
              {(view === AppView.INBOX ? articles : archivedArticles).length === 0 ? (
                <div className="bg-white border-4 border-dashed border-slate-200 rounded-[2.5rem] p-24 text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 00-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <p className="text-slate-400 font-black uppercase tracking-widest text-sm">
                    {view === AppView.INBOX ? 'Inbox is empty. Refresh to scan.' : 'No archived posts found.'}
                  </p>
                </div>
              ) : (
                (view === AppView.INBOX ? articles : archivedArticles).map(article => (
                  <div key={article.id} className="group relative bg-white border-2 border-slate-100 p-8 rounded-[2.5rem] shadow-sm hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-900/5 transition-all cursor-pointer" onClick={() => setSelectedArticleId(selectedArticleId === article.id ? null : article.id)}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteArticle(article.id); }}
                      className="absolute top-8 right-8 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                    <div className="flex items-center space-x-3 mb-4">
                      <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">{article.sourceName}</span>
                      <div className="flex space-x-2">
                        {article.matchedKeywords.map(kw => (
                          <span key={kw} className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">{companies.includes(kw) ? '🏢 ' : '#'}{kw}</span>
                        ))}
                      </div>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-4 leading-tight">{article.title}</h3>
                    <p className="text-slate-500 font-medium line-clamp-2 mb-6">{article.summary}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-300 uppercase tracking-widest">{new Date(article.publishedDate).toLocaleDateString()}</span>
                      <div className="flex items-center space-x-4">
                        {article.processingStatus === 'IDLE' ? (
                          <div className="flex items-center bg-slate-50 border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                             <button onClick={(e) => { e.stopPropagation(); generatePost(article, 'AI Choice'); setSelectedArticleId(article.id); }} className="bg-slate-900 text-white px-6 py-2.5 font-black text-xs hover:bg-blue-600 transition-all">Draft Insights</button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            {article.processingStatus === 'COMPLETED' && <span className="text-[10px] font-black text-green-600 uppercase">Draft Ready ({article.result?.meta.appliedTone})</span>}
                            {article.processingStatus === 'PROCESSING' && <span className="text-[10px] font-black text-blue-600 uppercase animate-pulse">Analyzing...</span>}
                            {article.processingStatus === 'ERROR' && <span className="text-[10px] font-black text-red-600 uppercase">Error</span>}
                          </div>
                        )}
                        <span className={`text-xs font-black uppercase tracking-widest ${selectedArticleId === article.id ? 'text-blue-600' : 'text-slate-300 group-hover:text-slate-500'}`}>{selectedArticleId === article.id ? 'Hide' : 'Expand'}</span>
                      </div>
                    </div>
                    {selectedArticleId === article.id && (
                      <div className="mt-10 pt-10 border-t-2 border-slate-50" onClick={e => e.stopPropagation()}>
                        {article.result && <PostResult result={article.result} onArchive={() => archiveArticle(article.id)} onRegenerate={(tone) => generatePost(article, tone)} isRegenerating={article.processingStatus === 'PROCESSING'} articleUrl={article.link} />}
                        {article.processingStatus === 'PROCESSING' && <div className="py-16 text-center"><div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><p className="font-black text-slate-800">ThePundit is refining your perspective...</p></div>}
                        {article.processingStatus === 'IDLE' && <div className="py-10 text-center text-slate-400 font-bold">Click "Draft Insights" to start the engine.</div>}
                        {article.processingStatus === 'ERROR' && <div className="py-10 text-center text-red-500 font-bold">Something went wrong. Please try again.</div>}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {view === AppView.SOURCES && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-black text-slate-900 mb-8 tracking-tight">Intelligence Sources</h2>
            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 mb-8 flex space-x-4 shadow-sm">
              <input type="text" value={newSourceUrl} onChange={e => setNewSourceUrl(e.target.value)} placeholder="RSS Feed URL" className="flex-1 bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl focus:border-blue-500 outline-none transition-all font-medium" />
              <button onClick={addSource} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-blue-200">Add</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sources.map(s => (
                <div key={s.id} className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center space-x-4">
                    <input type="checkbox" checked={s.active} onChange={() => toggleSource(s.id)} className="w-5 h-5 rounded text-blue-600 border-slate-300" />
                    <span className="font-black text-slate-800">{s.name}</span>
                  </div>
                  <button onClick={() => removeSource(s.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {view === AppView.KEYWORDS && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-black text-slate-900 mb-8 tracking-tight">Truth Categories</h2>
            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 mb-10 flex space-x-4 shadow-sm">
              <input type="text" value={newKeyword} onChange={e => setNewKeyword(e.target.value)} placeholder="New industry keyword" className="flex-1 bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl focus:border-blue-500 outline-none transition-all font-medium" />
              <button onClick={addKeyword} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-blue-200">Add</button>
            </div>
            <div className="flex flex-wrap gap-4">
              {keywords.map(kw => (
                <div key={kw} className="bg-white border-2 border-slate-100 px-6 py-3 rounded-2xl flex items-center shadow-sm hover:border-blue-200 transition-all group">
                  <span className="font-black text-slate-700 mr-4">#{kw}</span>
                  <button onClick={() => removeKeyword(kw)} className="text-slate-200 group-hover:text-red-500 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === AppView.COMPANIES && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-black text-slate-900 mb-8 tracking-tight">Market Movers</h2>
            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 mb-10 flex space-x-4 shadow-sm">
              <input type="text" value={newCompany} onChange={e => setNewCompany(e.target.value)} placeholder="Company to track..." className="flex-1 bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl focus:border-blue-500 outline-none transition-all font-medium" />
              <button onClick={addCompany} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-blue-200">Track</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {companies.map(c => (
                <div key={c} className="bg-white border-2 border-slate-100 p-6 rounded-[2rem] flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-slate-950 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-inner">{c.charAt(0)}</div>
                    <span className="font-black text-slate-800">{c}</span>
                  </div>
                  <button onClick={() => removeCompany(c)} className="text-slate-200 hover:text-red-500 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
