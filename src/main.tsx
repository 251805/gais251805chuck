import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

try {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (error) {
  console.error('CRITICAL BOOT ERROR:', error);
  
  // Emergency UI Fallback for Chrome Blank Screen
  rootElement.innerHTML = `
    <div style="
      font-family: system-ui, sans-serif; 
      padding: 2rem; 
      text-align: center; 
      background: #f8fafc; 
      min-height: 100vh; 
      display: flex; 
      flex-direction: column; 
      align-items: center; 
      justify-content: center;
    ">
      <div style="background: white; padding: 2rem; border-radius: 1rem; shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
        <h1 style="color: #ef4444; margin-bottom: 1rem;">System Launch Interrupted</h1>
        <p style="color: #64748b; margin-bottom: 1.5rem;">The application encountered a runtime error during initialization. This is often caused by cached browser data.</p>
        <button onclick="localStorage.clear(); sessionStorage.clear(); location.reload();" style="
          background: #3b82f6; 
          color: white; 
          border: none; 
          padding: 0.75rem 1.5rem; 
          border-radius: 0.5rem; 
          font-weight: bold; 
          cursor: pointer;
        ">
          Hard Reset & Reload System
        </button>
        <pre style="margin-top: 2rem; font-size: 0.75rem; color: #94a3b8; text-align: left; background: #f1f5f9; padding: 1rem; border-radius: 0.5rem; overflow: auto; max-width: 80vw;">
${error instanceof Error ? error.stack : 'Unknown crash details'}
        </pre>
      </div>
    </div>
  `;
}
