import type { Settings } from './schemas';

/** Configuração vazia. Nenhum valor pessoal: tudo começa em zero. */
export function defaultSettings(): Settings {
  return {
    id: 'main',
    reserva: 0,
    capital: 0,
    longevidadeModo: '2/2',
    salarioBaseLongevidade: 0,
    ultimoMesAplicado: null,
    jurosPagos: 0,
    fipeCarro: 0,
    projecao: {
      resultadoManual: null,
      pisoReserva: 1_500_000,
      decimoNov: 0,
      decimoDez: 0,
      plrMarco: 0,
      restituicaoJunho: 0,
      janelaLongevidade: null,
    },
    tetos: {},
    ultimoBackup: null,
    ultimoRestauro: null,
    tema: 'auto',
  };
}
