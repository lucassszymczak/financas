import type { ReactNode } from 'react';
import type { Desenho } from '../lib/icones';

/**
 * Ícones desenhados em SVG para commodities e moedas que não têm emoji adequado.
 * Cores fixas com contorno escuro: ficam legíveis nos temas claro e escuro.
 */
const DESENHOS: Record<Desenho, { titulo: string; svg: ReactNode }> = {
  'barra-ouro': {
    titulo: 'Barra de ouro',
    svg: (
      <>
        <path d="M1.5 20 L5 12 H19 L22.5 20 Z" fill="#D4A21E" stroke="#7A5A0C" strokeWidth="1" strokeLinejoin="round" />
        <path d="M5 12 L7.6 5 H16.4 L19 12 Z" fill="#F4D36B" stroke="#7A5A0C" strokeWidth="1" strokeLinejoin="round" />
        <path d="M6.8 17.8 L8.6 13.6" stroke="#FBE7A1" strokeWidth="1.4" strokeLinecap="round" />
      </>
    ),
  },
  'saca-acucar': {
    titulo: 'Saca de açúcar',
    svg: (
      <>
        <path
          d="M7.2 8.2 C5.6 11 5 14.2 5.4 17.2 C5.8 20 8.2 21.2 12 21.2 C15.8 21.2 18.2 20 18.6 17.2 C19 14.2 18.4 11 16.8 8.2 Z"
          fill="#F3EDE0"
          stroke="#6E5A3A"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path d="M8.6 8.2 L9.4 3.8 H14.6 L15.4 8.2 Z" fill="#F3EDE0" stroke="#6E5A3A" strokeWidth="1" strokeLinejoin="round" />
        <path d="M8 8.2 H16" stroke="#9C6B3C" strokeWidth="1.8" strokeLinecap="round" />
        <rect x="9.6" y="13.2" width="2.2" height="2.2" fill="#FFFFFF" stroke="#8C7A5C" strokeWidth="0.6" />
        <rect x="12.4" y="14.6" width="2.2" height="2.2" fill="#FFFFFF" stroke="#8C7A5C" strokeWidth="0.6" />
        <rect x="10.8" y="16.4" width="2.2" height="2.2" fill="#FFFFFF" stroke="#8C7A5C" strokeWidth="0.6" />
      </>
    ),
  },
  'grao-soja': {
    titulo: 'Grão de soja',
    svg: (
      <>
        <ellipse
          cx="12"
          cy="12.5"
          rx="8"
          ry="6.6"
          transform="rotate(-25 12 12.5)"
          fill="#E6C76A"
          stroke="#8A6A1E"
          strokeWidth="1"
        />
        <ellipse cx="9.4" cy="10.6" rx="2.6" ry="1.5" transform="rotate(-25 9.4 10.6)" fill="#F6E3A6" />
        <ellipse cx="15.2" cy="16.2" rx="3" ry="1.1" transform="rotate(-25 15.2 16.2)" fill="#5E4310" />
      </>
    ),
  },
  'cedula-dolar': {
    titulo: 'Cédula de dólar',
    svg: (
      <>
        <rect x="1.5" y="6" width="21" height="12" rx="1.2" fill="#9CCB9F" stroke="#2E6B3A" strokeWidth="1" />
        <rect x="3.3" y="7.8" width="17.4" height="8.4" rx="0.6" fill="none" stroke="#2E6B3A" strokeWidth="0.6" />
        <circle cx="12" cy="12" r="3.4" fill="#DDF0DE" stroke="#2E6B3A" strokeWidth="0.8" />
        <text x="12" y="14.3" textAnchor="middle" fontSize="6.4" fontWeight="700" fill="#1F4F2A" fontFamily="Arial, sans-serif">
          $
        </text>
      </>
    ),
  },
};

export function DesenhoAtivo({ desenho, tamanho }: { desenho: Desenho; tamanho: number }) {
  const d = DESENHOS[desenho];
  return (
    <svg
      className="ativo-icone ativo-desenho"
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      role="img"
      aria-label={d.titulo}
    >
      <title>{d.titulo}</title>
      {d.svg}
    </svg>
  );
}
