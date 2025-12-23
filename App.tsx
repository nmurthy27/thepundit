
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { processNewsItem, searchIndustryNews } from './services/geminiService';
import { AppView, NewsArticle, FeedSource, ProcessingResult, User, OnboardingData, Tone } from './types';
import { DEFAULT_KEYWORDS } from './constants';
import { PostResult } from './components/PostResult';
import { LoginPage } from './components/LoginPage';
import { Onboarding } from './components/Onboarding';
import { InstantReview } from './components/InstantReview';
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

const AUTO_SCAN_INTERVAL = 24 * 60 * 60 * 1000;
const MAX_INBOX_SIZE = 100;

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
  const [lastScanTimestamp, setLastScanTimestamp] = useState<number>(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Dynamic Title Management for SEO
  useEffect(() => {
    const viewTitles: Record<string, string> = {
      [AppView.INBOX]: 'Inbox',
      [AppView.ARCHIVE]: 'Archive',
      [AppView.SOURCES]: 'Sources',
      [AppView.KEYWORDS]: 'Keywords',
      [AppView.COMPANIES]: 'Companies',
      [AppView.INSTANT_REVIEW]: 'Instant Review',
      [AppView.LOGIN]: 'Login',
      [AppView.ONBOARDING]: 'Get Started',
    };
    const title = viewTitles[view] || 'The Authority Engine';
    document.title = `${title} | thesocialpundit`;
  }, [view]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fUser: FirebaseUser | null) => {
      setIsLoadingAuth(true);
      if (fUser) {
        const u: User = {
          uid: fUser.uid,
          name: fUser.displayName || 'thesocialpundit',
          email: fUser.email || '',
          provider: 'email',
          avatar: fUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${fUser.uid}`
        };
        setUser(u);
        setLoginError(null);
        
        const settings = await getUserSettings(fUser.uid);
        if (settings) {
          if (settings.sources?.length > 0) setSources(settings.sources);
          if (settings.keywords?.length > 0) setKeywords(settings.keywords);
          if (settings.companies?.length > 0) setCompanies(settings.companies);
          if (settings.archive) setArchivedArticles(settings.archive);
          if (settings.lastScanTimestamp) setLastScanTimestamp(settings.lastScanTimestamp);
          if (settings.articles) setArticles(settings.articles);
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

  useEffect(() => {
    if (user && view !== AppView.LOGIN && view !== AppView.ONBOARDING) {
      const timer = setTimeout(() => {
        saveUserSettings(user.uid, {
          sources,
          keywords,
          companies,
          archive: archivedArticles,
          articles,
          lastScanTimestamp,
          name: user.name,
          email: user.email
        });
      }, 3000); 
      return () => clearTimeout(timer);
    }
  }, [sources, keywords, companies, archivedArticles, articles, user, view, lastScanTimestamp]);

  useEffect(() => {
    const checkAutoRefresh = () => {
      if (user && view !== AppView.LOGIN && view !== AppView.ONBOARDING) {
        const now = Date.now();
        const timeSinceLastScan = now - lastScanTimestamp;
        if (timeSinceLastScan >= AUTO_SCAN_INTERVAL || lastScanTimestamp === 0) {
          scanFeeds();
        }
      }
    };
    checkAutoRefresh();
    scanIntervalRef.current = setInterval(checkAutoRefresh, 60000);
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, [user, view, lastScanTimestamp, sources, keywords, companies]);

  // Reset selection on view change
  useEffect(() => {
    setSelectedIds([]);
  }, [view]);

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
    setLastScanTimestamp(0);
    if (user) {
      saveUserSettings(user.uid, {
        sources: newSources,
        keywords: data.suggestedKeywords,
        companies: data.suggestedCompanies,
        archive: [],
        lastScanTimestamp: 0,
        name: user.name,
        email: user.email
      });
    }
    setView(AppView.INBOX);
  };

  const skipOnboarding = () => {
    setView(AppView.INBOX);
  };

  const scanFeeds = async () => {
    if (isScanning) return;
    setIsScanning(true);
    
    const activeSources = sources.filter(s => s.active);
    if (activeSources.length === 0) {
      setIsScanning(false);
      return;
    }

    try {
      // PERFORM REAL-TIME KEYWORD SEARCH
      const rawResults = await searchIndustryNews([...keywords, ...companies], activeSources);
      
      const news: NewsArticle[] = rawResults.map(res => ({
        id: Math.random().toString(36).substr(2, 9),
        title: res.title || 'Untitled Industry Update',
        summary: res.summary || 'Critical news matching your tracked market movers and categories.',
        link: res.link || '',
        sourceName: res.sourceName || 'Verified Source',
        publishedDate: new Date().toISOString(),
        matchedKeywords: res.matchedKeywords || [],
        processingStatus: 'IDLE'
      }));

      setArticles(prev => {
        const existingLinks = new Set([...prev, ...archivedArticles].map(a => a.link));
        const filtered = news.filter(n => !existingLinks.has(n.link));
        const combined = [...filtered, ...prev];
        return combined.slice(0, MAX_INBOX_SIZE);
      });

      setLastScanTimestamp(Date.now());
    } catch (err) {
      console.error("Feed scan failed:", err);
    } finally {
      setIsScanning(false);
    }
  };

  const generatePost = async (article: NewsArticle, tone: Tone = 'AI Choice') => {
    setArticles(prev => prev.map(a => a.id === article.id ? { ...a, processingStatus: 'PROCESSING' } : a));
    try {
      const input = `TITLE: ${article.title}\nSUMMARY: ${article.summary}\nSOURCE: ${article.sourceName}`;
      const result = await processNewsItem(input, [...keywords, ...companies], article.link, tone);
      
      setArticles(prev => prev.map(a => a.id === article.id ? { 
        ...a, 
        title: result.posts?.linkedin.hook || a.title,
        processingStatus: 'COMPLETED' as const, 
        result 
      } : a));
    } catch (err) {
      console.error("thesocialpundit Error", err);
      setArticles(prev => prev.map(a => a.id === article.id ? { ...a, processingStatus: 'ERROR' } : a));
    }
  };

  const handleInstantArchive = (result: ProcessingResult, url: string) => {
    const newArticle: NewsArticle = {
      id: Math.random().toString(36).substr(2, 9),
      title: result.posts?.linkedin.hook || 'Instant Review Article',
      summary: result.posts?.linkedin.body.substring(0, 150) + '...' || '',
      link: url,
      sourceName: 'Instant Review',
      publishedDate: new Date().toISOString(),
      matchedKeywords: ['Instant'],
      processingStatus: 'COMPLETED',
      result
    };
    setArchivedArticles(prev => [newArticle, ...prev]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    const currentList = view === AppView.INBOX ? articles : archivedArticles;
    if (selectedIds.length === currentList.length && currentList.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentList.map(a => a.id));
    }
  };

  const bulkDelete = useCallback(() => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Permanently delete ${selectedIds.length} items?`)) {
      const targets = [...selectedIds];
      if (view === AppView.INBOX) {
        setArticles(prev => prev.filter(a => !targets.includes(a.id)));
      } else {
        setArchivedArticles(prev => prev.filter(a => !targets.includes(a.id)));
      }
      setSelectedIds([]);
      setSelectedArticleId(null);
    }
  }, [selectedIds, view]);

  const bulkArchive = useCallback(() => {
    if (selectedIds.length === 0 || view !== AppView.INBOX) return;
    const targets = [...selectedIds];
    setArticles(prev => {
      const selected = prev.filter(a => targets.includes(a.id));
      setArchivedArticles(arc => [...selected, ...arc]);
      return prev.filter(a => !targets.includes(a.id));
    });
    setSelectedIds([]);
    setSelectedArticleId(null);
  }, [selectedIds, view]);

  const deleteArticle = (id: string) => {
    setArticles(prev => prev.filter(a => a.id !== id));
    setArchivedArticles(prev => prev.filter(a => a.id !== id));
    setSelectedIds(prev => prev.filter(i => i !== id));
    if (selectedArticleId === id) setSelectedArticleId(null);
  };

  const archiveArticle = (id: string) => {
    setArticles(prev => {
      const article = prev.find(a => a.id === id);
      if (article) {
        setArchivedArticles(arc => [article, ...arc]);
        return prev.filter(a => a.id !== id);
      }
      return prev;
    });
    setSelectedIds(prev => prev.filter(i => i !== id));
    setSelectedArticleId(null);
  };

  const deleteAll = () => {
    const currentList = view === AppView.INBOX ? articles : archivedArticles;
    if (currentList.length === 0) return;
    if (window.confirm(`Wipe everything in ${view === AppView.INBOX ? 'Inbox' : 'Archive'}?`)) {
      if (view === AppView.INBOX) setArticles([]);
      else setArchivedArticles([]);
      setSelectedIds([]);
      setSelectedArticleId(null);
    }
  };

  const addSource = () => {
    if (!newSourceUrl.trim()) return;
    const id = Math.random().toString(36).substr(2, 9);
    let name = newSourceUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
    const newSource: FeedSource = { id, name, url: newSourceUrl, active: true };
    setSources([...sources, newSource]);
    setNewSourceUrl('');
  };

  const toggleSource = (id: string) => {
    setSources(sources.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  const removeSource = (id: string) => {
    setSources(sources.filter(s => s.id !== id));
  };

  const addKeyword = () => {
    if (!newKeyword.trim() || keywords.includes(newKeyword.trim())) return;
    setKeywords([...keywords, newKeyword.trim()]);
    setNewKeyword('');
  };

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter(k => k !== kw));
  };

  const addCompany = () => {
    if (!newCompany.trim() || companies.includes(newCompany.trim())) return;
    setCompanies([...companies, newCompany.trim()]);
    setNewCompany('');
  };

  const removeCompany = (c: string) => {
    setCompanies(companies.filter(comp => comp !== c));
  };

  const currentList = view === AppView.INBOX ? articles : archivedArticles;

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
          <h1 className="text-xl font-black text-white tracking-widest uppercase">thesocialpundit is thinking...</h1>
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

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Semantic Sidebar Navigation */}
      <aside className="w-64 bg-slate-950 text-white flex flex-col fixed inset-y-0 shadow-2xl z-20">
        <div className="p-6 overflow-y-auto flex-1">
          <header className="flex items-center space-x-3 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-2xl shadow-xl">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-black tracking-tighter leading-none uppercase">thesocial<br/><span className="text-blue-400">pundit</span></h1>
          </header>
          <nav className="space-y-1">
            {[
              { id: AppView.INBOX, label: 'Inbox', count: articles.length, icon: '📥' },
              { id: AppView.INSTANT_REVIEW, label: 'Instant Review', icon: '⚡' },
              { id: AppView.ARCHIVE, label: 'Archive', count: archivedArticles.length, icon: '📁' },
              { id: AppView.SOURCES, label: 'Sources', icon: '📡' },
              { id: AppView.KEYWORDS, label: 'Keywords', icon: '🏷️' },
              { id: AppView.COMPANIES, label: 'Companies', icon: '🏢' }
            ].map(nav => (
              <button 
                key={nav.id}
                onClick={() => { setView(nav.id as AppView); setSelectedArticleId(null); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${view === nav.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-400 hover:bg-slate-800'}`}
                aria-current={view === nav.id ? 'page' : undefined}
              >
                <span className="text-lg leading-none" aria-hidden="true">{nav.icon}</span>
                <span>{nav.label}</span>
                {nav.count !== undefined && nav.count > 0 && <span className="ml-auto bg-slate-800 px-2 py-0.5 rounded text-[10px]">{nav.count}</span>}
              </button>
            ))}
          </nav>
        </div>
        <footer className="p-6 border-t border-slate-900 bg-black/20">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <img src={user.avatar} className="w-10 h-10 rounded-xl bg-slate-700 border border-white/10" alt={`Avatar for ${user.name}`} />
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
          <p className="text-[8px] text-slate-500 text-center mt-3 uppercase font-bold tracking-widest">
            Last scan: {lastScanTimestamp ? new Date(lastScanTimestamp).toLocaleString() : 'Never'}
          </p>
        </footer>
      </aside>

      <main className="flex-1 ml-64 p-10">
        {view === AppView.INSTANT_REVIEW && (
          <InstantReview keywords={[...keywords, ...companies]} onArchive={handleInstantArchive} />
        )}

        {(view === AppView.INBOX || view === AppView.ARCHIVE) && (
          <div className="max-w-4xl mx-auto">
            <header className="mb-6 flex items-end justify-between">
              <div>
                <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">{view === AppView.INBOX ? 'Content Inbox' : 'Post Archive'}</h2>
                <p className="text-slate-500 font-medium tracking-tight">Intelligence scan: <span className="text-blue-600 font-black">{currentList.length} verified signals.</span></p>
              </div>
              {isScanning && (
                <div className="flex items-center space-x-2 text-blue-600 animate-pulse" aria-live="polite">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Discovery Phase...</span>
                </div>
              )}
            </header>

            {/* Mass Management Toolbar */}
            <nav className="bg-white border-2 border-slate-100 rounded-2xl p-4 mb-8 flex items-center justify-between shadow-sm sticky top-0 z-20 backdrop-blur-md" aria-label="Bulk actions">
              <div className="flex items-center space-x-6">
                <button 
                  onClick={toggleSelectAll}
                  className="flex items-center space-x-3 group"
                  aria-label={selectedIds.length === currentList.length ? "Deselect all items" : "Select all items"}
                >
                  <div className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${selectedIds.length > 0 ? 'bg-blue-600 border-blue-600' : 'bg-slate-50 border-slate-200 group-hover:border-blue-400'}`}>
                    {selectedIds.length > 0 && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                    )}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {selectedIds.length === currentList.length && currentList.length > 0 ? 'Deselect All' : `Select All (${selectedIds.length})`}
                  </span>
                </button>
                
                {selectedIds.length > 0 && (
                  <div className="flex items-center space-x-2 border-l border-slate-100 pl-6 animate-in fade-in slide-in-from-left-2">
                    {view === AppView.INBOX && (
                      <button onClick={bulkArchive} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-[10px] font-black uppercase hover:bg-blue-100 transition-colors">Archive Selected</button>
                    )}
                    <button onClick={bulkDelete} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-[10px] font-black uppercase hover:bg-red-100 transition-colors">Delete Selected</button>
                    <button onClick={() => setSelectedIds([])} className="text-[10px] font-black uppercase text-slate-400 px-4 hover:text-slate-600">Cancel</button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-4">
                <button 
                  onClick={deleteAll} 
                  disabled={currentList.length === 0}
                  className="text-[10px] font-black uppercase text-slate-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Clear All
                </button>
              </div>
            </nav>

            <section className="space-y-6" aria-label="Articles list">
              {currentList.length === 0 ? (
                <div className="bg-white border-4 border-dashed border-slate-200 rounded-[2.5rem] p-24 text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 00-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <p className="text-slate-400 font-black uppercase tracking-widest text-sm">
                    {view === AppView.INBOX ? 'Inbox is empty. Refresh to scan the web.' : 'Your archive is empty.'}
                  </p>
                </div>
              ) : (
                currentList.map(article => {
                  const isSelected = selectedIds.includes(article.id);
                  const isExpanded = selectedArticleId === article.id;
                  
                  return (
                    <article 
                      key={article.id} 
                      className={`group relative bg-white border-2 p-8 rounded-[2.5rem] shadow-sm transition-all duration-300 cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-50/20' : 'border-slate-100 hover:border-blue-300 hover:shadow-2xl'}`}
                      onClick={() => setSelectedArticleId(isExpanded ? null : article.id)}
                    >
                      {/* Selection UI */}
                      <div 
                        className="absolute top-8 left-[-12px] z-20" 
                        onClick={(e) => { e.stopPropagation(); toggleSelect(article.id); }}
                      >
                        <div className={`w-6 h-6 rounded-lg border-2 shadow-md transition-all flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600 scale-110' : 'bg-white border-slate-200 group-hover:border-blue-400'}`}>
                          {isSelected && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                          )}
                        </div>
                      </div>

                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteArticle(article.id); }}
                        className="absolute top-8 right-8 text-slate-300 hover:text-red-500 transition-colors z-10"
                        aria-label="Delete article"
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
                      <h3 className="text-2xl font-black text-slate-900 mb-2 leading-tight">{article.title}</h3>
                      <p className="text-slate-500 font-medium line-clamp-2 mb-4">{article.summary}</p>
                      
                      <div className="mb-6 p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] shadow-sm">
                        <p className="text-[9px] font-black uppercase text-slate-400 mb-3 tracking-[0.2em]">Live Grounding Check</p>
                        <a 
                          href={article.link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center space-x-4 group/link transition-all"
                        >
                          <div className="p-2.5 bg-white border border-slate-200 rounded-xl group-hover/link:border-blue-500 group-hover/link:text-blue-600 shadow-sm transition-all shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-bold text-blue-600 truncate underline leading-none mb-1">{article.link}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verify Content</p>
                          </div>
                        </a>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-slate-400">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <time className="text-xs font-black uppercase tracking-widest" dateTime={article.publishedDate}>
                            {new Date(article.publishedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                          </time>
                        </div>
                        <div className="flex items-center space-x-4">
                          {article.processingStatus === 'IDLE' ? (
                            <button onClick={(e) => { e.stopPropagation(); generatePost(article, 'AI Choice'); setSelectedArticleId(article.id); }} className="bg-slate-900 text-white px-6 py-2.5 font-black text-xs hover:bg-blue-600 transition-all rounded-xl shadow-lg">Verify & Draft</button>
                          ) : (
                            <div className="flex items-center space-x-2">
                              {article.processingStatus === 'COMPLETED' && <span className="text-[10px] font-black text-green-600 uppercase">Draft Ready</span>}
                              {article.processingStatus === 'PROCESSING' && <span className="text-[10px] font-black text-blue-600 uppercase animate-pulse">Grounding...</span>}
                              {article.processingStatus === 'ERROR' && <span className="text-[10px] font-black text-red-600 uppercase">Error</span>}
                            </div>
                          )}
                          <span className={`text-xs font-black uppercase tracking-widest ${isExpanded ? 'text-blue-600' : 'text-slate-300'}`}>{isExpanded ? 'Hide' : 'Expand'}</span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-8 pt-8 border-t-2 border-slate-50" onClick={e => e.stopPropagation()}>
                          {article.result && <PostResult result={article.result} onArchive={() => archiveArticle(article.id)} onRegenerate={(tone) => generatePost(article, tone)} isRegenerating={article.processingStatus === 'PROCESSING'} articleUrl={article.link} />}
                          {article.processingStatus === 'PROCESSING' && <div className="py-12 text-center"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><p className="font-black text-slate-800">Grounding draft in live content...</p></div>}
                          {article.processingStatus === 'IDLE' && <div className="py-8 text-center text-slate-400 font-bold">Initialize verification to see insights.</div>}
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </section>
          </div>
        )}
        
        {view === AppView.SOURCES && (
          <section className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-black text-slate-900 mb-8 tracking-tight">Intelligence Sources</h2>
            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 mb-8 flex space-x-4">
              <input type="text" value={newSourceUrl} onChange={e => setNewSourceUrl(e.target.value)} placeholder="Publication URL" className="flex-1 bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl outline-none transition-all font-medium" />
              <button onClick={addSource} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg">Add</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sources.map(s => (
                <div key={s.id} className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm">
                  <div className="flex items-center space-x-4">
                    <input type="checkbox" checked={s.active} onChange={() => toggleSource(s.id)} className="w-5 h-5 rounded text-blue-600" id={`source-${s.id}`} />
                    <label htmlFor={`source-${s.id}`} className="font-black text-slate-800 cursor-pointer">{s.name}</label>
                  </div>
                  <button onClick={() => removeSource(s.id)} className="text-slate-300 hover:text-red-500 transition-colors" aria-label={`Remove source ${s.name}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
              ))}
            </div>
          </section>
        )}
        
        {view === AppView.KEYWORDS && (
          <section className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-black text-slate-900 mb-8 tracking-tight">Truth Categories</h2>
            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 mb-10 flex space-x-4">
              <input type="text" value={newKeyword} onChange={e => setNewKeyword(e.target.value)} placeholder="Topic keyword..." className="flex-1 bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl outline-none font-medium" />
              <button onClick={addKeyword} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg">Add</button>
            </div>
            <div className="flex flex-wrap gap-4">
              {keywords.map(kw => (
                <div key={kw} className="bg-white border-2 border-slate-100 px-6 py-3 rounded-2xl flex items-center group shadow-sm">
                  <span className="font-black text-slate-700 mr-4">#{kw}</span>
                  <button onClick={() => removeKeyword(kw)} className="text-slate-200 group-hover:text-red-500" aria-label={`Remove keyword ${kw}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
              ))}
            </div>
          </section>
        )}

        {view === AppView.COMPANIES && (
          <section className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-black text-slate-900 mb-8 tracking-tight">Market Movers</h2>
            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 mb-10 flex space-x-4">
              <input type="text" value={newCompany} onChange={e => setNewCompany(e.target.value)} placeholder="Company name..." className="flex-1 bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl outline-none font-medium" />
              <button onClick={addCompany} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg">Track</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {companies.map(c => (
                <div key={c} className="bg-white border-2 border-slate-100 p-6 rounded-[2rem] flex items-center justify-between shadow-sm">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-slate-950 text-white rounded-2xl flex items-center justify-center font-black text-xl" aria-hidden="true">{c.charAt(0)}</div>
                    <span className="font-black text-slate-800">{c}</span>
                  </div>
                  <button onClick={() => removeCompany(c)} className="text-slate-200 hover:text-red-500 transition-colors" aria-label={`Remove company ${c}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default App;
