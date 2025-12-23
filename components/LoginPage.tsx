
import React, { useState } from 'react';

interface LoginPageProps {
  onLogin: (email: string, pass: string) => void;
  onRegister: (name: string, email: string, pass: string) => void;
  error?: string | null;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onRegister, error }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isRegister && !name)) return;

    setIsSubmitting(true);
    try {
      if (isRegister) {
        await onRegister(name, email, password);
      } else {
        await onLogin(email, password);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Dynamic Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-40 pointer-events-none">
        <div className="absolute top-[-15%] left-[-15%] w-[60%] h-[60%] bg-blue-900/30 rounded-full blur-[140px] animate-pulse"></div>
        <div className="absolute bottom-[-15%] right-[-15%] w-[60%] h-[60%] bg-indigo-900/30 rounded-full blur-[140px] animate-pulse delay-700"></div>
      </div>

      <div className="max-w-md w-full bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 shadow-[0_32px_80px_-16px_rgba(0,0,0,0.7)] relative z-10 text-center">
        <header className="mb-8">
          <div className="inline-block bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-[2rem] mb-6 shadow-2xl shadow-blue-500/30">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tighter leading-none uppercase">thesocial<br/><span className="text-blue-500">pundit</span></h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[9px] mt-1">AI-Powered Personal Branding & Authority Engine</p>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold leading-relaxed text-left animate-in fade-in slide-in-from-top-2" role="alert">
            <div className="flex items-center space-x-2 mb-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <span>Authentication Error</span>
            </div>
            {error}
          </div>
        )}

        <section>
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {isRegister && (
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-2" htmlFor="name">Full Name</label>
                <input 
                  id="name"
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-4 px-5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all text-sm"
                />
              </div>
            )}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-2" htmlFor="email">Email Address</label>
              <input 
                id="email"
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@growth.ai"
                className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-4 px-5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-2" htmlFor="password">Password</label>
              <input 
                id="password"
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-4 px-5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all text-sm"
              />
            </div>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 px-6 rounded-2xl font-black transition-all transform active:scale-[0.98] shadow-xl shadow-blue-900/20 disabled:opacity-50 mt-4 flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <span>{isRegister ? 'Create Account' : 'Sign In'}</span>
              )}
            </button>
          </form>

          <div className="mt-6">
            <button 
              onClick={() => setIsRegister(!isRegister)}
              className="text-slate-400 hover:text-white text-xs font-bold transition-colors"
            >
              {isRegister ? 'Already have an account? Sign In' : 'Need an account? Register now'}
            </button>
          </div>
        </section>

        <footer className="mt-10 pt-8 border-t border-white/5">
          <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest leading-relaxed">
            Automated Thought Leadership<br/>
            Engineered for Maximum Impact and Influence
          </p>
        </footer>
      </div>
    </main>
  );
};
