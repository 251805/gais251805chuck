import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

/**
 * Global Emergency Circuit Breaker
 * Catches initialization crashes (ReferenceErrors/MIME blocks) specifically for Mobile Chrome.
 */
try {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} catch (error) {
  console.error('MOBILE CHROME BOOT FAILURE:', error);
  
  rootElement.innerHTML = `
    <div style="
      font-family: system-ui, -apple-system, sans-serif; 
      padding: 2rem; 
      text-align: center; 
      background: #0f172a; 
      color: white;
      min-height: 100vh; 
      display: flex; 
      flex-direction: column; 
      align-items: center; 
      justify-content: center;
    ">
      <div style="background: #1e293b; padding: 2.5rem; border-radius: 1.5rem; border: 1px solid #334155; max-width: 500px; width: 90%;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">📱</div>
        <h1 style="color: #60a5fa; margin-bottom: 1rem; font-size: 1.5rem; font-weight: 800;">Mobile Connectivity Alert</h1>
        <p style="color: #94a3b8; margin-bottom: 2rem; font-size: 0.875rem; line-height: 1.6;">
          Your Mobile Chrome browser detected a script loading conflict. To resolve this, perform a hard reset below.
        </p>
        <button onclick="localStorage.clear(); sessionStorage.clear(); location.reload(true);" style="
          background: #2563eb; 
          color: white; 
          border: none; 
          padding: 1rem 2rem; 
          border-radius: 0.75rem; 
          font-weight: 800; 
          cursor: pointer;
          width: 100%;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        ">
          Hard Reset & Synchronize
        </button>
        <div style="margin-top: 2rem; text-align: left;">
          <details style="cursor: pointer;">
            <summary style="color: #475569; font-size: 0.75rem;">Technical Log (Debugging)</summary>
            <pre style="margin-top: 1rem; font-size: 0.65rem; color: #f87171; background: #0f172a; padding: 1rem; border-radius: 0.5rem; overflow: auto; max-height: 150px; white-space: pre-wrap; border: 1px solid #ef444433;">
${error instanceof Error ? error.stack : 'Unidentified rendering crash'}
            </pre>
          </details>
        </div>
      </div>
    </div>
  `;
}
