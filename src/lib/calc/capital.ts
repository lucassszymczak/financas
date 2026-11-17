import { anualParaMensal } from './taxas';

export type ProjecaoCapital = {
  saldo: number;
  aportado: number;
  juros: number;
  sobras: number;
  irJuros: number;
  porAno: { ano: number; saldo: number }[];
};

/**
 * Capital social: aporte inicial + aportes mensais, juros ao capital (taxa anual,
 * creditada mês a mês) e sobras opcionais (% a.a. sobre o saldo, creditadas ao fim de cada ano).
 * O IR sobre juros ao capital (15%, retido na fonte) é opcional. Tudo é premissa: depende de assembleia.
 */
export function projetarCapital(o: {
  inicial: number;
  aporteMensal: number;
  meses: number;
  taxaAnual: number;
  sobrasAnual: number;
  irJuros: boolean;
}): ProjecaoCapital {
  const im = anualParaMensal(o.taxaAnual);
  let saldo = o.inicial;
  let aportado = o.inicial;
  let juros = 0;
  let sobras = 0;
  let irJuros = 0;
  const porAno: { ano: number; saldo: number }[] = [];
  for (let m = 1; m <= o.meses; m++) {
    const j = saldo * im;
    const ir = o.irJuros ? j * 0.15 : 0;
    juros += j;
    irJuros += ir;
    saldo += j - ir + o.aporteMensal;
    aportado += o.aporteMensal;
    if (m % 12 === 0 || m === o.meses) {
      if (m % 12 === 0 && o.sobrasAnual > 0) {
        const s = saldo * o.sobrasAnual;
        sobras += s;
        saldo += s;
      }
      porAno.push({ ano: Math.ceil(m / 12), saldo });
    }
  }
  return { saldo, aportado, juros, sobras, irJuros, porAno };
}
