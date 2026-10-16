/** IR regressivo da renda fixa (prazo em dias corridos). */
export function aliquotaIR(dias: number): number {
  if (dias <= 180) return 0.225;
  if (dias <= 360) return 0.2;
  if (dias <= 720) return 0.175;
  return 0.15;
}

/** Dias úteis aproximados a partir de dias corridos (252 úteis por 365 corridos). */
export const diasUteis = (diasCorridos: number) => Math.round((diasCorridos * 252) / 365);
