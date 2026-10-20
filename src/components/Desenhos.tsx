import { useId, type ReactNode } from 'react';
import type { Desenho } from '../lib/icones';

/**
 * Ícones desenhados em SVG para commodities e moedas que não têm emoji adequado.
 * Gradientes e sombras dão volume; cores fixas com contorno escuro ficam legíveis nos temas claro e escuro.
 * Cada instância usa ids próprios nos gradientes (vários ícones na mesma página).
 */

function barraOuro(p: string): ReactNode {
  return (
    <>
      <defs>
        <linearGradient id={`${p}f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FCE7A0" />
          <stop offset="0.35" stopColor="#E8BE45" />
          <stop offset="0.75" stopColor="#C38F1A" />
          <stop offset="1" stopColor="#8E6310" />
        </linearGradient>
        <linearGradient id={`${p}t`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF6D2" />
          <stop offset="0.5" stopColor="#F6D670" />
          <stop offset="1" stopColor="#D9A82E" />
        </linearGradient>
        <linearGradient id={`${p}s`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#B07F17" />
          <stop offset="1" stopColor="#6F4C0A" />
        </linearGradient>
      </defs>
      <ellipse cx="12" cy="20.6" rx="10.5" ry="1.4" fill="#000" opacity="0.18" />
      {/* lateral direita, frente e tampo */}
      <path
        d="M18.6 19.6 L21.8 16.6 L19.6 9.2 L16.3 11.6 Z"
        fill={`url(#${p}s)`}
        stroke="#5E400A"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
      <path d="M2.2 19.6 H18.6 L16.3 11.6 H5 Z" fill={`url(#${p}f)`} stroke="#5E400A" strokeWidth="0.6" strokeLinejoin="round" />
      <path d="M5 11.6 H16.3 L19.6 9.2 H8.4 Z" fill={`url(#${p}t)`} stroke="#5E400A" strokeWidth="0.6" strokeLinejoin="round" />
      {/* carimbo em baixo-relevo */}
      <rect x="6.4" y="13.6" width="8.4" height="4" rx="0.5" fill="none" stroke="#9A6D12" strokeWidth="0.5" />
      <path d="M7.6 15 H13.6 M7.6 16.3 H12" stroke="#A97A16" strokeWidth="0.45" strokeLinecap="round" />
      {/* brilho */}
      <path d="M4.4 18.6 L6.3 12.6" stroke="#FFF4C4" strokeWidth="0.9" strokeLinecap="round" opacity="0.85" />
      <path d="M9.6 10.3 H15.6" stroke="#FFFBEA" strokeWidth="0.6" strokeLinecap="round" opacity="0.9" />
    </>
  );
}

function sacaAcucar(p: string): ReactNode {
  return (
    <>
      <defs>
        <radialGradient id={`${p}c`} cx="0.38" cy="0.4" r="0.75">
          <stop offset="0" stopColor="#FBF4E2" />
          <stop offset="0.6" stopColor="#E7D6AE" />
          <stop offset="1" stopColor="#BFA36A" />
        </radialGradient>
        <linearGradient id={`${p}b`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#D9C597" />
          <stop offset="0.5" stopColor="#F4EAD0" />
          <stop offset="1" stopColor="#C6AC72" />
        </linearGradient>
        <pattern id={`${p}j`} width="1.6" height="1.6" patternUnits="userSpaceOnUse">
          <path d="M0 0.8 H1.6 M0.8 0 V1.6" stroke="#A88B55" strokeWidth="0.25" opacity="0.35" />
        </pattern>
      </defs>
      <ellipse cx="12" cy="21.4" rx="8" ry="1.2" fill="#000" opacity="0.18" />
      {/* boca franzida acima da amarração */}
      <path
        d="M8.4 7.6 C8 5.6 8.6 3.6 10 2.8 C10.8 3.8 11.4 3.4 12 2.6 C12.6 3.4 13.3 3.8 14 2.8 C15.4 3.6 16 5.6 15.6 7.6 Z"
        fill={`url(#${p}b)`}
        stroke="#7A6038"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
      {/* corpo da saca */}
      <path
        d="M8.2 7.8 C5.6 9.6 4.4 13 4.6 16.4 C4.8 19.6 7.4 21 12 21 C16.6 21 19.2 19.6 19.4 16.4 C19.6 13 18.4 9.6 15.8 7.8 Z"
        fill={`url(#${p}c)`}
        stroke="#7A6038"
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
      <path
        d="M8.2 7.8 C5.6 9.6 4.4 13 4.6 16.4 C4.8 19.6 7.4 21 12 21 C16.6 21 19.2 19.6 19.4 16.4 C19.6 13 18.4 9.6 15.8 7.8 Z"
        fill={`url(#${p}j)`}
      />
      {/* faixas impressas e etiqueta */}
      <path d="M5.2 12.4 C9.6 13.4 14.4 13.4 18.8 12.4" stroke="#1F4E9C" strokeWidth="0.9" fill="none" />
      <path d="M4.9 17.4 C9.6 18.4 14.4 18.4 19.1 17.4" stroke="#B3261E" strokeWidth="0.9" fill="none" />
      <rect x="8.6" y="13.9" width="6.8" height="2.6" rx="0.4" fill="#FFFFFF" stroke="#1F4E9C" strokeWidth="0.4" />
      <path d="M9.6 14.9 H14.4 M10.2 15.7 H13.8" stroke="#1F4E9C" strokeWidth="0.4" strokeLinecap="round" />
      {/* amarração de corda */}
      <path d="M7.8 7.9 C10.5 8.7 13.5 8.7 16.2 7.9" stroke="#7B4A1E" strokeWidth="1.3" strokeLinecap="round" fill="none" />
      <path d="M12 8.4 L10.6 10.4 M12 8.4 L13.2 10.6" stroke="#7B4A1E" strokeWidth="0.8" strokeLinecap="round" />
      {/* torrões de açúcar ao pé da saca */}
      <rect x="17.6" y="19.2" width="2.2" height="2.2" rx="0.3" fill="#FFFFFF" stroke="#9C9384" strokeWidth="0.4" />
      <rect x="19.9" y="19.9" width="1.8" height="1.8" rx="0.3" fill="#FAFAF7" stroke="#9C9384" strokeWidth="0.4" />
    </>
  );
}

function graoSoja(p: string): ReactNode {
  const grao = (cx: number, cy: number, rx: number, ry: number, rot: number, g: string) => (
    <g transform={`rotate(${rot} ${cx} ${cy})`}>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${g})`} stroke="#8C7444" strokeWidth="0.6" />
      {/* hilo: a "cicatriz" escura típica do grão de soja */}
      <ellipse cx={cx} cy={cy + ry * 0.62} rx={rx * 0.42} ry={ry * 0.14} fill="#5A4524" />
      <path d={`M${cx - rx * 0.3} ${cy + ry * 0.62} H${cx + rx * 0.3}`} stroke="#A9813A" strokeWidth="0.3" />
      <ellipse cx={cx - rx * 0.35} cy={cy - ry * 0.4} rx={rx * 0.32} ry={ry * 0.2} fill="#FFF7DC" opacity="0.75" />
    </g>
  );
  return (
    <>
      <defs>
        <radialGradient id={`${p}a`} cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#FBF3D9" />
          <stop offset="0.5" stopColor="#E6D29C" />
          <stop offset="1" stopColor="#B89B5E" />
        </radialGradient>
        <radialGradient id={`${p}b`} cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#F1E5C0" />
          <stop offset="0.55" stopColor="#D9C285" />
          <stop offset="1" stopColor="#A88C52" />
        </radialGradient>
      </defs>
      <ellipse cx="12.5" cy="20.4" rx="9" ry="1.3" fill="#000" opacity="0.18" />
      {grao(16, 9.2, 5.2, 4.2, 18, `${p}b`)}
      {grao(9.6, 14.2, 6.6, 5.4, -22, `${p}a`)}
    </>
  );
}

function cedulaDolar(p: string): ReactNode {
  return (
    <>
      <defs>
        <linearGradient id={`${p}n`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E3EEDA" />
          <stop offset="0.5" stopColor="#C4D9B6" />
          <stop offset="1" stopColor="#A3C292" />
        </linearGradient>
        <linearGradient id={`${p}m`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#B9D0A8" />
          <stop offset="1" stopColor="#86A975" />
        </linearGradient>
        <radialGradient id={`${p}r`} cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#EEF5E8" />
          <stop offset="1" stopColor="#9DBE8C" />
        </radialGradient>
      </defs>
      <ellipse cx="12" cy="20.2" rx="10.5" ry="1.2" fill="#000" opacity="0.16" />
      {/* nota de trás, inclinada */}
      <g transform="rotate(-8 12 12)">
        <rect x="1.8" y="5.2" width="20.4" height="10.6" rx="0.8" fill={`url(#${p}m)`} stroke="#3F6B36" strokeWidth="0.5" />
      </g>
      {/* nota da frente */}
      <rect x="1.4" y="7.6" width="21.2" height="11" rx="0.8" fill={`url(#${p}n)`} stroke="#2F5A2A" strokeWidth="0.6" />
      <rect
        x="2.6"
        y="8.8"
        width="18.8"
        height="8.6"
        rx="0.4"
        fill="none"
        stroke="#3E6E37"
        strokeWidth="0.45"
        strokeDasharray="0.6 0.35"
      />
      {/* retrato */}
      <ellipse cx="12" cy="13.1" rx="3.3" ry="3.6" fill={`url(#${p}r)`} stroke="#2F5A2A" strokeWidth="0.5" />
      <circle cx="12" cy="12.1" r="1.25" fill="#4E7A45" />
      <path d="M9.6 15.9 C10 14.3 11 13.7 12 13.7 C13 13.7 14 14.3 14.4 15.9 Z" fill="#4E7A45" />
      {/* selos e valores nos cantos */}
      <circle cx="5.6" cy="13.1" r="1.6" fill="none" stroke="#2F5A2A" strokeWidth="0.45" />
      <circle cx="18.4" cy="13.1" r="1.6" fill="#2F6E3A" opacity="0.85" />
      <text x="18.4" y="14.15" textAnchor="middle" fontSize="2.8" fontWeight="700" fill="#E7F2E2" fontFamily="Georgia, serif">
        $
      </text>
      <text x="3.4" y="10.6" fontSize="1.9" fontWeight="700" fill="#2F5A2A" fontFamily="Georgia, serif">
        100
      </text>
      <text x="17.6" y="17.4" fontSize="1.9" fontWeight="700" fill="#2F5A2A" fontFamily="Georgia, serif">
        100
      </text>
    </>
  );
}

const DESENHOS: Record<Desenho, { titulo: string; svg: (prefixo: string) => ReactNode }> = {
  'barra-ouro': { titulo: 'Barra de ouro', svg: barraOuro },
  'saca-acucar': { titulo: 'Saca de açúcar', svg: sacaAcucar },
  'grao-soja': { titulo: 'Grão de soja', svg: graoSoja },
  'cedula-dolar': { titulo: 'Cédula de dólar', svg: cedulaDolar },
};

export function DesenhoAtivo({ desenho, tamanho }: { desenho: Desenho; tamanho: number }) {
  const prefixo = `d${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
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
      {d.svg(prefixo)}
    </svg>
  );
}
