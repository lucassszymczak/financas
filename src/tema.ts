import { useEffect, useState } from 'react';
import { useEstado } from './state';
import { ajustarContraste, misturar, textoSobre } from './lib/cor';

export type TemaEfetivo = 'claro' | 'escuro';

/** Fundos de cada tema (iguais aos de tokens.css), usados para calcular o contraste do destaque. */
const FUNDOS: Record<TemaEfetivo, { fundo: string; superficie: string }> = {
  claro: { fundo: '#e9edf2', superficie: '#ffffff' },
  escuro: { fundo: '#1b2843', superficie: '#101b31' },
};

function preferenciaSistema(): TemaEfetivo {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
}

/** Aplica tema e cor de destaque no <html>; devolve o tema em uso e a função de alternar. */
export function useTemaEfetivo(): [TemaEfetivo, () => void] {
  const { config, salvarConfig } = useEstado();
  const [sistema, setSistema] = useState<TemaEfetivo>(preferenciaSistema);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const f = () => setSistema(mq.matches ? 'escuro' : 'claro');
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, []);

  const tema: TemaEfetivo = config.tema === 'sistema' ? sistema : config.tema;

  useEffect(() => {
    const raiz = document.documentElement;
    raiz.dataset.theme = tema === 'escuro' ? 'dark' : 'light';
    const { fundo, superficie } = FUNDOS[tema];
    // O destaque precisa de contraste AA tanto no fundo quanto nos cards.
    const destaque = ajustarContraste(ajustarContraste(config.corDestaque, superficie), fundo);
    raiz.style.setProperty('--destaque', destaque);
    raiz.style.setProperty('--destaque-texto', textoSobre(destaque));
    raiz.style.setProperty('--destaque-suave', misturar(destaque, superficie, 0.85));
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#14213d');
  }, [tema, config.corDestaque]);

  const alternar = () => void salvarConfig({ ...config, tema: tema === 'escuro' ? 'claro' : 'escuro' });
  return [tema, alternar];
}
