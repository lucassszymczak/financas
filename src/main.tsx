import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import { App } from './App';
import { EstadoProvider } from './state';
import { DialogoProvider } from './components/Dialogo';
import { CarregarProvider } from './components/Carregar';
import { HistoricoAtivoProvider } from './components/HistoricoAtivo';
import { SincronizacaoProvider } from './components/Sincronizacao';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EstadoProvider>
      <SincronizacaoProvider>
        <DialogoProvider>
          <CarregarProvider>
            <HistoricoAtivoProvider>
              <App />
            </HistoricoAtivoProvider>
          </CarregarProvider>
        </DialogoProvider>
      </SincronizacaoProvider>
    </EstadoProvider>
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('Service worker não registrado', e));
  });
}
