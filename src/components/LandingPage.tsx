import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';
import { DISCLAIMER, LINKS } from '../constants';
import { ShieldCheck, User, Warehouse, ShieldAlert, LogIn } from 'lucide-react';

export default function LandingPage() {
  const { setRole, acceptedTerms, setAcceptedTerms } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleAcceptTerms = () => {
    setAcceptedTerms(true);
  };

  const handleRoleSelect = (role: Role) => {
    if (role === 'GUEST') {
      setRole('GUEST');
    } else {
      setShowLogin(true);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const { username, password } = loginData;
    const u = username.toLowerCase();
    const p = password.toLowerCase();

    // Root check
    if ((u === 'lee') && (password === 'metallica' || password === 'METALLICA')) {
      setRole('ROOT');
      return;
    }

    // Admin check
    if ((u === 'dojie') && (p === 'mgdh1')) {
      setRole('ADMIN');
      return;
    }

    // Warehouse check
    if ((u === 'warehouse') && (p === 'warez')) {
      setRole('WAREHOUSE');
      return;
    }

    setError('Invalid credentials');
  };

  if (!acceptedTerms) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl max-w-2xl w-full p-8 overflow-hidden text-white"
        >
          <div className="flex flex-col items-center mb-8 text-center">
            <h1 className="text-2xl font-bold mb-4">{DISCLAIMER.title}</h1>
          </div>

          <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {DISCLAIMER.sections.map((section, idx) => (
              <div key={`disclaimer-section-${idx}`}>
                <h3 className="font-bold text-blue-400 border-b border-slate-700 pb-1 mb-2">{section.title}</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{section.content}</p>
              </div>
            ))}
          </div>

          <p className="mt-8 text-sm italic text-slate-400 border-t border-slate-700 pt-4">
            {DISCLAIMER.footer}
          </p>

          <button
            id="accept-terms-btn"
            onClick={handleAcceptTerms}
            className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
          >
            I accept and understand
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white relative overflow-hidden font-sans">
      {/* Background Decorations */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl z-0" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl z-0" />

      <main className="max-w-5xl mx-auto flex items-center justify-center min-h-screen z-10 p-4 relative">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="grid md:grid-cols-2 gap-12 w-full items-center"
        >
          {/* Left Side: Hero Content */}
          <div className="flex flex-col space-y-8 text-center md:text-left">
            <motion.a
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                href="https://www.facebook.com/lgu.pagbilao.gso"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-28 h-28 rounded-full border-4 border-slate-700 shadow-2xl shadow-blue-500/20 overflow-hidden mx-auto md:mx-0 group hover:scale-105 transition-transform"
            >
              <img
                src="https://github.com/251805/sirpacheck/blob/main/gso.png?raw=true"
                alt="GSO Logo"
                className="w-full h-full object-cover"
              />
            </motion.a>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-center md:justify-start"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-800/50 border border-slate-700 rounded-full text-xs font-bold tracking-widest uppercase text-blue-400">
                <ShieldCheck size={14} />
                GSO PROCUREMENT SYSTEM
              </div>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl md:text-6xl font-black tracking-tight"
            >
              Quezon’s first in <span className="text-blue-500">Digital Logistics</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-slate-400 text-lg leading-relaxed"
            >
              "We are spearheading the province's digital transformation with a Smart Municipality platform engineered for total RA 9184 compliance. By unifying procurement and inventory into a single data hub, we ensure 100% audit readiness and peak logistical efficiency."
            </motion.p>
          </div>

          {/* Right Side: Action Panel */}
          <div className="relative group">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-slate-800/40 backdrop-blur-xl rounded-3xl p-8 border border-slate-700 shadow-2xl"
            >
              <AnimatePresence mode="wait">
                {!showLogin ? (
                  <motion.div 
                    key="role-select"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-4"
                  >
                    <h2 className="text-xl font-bold mb-6">Continue as:</h2>
                    
                    <button
                      onClick={() => handleRoleSelect('GUEST')}
                      className="w-full flex items-center justify-between p-4 bg-slate-900/50 hover:bg-slate-700 rounded-2xl border border-slate-700 transition-all group/card"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-slate-800 rounded-xl text-blue-400 group-hover/card:scale-110 transition-transform">
                          <User size={24} />
                        </div>
                        <div className="text-left">
                          <p className="font-bold">Guest User</p>
                          <p className="text-xs text-slate-400">PR/RIS Requests & Inventory</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setShowLogin(true)}
                      className="w-full flex items-center justify-between p-4 bg-slate-900/50 hover:bg-slate-700 rounded-2xl border border-slate-700 transition-all group/card"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-slate-800 rounded-xl text-indigo-400 group-hover/card:scale-110 transition-transform">
                          <Warehouse size={24} />
                        </div>
                        <div className="text-left">
                          <p className="font-bold">Staff Access</p>
                          <p className="text-xs text-slate-400">Warehouse & Admin Login</p>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                ) : (
                  <motion.form 
                    key="login-form"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    onSubmit={handleLogin}
                    className="space-y-4"
                  >
                    <button 
                      type="button"
                      onClick={() => { setShowLogin(false); setError(''); }}
                      className="text-slate-400 hover:text-white text-sm font-medium flex items-center mb-4"
                    >
                      &larr; Back
                    </button>
                    <h2 className="text-xl font-bold">Staff Login</h2>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Username</label>
                      <input 
                        type="text" 
                        value={loginData.username}
                        onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                        className="w-full p-4 bg-slate-900 rounded-xl border border-slate-700 focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="Username"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
                      <input 
                        type="password" 
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        className="w-full p-4 bg-slate-900 rounded-xl border border-slate-700 focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="Password"
                        required
                      />
                    </div>

                    {error && <p className="text-red-400 text-sm font-medium">{error}</p>}

                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center space-x-2"
                    >
                      <LogIn size={20} />
                      <span>Login</span>
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>
      </main>
      
      <div className="fixed bottom-4 left-0 w-full text-center text-xs text-slate-500">
        &copy; 2026 GSO Pagbilao. All Rights Reserved.
      </div>
    </div>
  );
}
