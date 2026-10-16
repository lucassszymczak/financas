/**
 * Regras da fita de cotações como funções puras (testáveis sem navegador).
 * O componente só chama estas funções e aplica `x` como deslocamento da trilha.
 */

export const VELOCIDADE = 38; // px/s
export const LIMIAR_CLIQUE = 6; // px: abaixo disso, soltar conta como clique
export const RETOMA_SOLTAR = 1800; // ms depois de soltar, rolar a roda ou mudar o filtro
export const RETOMA_TECLADO = 2500; // ms depois das setas do teclado
export const RETOMA_FECHAR = 500; // ms depois de fechar o detalhe
const VEL_MINIMA = 5; // px/s: abaixo disso a inércia acaba
const ATRITO = 0.04; // fração da velocidade que sobra depois de 1 s de inércia

export type EstadoFita = {
  /** Deslocamento da trilha, sempre em (−metade, 0]. */
  x: number;
  /** Velocidade da inércia (px/s), positiva para a direita. */
  vel: number;
  arrastando: boolean;
  /** Foco do teclado num item: segura a fita para não fugir do foco. */
  foco: boolean;
  /** Ativo em que a fita parou (clique), até o detalhe fechar. */
  parada: string | null;
  /** Instante (ms) a partir do qual a fita volta a rodar sozinha. */
  retomaEm: number;
  /** false com prefers-reduced-motion: só anda arrastando. */
  automatica: boolean;
};

export function estadoInicial(automatica = true): EstadoFita {
  return { x: 0, vel: 0, arrastando: false, foco: false, parada: null, retomaEm: 0, automatica };
}

/** Mantém x em (−metade, 0], para o laço ficar contínuo sem salto. */
export function embrulhar(x: number, metade: number): number {
  if (!(metade > 0)) return 0;
  const r = x % metade;
  return r > 0 ? r - metade : r === 0 ? 0 : r;
}

/** A fita roda sozinha agora? */
export function rodando(e: EstadoFita, agora: number): boolean {
  return e.automatica && !e.arrastando && !e.foco && e.parada === null && agora >= e.retomaEm && Math.abs(e.vel) <= VEL_MINIMA;
}

/** Selo exibido sobre a fita, ou null quando ela está rodando normalmente. */
export function selo(e: EstadoFita, agora: number): string | null {
  if (e.parada !== null) return `Parada em ${e.parada}`;
  if (e.arrastando || (e.automatica && agora < e.retomaEm)) return 'Você está no controle';
  return null;
}

/** Um quadro da animação: aplica a inércia ou o movimento automático. `dt` em segundos. */
export function avancar(e: EstadoFita, dt: number, agora: number, metade: number): EstadoFita {
  if (e.arrastando) return e;
  const passo = Math.min(0.05, Math.max(0, dt));
  if (Math.abs(e.vel) > VEL_MINIMA) {
    const vel = e.vel * Math.pow(ATRITO, passo);
    return { ...e, x: embrulhar(e.x + e.vel * passo, metade), vel: Math.abs(vel) > VEL_MINIMA ? vel : 0 };
  }
  if (rodando(e, agora)) return { ...e, vel: 0, x: embrulhar(e.x - VELOCIDADE * passo, metade) };
  return e.vel ? { ...e, vel: 0 } : e;
}

export function comecarArraste(e: EstadoFita): EstadoFita {
  return { ...e, arrastando: true, vel: 0 };
}

/** Durante o arraste: posição absoluta a partir do início e velocidade suavizada para a inércia. */
export function arrastar(e: EstadoFita, xInicial: number, dx: number, metade: number, velInstantanea: number): EstadoFita {
  return { ...e, x: embrulhar(xInicial + dx, metade), vel: 0.8 * e.vel + 0.2 * velInstantanea };
}

/**
 * Soltar o dedo/mouse. Se andou menos que o limiar, é clique: num ativo, a fita para nele e
 * `abrir` traz o id para abrir o detalhe. Se arrastou, segue com inércia e retoma em 1,8 s.
 */
export function soltar(
  e: EstadoFita,
  agora: number,
  deslocamento: number,
  idSobPonteiro: string | null,
): { estado: EstadoFita; abrir: string | null } {
  const base = { ...e, arrastando: false, retomaEm: agora + RETOMA_SOLTAR };
  if (Math.abs(deslocamento) >= LIMIAR_CLIQUE) return { estado: base, abrir: null };
  if (!idSobPonteiro) return { estado: { ...base, vel: 0 }, abrir: null };
  return { estado: { ...base, vel: 0, parada: idSobPonteiro }, abrir: idSobPonteiro };
}

/** Clique de teclado (Enter/Espaço) num item: para nele e abre o detalhe. */
export function pararEm(e: EstadoFita, id: string): EstadoFita {
  return { ...e, vel: 0, parada: id };
}

/** Roda do mouse ou setas: move e adia a retomada. */
export function mover(e: EstadoFita, dx: number, agora: number, metade: number, espera = RETOMA_SOLTAR): EstadoFita {
  return { ...e, vel: 0, x: embrulhar(e.x + dx, metade), retomaEm: Math.max(e.retomaEm, agora + espera) };
}

/** Fechou o detalhe: solta a parada e volta a rodar em ~0,5 s. */
export function fecharDetalhe(e: EstadoFita, agora: number): EstadoFita {
  return { ...e, parada: null, retomaEm: agora + RETOMA_FECHAR };
}
