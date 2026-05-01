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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 overflow-hidden"
        >
          <div className="flex flex-col items-center mb-8 text-center">
            <img 
              src={LINKS.GSO_LOGO} 
              alt="GSO Logo" 
              className="w-24 h-24 rounded-full border-4 border-slate-100 shadow-lg cursor-pointer transition-transform hover:scale-105 mb-4"
              onClick={() => window.open(LINKS.FB_PAGE, '_blank')}
            />
            <h1 className="text-2xl font-bold text-slate-900">{DISCLAIMER.title}</h1>
          </div>

          <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {DISCLAIMER.sections.map((section, idx) => (
              <div key={`disclaimer-section-${idx}`}>
                <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-1 mb-2">{section.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{section.content}</p>
              </div>
            ))}
          </div>

          <p className="mt-8 text-sm italic text-slate-500 border-t pt-4">
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-50" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-4xl w-full grid md:grid-cols-2 gap-8 z-10"
      >
        <div className="flex flex-col justify-center text-center md:text-left space-y-6">
          <div className="flex items-center justify-center md:justify-start">
            <img 
              src={LINKS.GSO_LOGO} 
              alt="GSO Logo" 
              className="w-20 h-20 rounded-full border-2 border-white shadow-md cursor-pointer hover:opacity-90"
              onClick={() => window.open(LINKS.FB_PAGE, '_blank')}
            />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              GSO <span className="text-blue-600">Procurement</span> System
            </h1>
            <p className="text-lg text-slate-600 mt-2">
              Quezon’s First in Digital Logistics
            </p>
          </div>
          <div className="flex flex-col space-y-4">
            <p className="text-slate-500 font-medium italic">"We are spearheading the province's digital transformation with a Smart Municipality platform engineered for total RA 9184 compliance. By unifying procurement and inventory into a single data hub, we ensure 100% audit readiness and peak logistical efficiency—defining the future of modern governance."</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
          <AnimatePresence mode="wait">
            {!showLogin ? (
              <motion.div 
                key="role-select"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h2 className="text-xl font-bold text-slate-800 mb-6">Continue as:</h2>
                
                <button
                  onClick={() => handleRoleSelect('GUEST')}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border-2 border-transparent hover:border-blue-200 transition-all group"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm text-blue-600 group-hover:scale-110 transition-transform">
                      <User size={24} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-slate-900">Guest User</p>
                      <p className="text-xs text-slate-500">PR/RIS Requests & Inventory Peak</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setShowLogin(true)}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border-2 border-transparent hover:border-indigo-200 transition-all group"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm text-indigo-600 group-hover:scale-110 transition-transform">
                      <Warehouse size={24} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-slate-900">Staff Access</p>
                      <p className="text-xs text-slate-500">Warehouse & Admin Login</p>
                    </div>
                  </div>
                </button>
              </motion.div>
            ) : (
              <motion.form 
                key="login-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleLogin}
                className="space-y-4"
              >
                <button 
                  type="button"
                  onClick={() => { setShowLogin(false); setError(''); }}
                  className="text-slate-400 hover:text-slate-600 text-sm font-medium flex items-center mb-4"
                >
                  &larr; Back to Role Selection
                </button>
                <h2 className="text-xl font-bold text-slate-800">Staff Login</h2>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                  <input 
                    type="text" 
                    value={loginData.username}
                    onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                    className="w-full p-4 bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Enter username"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input 
                    type="password" 
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="w-full p-4 bg-slate-100 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Enter password"
                    required
                  />
                </div>

                {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center space-x-2"
                >
                  <LogIn size={20} />
                  <span>Login</span>
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      
      <div className="fixed bottom-4 text-xs text-slate-400">
        &copy; 2026 GSO Pagbilao. All Rights Reserved.
      </div>
    </div>
  );
}
