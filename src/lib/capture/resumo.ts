import { normalizar } from './normalizar';

const MAPA: [RegExp, string][] = [
  [/restaurante|alimentacao|bares|delivery/, 'Restaurante'],
  [/mercado/, 'Mercado (além do VA)'],
  [/transporte|viage/, 'Transporte'],
  [/saude/, 'Saúde'],
  [/farmacia/, 'Farmácia'],
  [/lazer|entretenimento/, 'Lazer'],
  [/vestuario|roupa/, 'Vestuário'],
  [/educacao/, 'Educação/Cultura'],
  [/assinatura/, 'Assinaturas'],
  [/combustivel/, 'Combustível'],
  [/casa|moradia/, 'Casa e manutenção'],
  [/beleza|cuidados/, 'Estética'],
  [/eletronico|tecnologia/, 'Informática'],
  [/presente/, 'Presentes'],
  [/seguro/, 'Seguros'],
];

/** Categoria de saída correspondente ao rótulo de um resumo de app de cartão. */
export function categoriaDoResumo(rotulo: string): string | null {
  const n = normalizar(rotulo);
  for (const [re, cat] of MAPA) if (re.test(n)) return cat;
  return null;
}
