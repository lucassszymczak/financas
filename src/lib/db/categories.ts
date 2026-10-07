import type { Dedutivel, Tipo } from './schemas';

export const CATEGORIAS: Record<Tipo, readonly string[]> = {
  saida: [
    'Moradia',
    'Carro (parcela)',
    'Escola',
    'Acordo familiar',
    'Seguros',
    'Assinaturas',
    'Poupança dos filhos',
    'Mercado (além do VA)',
    'Restaurante',
    'Transporte',
    'Combustível',
    'Saúde',
    'Farmácia',
    'Lazer',
    'Vestuário',
    'Estética',
    'Informática',
    'Educação/Cultura',
    'Casa e manutenção',
    'Presentes',
    'Música (equipamento)',
    'Outros',
  ],
  entrada: ['Salário líquido', 'Música (shows)', 'Juros e rendimentos', 'Outras entradas'],
  trabalho: ['Hospedagem', 'Transporte', 'Alimentação em viagem', 'Combustível', 'Outros'],
  extra_in: ['13º salário', 'PLR', 'Restituição IR', '1/3 de férias', 'Outros'],
  extra_out: ['Reforma', 'Amortização de dívida', 'Depósito na reserva', 'Longevidade', 'Uso livre (30%)', 'Outros'],
};

export const TIPO_LABEL: Record<Tipo, string> = {
  saida: 'Saída',
  entrada: 'Entrada',
  trabalho: 'Trabalho (reembolsável)',
  extra_in: 'Extraordinário (entrada)',
  extra_out: 'Extraordinário (destino)',
};

export const TIPO_LABEL_CURTO: Record<Tipo, string> = {
  saida: 'Saídas',
  entrada: 'Entradas',
  trabalho: 'Trabalho',
  extra_in: 'Extra (entrada)',
  extra_out: 'Extra (destino)',
};

export const DEDUTIVEL_LABEL: Record<'saude' | 'educacao', string> = {
  saude: 'Saúde',
  educacao: 'Educação',
};

/** Tipos que entram no resultado do mês. */
export const TIPOS_RESULTADO: readonly Tipo[] = ['saida', 'entrada'];

export function categoriaPadrao(tipo: Tipo): string {
  return tipo === 'entrada' ? 'Outras entradas' : 'Outros';
}

export function categoriaValida(tipo: Tipo, categoria: string): boolean {
  return CATEGORIAS[tipo].includes(categoria);
}

export type KeywordSeed = { palavra: string; tipo: Tipo; categoria: string; dedutivel: Dedutivel };

const k = (palavras: string[], tipo: Tipo, categoria: string, dedutivel: Dedutivel = null): KeywordSeed[] =>
  palavras.map((palavra) => ({ palavra, tipo, categoria, dedutivel }));

/** Dicionário inicial (editável na tela de Ajustes). */
export const DICIONARIO_INICIAL: KeywordSeed[] = [
  ...k(['posto', 'ipiranga', 'shell', 'petrobras'], 'saida', 'Combustível'),
  ...k(['farmacia', 'drogaria', 'raia', 'pague menos'], 'saida', 'Farmácia'),
  ...k(['uber', '99'], 'saida', 'Transporte'),
  ...k(['mercado', 'supermercado', 'atacad'], 'saida', 'Mercado (além do VA)'),
  ...k(['restaurante', 'lanch', 'pizz', 'ifood'], 'saida', 'Restaurante'),
  ...k(['clinica', 'odonto', 'laborat', 'hospital', 'medic', 'fisio', 'psicolog'], 'saida', 'Saúde', 'saude'),
  ...k(['escola', 'colegio', 'educacional'], 'saida', 'Escola', 'educacao'),
  ...k(['hotel', 'pousada', 'airbnb', 'booking'], 'trabalho', 'Hospedagem'),
  ...k(['netflix', 'spotify', 'apple', 'google', 'amazon prime'], 'saida', 'Assinaturas'),
];
