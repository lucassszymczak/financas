import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import { App } from './App';
import { EstadoProvider } from './state';
import { DialogoProvider } from './components/Dialogo';
import { CarregarProvider } from './components/Carregar';
import { HistoricoAtivoProvider } from './components/HistoricoAtivo';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EstadoProvider>
      <DialogoProvider>
        <CarregarProvider>
          <HistoricoAtivoProvider>
            <App />
          </HistoricoAtivoProvider>
        </CarregarProvider>
      </DialogoProvider>
    </EstadoProvider>
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('Service worker não registrado', e));
  });
}
