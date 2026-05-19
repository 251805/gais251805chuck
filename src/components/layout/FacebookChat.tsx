import React, { useEffect } from 'react';

/**
 * FacebookChat Component
 * 
 * Safely isolates the Facebook Customer SDK initialization from the core React tree.
 * This prevents blocking the main thread during V8 execution in Chrome.
 */
export default function FacebookChat() {
  useEffect(() => {
    // 1. Define the async initializer
    const initFacebookSDK = () => {
      // @ts-ignore
      window.fbAsyncInit = function() {
        // @ts-ignore
        if (window.FB) {
          // @ts-ignore
          window.FB.init({
            xfbml: true,
            version: 'v12.0'
          });
        }
      };

      // 2. Load the SDK script dynamically with protection
      (function(d, s, id) {
        var js, fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) return;
        js = d.createElement(s) as HTMLScriptElement; 
        js.id = id;
        js.async = true;
        js.defer = true;
        js.crossOrigin = "anonymous";
        js.src = 'https://connect.facebook.net/en_US/sdk/xfbml.customerchat.js';
        
        if (fjs && fjs.parentNode) {
          fjs.parentNode.insertBefore(js, fjs);
        } else {
          document.head.appendChild(js);
        }
      }(document, 'script', 'facebook-jssdk'));
    };

    // 3. Trigger initialization with a delay to ensure React has fully painted the LandingPage/Dashboard
    const timer = setTimeout(() => {
      try {
        initFacebookSDK();
      } catch (err) {
        console.warn('Facebook SDK failed to load (Non-critical):', err);
      }
    }, 3000); // 3 second delay gives plenty of room for main bundle execution

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
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
        greeting_dialog_delay="5"
        minimized="false"
      ></div>
    </>
  );
}
