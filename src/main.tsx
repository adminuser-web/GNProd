import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {installConsoleGuard} from './lib/consoleGuard';

// Mask PII/secrets in the production console before anything else can log.
installConsoleGuard();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
