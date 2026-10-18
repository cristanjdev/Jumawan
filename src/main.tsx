import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initPerformanceTier } from './stores/usePerformanceStore'

// Pick the effects tier before first render so components mount with it
initPerformanceTier();

// Suppress specific console warnings in development
if (import.meta.env.DEV) {
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const message = args[0];
    
    // Suppress Framer Motion positioning warning
    if (typeof message === 'string' && message.includes('non-static position')) {
      return;
    }
    
    // Call original warn for other messages
    originalWarn.apply(console, args);
  };
}

// Global error handler for script loading errors (e.g., Vercel Analytics)
// Note: Primary error handler is in index.html <head> to catch errors earlier
window.addEventListener('error', (event) => {
  const filename = String(event.filename || '');
  const message = String(event.message || '');
  
  // Suppress errors from Vercel Analytics webpage_content_reporter script
  if (
    filename.includes('webpage_content_reporter') ||
    filename.includes('vercel') && message.includes('Unexpected token') ||
    (filename.includes('analytics') && message.includes('Unexpected token')) ||
    (message.includes('Unexpected token') && message.includes('export') && (filename.includes('vercel') || filename.includes('analytics')))
  ) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    return false;
  }
}, true);

createRoot(document.getElementById("root")!).render(<App />);
