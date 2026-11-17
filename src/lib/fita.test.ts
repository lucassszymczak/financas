import { describe, expect, it } from 'vitest';
import {
  VELOCIDADE,
  arrastar,
  avancar,
  comecarArraste,
  embrulhar,
  estadoInicial,
  fecharDetalhe,
  mover,
  pararEm,
  rodando,
  selo,
  soltar,
} from './fita';

const METADE = 1000;

describe('fita: regra de pausa e retomada', () => {
  it('roda sozinha a ~38 px/s e dá a volta sem salto', () => {
    let e = estadoInicial();
    e = avancar(e, 0.05, 0, METADE);
    expect(e.x).toBeCloseTo(-VELOCIDADE * 0.05);
    expect(embrulhar(-1000.5, METADE)).toBeCloseTo(-0.5);
    expect(embrulhar(30, METADE)).toBe(-970);
    expect(embrulhar(-1000, METADE)).toBe(0);
  });
  it('não para ao passar o mouse: só arraste, foco, parada ou espera seguram', () => {
    const e = estadoInicial();
    expect(rodando(e, 0)).toBe(true);
    expect(rodando({ ...e, foco: true }, 0)).toBe(false);
    expect(selo(e, 0)).toBeNull();
  });
  it('arrastar move nos dois sentidos, segue com inércia e retoma 1,8 s depois de soltar', () => {
    let e = comecarArraste(estadoInicial());
    expect(rodando(e, 0)).toBe(false);
    expect(selo(e, 0)).toBe('Você está no controle');
    e = arrastar(e, 0, 120, METADE, 600);
    expect(e.x).toBe(-880);
    e = arrastar(e, 0, -50, METADE, -200);
    expect(e.x).toBe(-50);
    const r = soltar(e, 10_000, -50, 'PETR4');
    expect(r.abrir).toBeNull();
    e = r.estado;
    expect(e.parada).toBeNull();
    const antes = e.x;
    e = avancar(e, 0.05, 10_050, METADE);
    expect(e.x).not.toBe(antes); // inércia
    expect(rodando({ ...e, vel: 0 }, 11_000)).toBe(false);
    expect(selo({ ...e, vel: 0 }, 11_000)).toBe('Você está no controle');
    expect(rodando({ ...e, vel: 0 }, 11_800)).toBe(true);
  });
  it('clique sem arrastar (< 6 px) num ativo para a fita nele e abre o detalhe', () => {
    let e = comecarArraste(estadoInicial());
    const r = soltar(e, 5_000, 4, 'VALE3');
    expect(r.abrir).toBe('VALE3');
    e = r.estado;
    expect(e.parada).toBe('VALE3');
    expect(selo(e, 60_000)).toBe('Parada em VALE3');
    expect(rodando(e, 60_000)).toBe(false);
    const parado = avancar(e, 0.05, 60_000, METADE);
    expect(parado.x).toBe(e.x);
    // Fechou o detalhe: volta a rodar em ~0,5 s.
    e = fecharDetalhe(e, 60_000);
    expect(e.parada).toBeNull();
    expect(rodando(e, 60_400)).toBe(false);
    expect(rodando(e, 60_500)).toBe(true);
  });
  it('clique fora de um ativo não abre nada', () => {
    const r = soltar(comecarArraste(estadoInicial()), 0, 2, null);
    expect(r.abrir).toBeNull();
    expect(r.estado.parada).toBeNull();
  });
  it('roda do mouse e setas movem e adiam a retomada', () => {
    let e = mover(estadoInicial(), -160, 1_000, METADE, 2_500);
    expect(e.x).toBe(-160);
    expect(rodando(e, 3_000)).toBe(false);
    expect(rodando(e, 3_500)).toBe(true);
    e = pararEm(e, 'IBOV');
    expect(selo(e, 0)).toBe('Parada em IBOV');
  });
  it('com movimento reduzido não roda sozinha, mas arrasta', () => {
    let e = estadoInicial(false);
    expect(rodando(e, 99_999)).toBe(false);
    expect(avancar(e, 0.05, 99_999, METADE).x).toBe(0);
    e = arrastar(comecarArraste(e), 0, -30, METADE, 0);
    expect(e.x).toBe(-30);
    expect(selo(soltar(e, 0, -30, null).estado, 100)).toBeNull();
  });
});
