import { useEffect, useState } from 'react';

export const ROUTES = ['capturar', 'mes', 'controle', 'plano', 'respostas', 'ir', 'config'] as const;
export type Route = (typeof ROUTES)[number];

function parse(hash: string): Route {
  const name = hash.replace(/^#\/?/, '').split('/')[0] ?? '';
  return (ROUTES as readonly string[]).includes(name) ? (name as Route) : 'capturar';
}

/** Navegação por hash: funciona em qualquer hospedagem estática, sem configuração. */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));
  useEffect(() => {
    const on = () => {
      setRoute(parse(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function go(route: Route) {
  window.location.hash = `#/${route}`;
}
