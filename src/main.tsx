import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { LogoProvider } from './context/LogoContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LogoProvider>
      <App />
    </LogoProvider>
  </StrictMode>,
);
