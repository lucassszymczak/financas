import { hrefRota, type AbaId } from '../router';

/** Abas em pílula de uma área (Mercado, Renda fixa); rolam na horizontal sem empurrar a página. */
export function Abas({ aba, itens, atual }: { aba: AbaId; itens: [string | null, string][]; atual: string | null }) {
  return (
    <nav className="abas-pilula" aria-label="Seções">
      {itens.map(([sub, nome]) => (
        <a key={sub ?? ''} href={hrefRota(aba, sub)} aria-current={atual === sub ? 'page' : undefined}>
          {nome}
        </a>
      ))}
    </nav>
  );
}

export const ABAS_MERCADO: [string | null, string][] = [
  [null, 'Visão geral'],
  ['setores', 'Setores'],
  ['acoes', 'Ações'],
  ['indices_br', 'Índices Brasil'],
  ['indices_mundo', 'Índices globais'],
  ['moedas', 'Moedas'],
  ['commodities', 'Commodities'],
  ['fiis', 'FIIs'],
  ['cripto', 'Cripto'],
];

export const ABAS_RENDA_FIXA: [string | null, string][] = [
  [null, 'Taxas de referência'],
  ['di', 'Curva DI'],
  ['tesouro', 'Tesouro Direto'],
  ['juros_mundo', 'Juros no mundo'],
];
