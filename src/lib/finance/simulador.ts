import { contribuicaoMensal, custoExtraSubir } from './longevidade';

/** Troca de carro: venda a 90% da FIPE − quitação do CDC − compra à vista. */
export function trocarCarro(p: { fipe: number; saldoCdc: number; compraAVista: number }): {
  venda: number;
  quitacao: number;
  saldo: number;
} {
  const venda = Math.round(p.fipe * 0.9);
  return { venda, quitacao: p.saldoCdc, saldo: venda - p.saldoCdc - p.compraAVista };
}

/** Efeito do 6/6 em 12 meses (a partir de 2/2). */
export function efeito66(salarioBase: number, meses = 12): { custoParaVoce: number; capitalExtra: number } {
  return {
    custoParaVoce: custoExtraSubir(salarioBase) * meses,
    capitalExtra: (contribuicaoMensal('6/6', salarioBase) - contribuicaoMensal('2/2', salarioBase)) * meses,
  };
}
