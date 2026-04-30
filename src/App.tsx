/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './components/LandingPage';
import Dashboard from './components/views/Dashboard';

function AppContent() {
  const { role } = useAuth();

  useEffect(() => {
    // Facebook SDK Integration
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
