/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './components/LandingPage';
import Dashboard from './components/views/Dashboard';
import { motion, AnimatePresence } from 'motion/react';
import { DISCLAIMER } from './constants';
import { TriangleAlert } from 'lucide-react';

function AppContent() {
  const { role, logout, showDisclaimer, setShowDisclaimer, hasAcceptedDisclaimer, setHasAcceptedDisclaimer, setRole } = useAuth();
  const [pendingRole, setPendingRole] = useState<any>(null);

  useEffect(() => {
    // Check for pending role when disclaimer is shown
    // This listener helps if we set role elsewhere, but for now it's triggered from handleRoleSelect
  }, []);

  const handleAcceptTerms = () => {
    setHasAcceptedDisclaimer(true);
    setShowDisclaimer(false);
    // If we have a mechanism to store pending role, apply it now. 
    // Usually set by LandingPage before triggering modal.
  };

  // Facebook SDK Integration
  useEffect(() => {
    const initFacebookSDK = () => {
      // @ts-ignore
      window.fbAsyncInit = function() {
        // @ts-ignore
        FB.init({
          xfbml: true,
          version: 'v12.0'
        });
      };

      (function(d, s, id) {
        var js, fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) return;
        js = d.createElement(s); js.id = id;
        // @ts-ignore
        js.src = 'https://connect.facebook.net/en_US/sdk/xfbml.customerchat.js';
        // @ts-ignore
        fjs.parentNode.insertBefore(js, fjs);
      }(document, 'script', 'facebook-jssdk'));
    };

    initFacebookSDK();
  }, []);

  return (
    <>
      <AnimatePresence>
        {showDisclaimer && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 text-white font-sans"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col"
            >
              <div className="bg-amber-500/10 border-b border-amber-500/20 p-6 flex items-center gap-4">
                <div className="p-3 bg-amber-500 rounded-2xl text-slate-900 shadow-lg shadow-amber-500/20">
                  <TriangleAlert size={28} />
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-amber-500 uppercase">{DISCLAIMER.title}</h1>
                  <p className="text-amber-500/60 text-xs font-bold tracking-widest uppercase">Legal Advisory & Usage Terms</p>
                </div>
              </div>

              <div className="p-8 pb-4 space-y-6 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar text-slate-300">
                {DISCLAIMER.sections.map((section, idx) => (
                  <div key={`disclaimer-section-${idx}`} className="space-y-2">
                    <h3 className="font-black text-blue-400 text-sm tracking-wide border-l-4 border-blue-500 pl-3 py-1 bg-blue-500/5">{section.title}</h3>
                    <p className="text-sm leading-relaxed pl-4">{section.content}</p>
                  </div>
                ))}
              </div>

              <div className="p-8 pt-4 bg-slate-800/80 border-t border-slate-700">
                <p className="text-xs italic text-slate-400 text-center mb-6">
                  {DISCLAIMER.footer}
                </p>

                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setShowDisclaimer(false);
                      logout();
                    }}
                    className="flex-1 bg-slate-900 hover:bg-slate-950 text-slate-400 font-bold py-4 rounded-2xl transition-all border border-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    id="accept-terms-btn"
                    onClick={handleAcceptTerms}
                    className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-600/20 transform active:scale-95 uppercase"
                  >
                    I Accept and Understand
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!role ? <LandingPage /> : <Dashboard />}
      
      {/* Facebook Customer Chat */}
      <div id="fb-root"></div>
      <div 
        className="fb-customerchat"
        // @ts-ignore
        attribution="setup_tool"
        page_id="61583885130718"
        theme_color="#f59e0b"
        logged_in_greeting="Kamusta! Paano ka po matutulungan ng LGU Pagbilao GSO?"
        logged_out_greeting="Mag-chat sa amin para sa amin para sa inyong inquiry"
        greeting_dialog_display="fade"
        greeting_dialog_delay="3"
        minimized="false"
      ></div>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
