import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
// Listens for the browser's install offer before anything renders.
import './lib/install';
import './style.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
