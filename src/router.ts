import { useEffect, useState } from 'react';

export const ABAS = [
  { id: 'hoje', icone: '🏠', nome: 'Hoje' },
  { id: 'mercado', icone: '📊', nome: 'Mercado' },
  { id: 'renda-fixa', icone: '🏦', nome: 'Renda fixa' },
  { id: 'agro', icone: '🌾', nome: 'Agro' },
  { id: 'clima', icone: '🌦️', nome: 'Clima' },
  { id: 'agenda', icone: '📅', nome: 'Agenda' },
  { id: 'calculadoras', icone: '🧮', nome: 'Calculadoras' },
  { id: 'historico', icone: '🗂️', nome: 'Histórico' },
  { id: 'config', icone: '⚙️', nome: 'Configurações' },
] as const;

export type AbaId = (typeof ABAS)[number]['id'];

/** Rota completa: aba + até dois níveis (ex.: #/mercado/setores/Financeiro). */
export type Rota = { aba: AbaId; sub: string | null; arg: string | null };

export function lerRota(hash: string = window.location.hash): Rota {
  const partes = hash
    .replace(/^#\/?/, '')
    .split('?')[0]!
    .split('/')
    .map((p) => {
      try {
        return decodeURIComponent(p);
      } catch {
        return p;
      }
    });
  const aba = (ABAS.find((a) => a.id === partes[0])?.id ?? 'hoje') as AbaId;
  return { aba, sub: partes[1] || null, arg: partes[2] || null };
}

export const hrefRota = (aba: AbaId, sub?: string | null, arg?: string | null) =>
  `#/${[aba, sub, arg]
    .filter(Boolean)
    .map((p) => encodeURIComponent(p!))
    .join('/')}`;

export function useRota(): Rota {
  const [rota, setRota] = useState<Rota>(() => lerRota());
  useEffect(() => {
    let antes = lerRota();
    const f = () => {
      const r = lerRota();
      // Trocar só o último nível (ex.: escolher um setor) não volta ao topo.
      if (r.aba !== antes.aba || r.sub !== antes.sub) window.scrollTo(0, 0);
      antes = r;
      setRota(r);
    };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return rota;
}

export function useAba(): AbaId {
  return useRota().aba;
}

export function ir(aba: AbaId, sub?: string | null, arg?: string | null) {
  window.location.hash = hrefRota(aba, sub, arg).slice(1);
}

export const irPara = (aba: AbaId) => {
  window.location.hash = `/${aba}`;
};
