import { useEffect, useState } from 'react';

export const ABAS = [
  { id: 'hoje', icone: '🏠', nome: 'Hoje' },
  { id: 'mercado', icone: '📊', nome: 'Mercado' },
  { id: 'agro', icone: '🌾', nome: 'Agro' },
  { id: 'clima', icone: '🌦️', nome: 'Clima' },
  { id: 'agenda', icone: '📅', nome: 'Agenda' },
  { id: 'calculadoras', icone: '🧮', nome: 'Calculadoras' },
  { id: 'historico', icone: '🗂️', nome: 'Histórico' },
  { id: 'config', icone: '⚙️', nome: 'Configurações' },
] as const;

export type AbaId = (typeof ABAS)[number]['id'];

function ler(): AbaId {
  const h = window.location.hash.replace(/^#\/?/, '').split(/[/?]/)[0];
  return (ABAS.find((a) => a.id === h)?.id ?? 'hoje') as AbaId;
}

export function useAba(): AbaId {
  const [aba, setAba] = useState<AbaId>(ler);
  useEffect(() => {
    const f = () => {
      setAba(ler());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return aba;
}

export const irPara = (aba: AbaId) => {
  window.location.hash = `/${aba}`;
};
