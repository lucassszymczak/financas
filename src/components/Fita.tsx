import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { Preco, Radar } from '../schema/radar';
import { numero, valorComUnidade, variacao } from '../lib/formato';
import { itensFita, opcoesFita } from '../lib/categorias';
import {
  RETOMA_SOLTAR,
  RETOMA_TECLADO,
  arrastar,
  avancar,
  comecarArraste,
  embrulhar,
  estadoInicial,
  fecharDetalhe,
  mover,
  pararEm,
  selo,
  soltar,
  type EstadoFita,
} from '../lib/fita';
import { useAbrirHistorico } from './HistoricoAtivo';
import { AtivoIcone } from './AtivoIcone';

/** Código curto para a fita: o ticker quando houver, senão o nome curto. */
function codigo(p: Preco): string {
  if (/^[A-Z0-9]{3,7}$/.test(p.id)) return p.id;
  return p.nome_curto ?? p.nome;
}

function ItemFita({ p, copia, parada }: { p: Preco; copia: boolean; parada: boolean }) {
  const v = variacao(p);
  const tom = !v ? 'z' : v.dir === 'alta' ? 'up' : v.dir === 'baixa' ? 'dn' : 'z';
  return (
    <button
      type="button"
      className={`fita-item${parada ? ' sel' : ''}`}
      data-id={p.id}
      tabIndex={copia ? -1 : 0}
      aria-hidden={copia || undefined}
      aria-label={`${p.nome}: ver detalhes`}
    >
      <AtivoIcone id={p.id} grupo={p.grupo} nome={p.nome} regiao={p.regiao} tamanho={18} />
      <span className="fita-cod">{codigo(p)}</span>
      {p.valor !== null && p.valor !== undefined && <span className="fita-valor">{valorComUnidade(p.valor, p.unidade)}</span>}
      <span className={`fita-var ${tom}`}>{v ? `${v.seta} ${v.texto.replace(/^[+−]/, '')}` : '—'}</span>
    </button>
  );
}

/** Linha abaixo do menu: SELIC, CDI e IPCA 12M à esquerda; seletor do que a fita mostra à direita. */
export function LinhaTaxas({ radar, filtro, setFiltro }: { radar: Radar; filtro: string; setFiltro: (f: string) => void }) {
  const t = radar.taxas_referencia;
  const opcoes = useMemo(() => opcoesFita(radar), [radar]);
  const grupos = (['Geral', 'Setores', 'Outros'] as const).map((g) => [g, opcoes.filter((o) => o.grupo === g)] as const);
  const taxa = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${numero(v, 2)}%`);
  return (
    <div className="taxas-faixa">
      <div className="taxas-linha">
        <dl className="taxas-pinos num" aria-label="Taxas de referência">
          <div>
            <dt>SELIC</dt>
            <dd>{taxa(t?.selic_meta)}</dd>
          </div>
          <div>
            <dt>CDI</dt>
            <dd>{taxa(t?.cdi_anual)}</dd>
          </div>
          <div>
            <dt>IPCA 12M</dt>
            <dd>{taxa(t?.ipca_12m)}</dd>
          </div>
        </dl>
        <label className="fita-filtro">
          <span>Fita:</span>
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="O que mostrar na fita">
            {grupos.map(
              ([g, os]) =>
                os.length > 0 && (
                  <optgroup key={g} label={g}>
                    {os.map((o) => (
                      <option key={o.valor} value={o.valor}>
                        {o.nome}
                      </option>
                    ))}
                  </optgroup>
                ),
            )}
          </select>
        </label>
      </div>
    </div>
  );
}

const movimentoReduzido = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * Fita de cotações de canto a canto. Roda sozinha (~38 px/s) e não para com o mouse por cima.
 * Arrastar (mouse ou dedo), a roda do mouse e as setas movem a fita; ela retoma ~1,8 s depois.
 * Clique sem arrastar num ativo para a fita nele e abre o detalhe; ao fechar, volta a rodar.
 */
export function Fita({ radar, filtro }: { radar: Radar; filtro: string }) {
  const abrir = useAbrirHistorico();
  const itens = useMemo(() => {
    const vistos = new Set<string>();
    return itensFita(radar, filtro).filter((p) => !vistos.has(p.id) && vistos.add(p.id));
  }, [radar, filtro]);
  const vista = useRef<HTMLDivElement>(null);
  const trilho = useRef<HTMLDivElement>(null);
  const seloRef = useRef<HTMLSpanElement>(null);
  const estado = useRef<EstadoFita>(estadoInicial(!movimentoReduzido()));
  const metade = useRef(1);
  const arraste = useRef<{ x0: number; xs: number; lx: number; lt: number; id: string | null; pid: number } | null>(null);
  const [repeticoes, setRepeticoes] = useState(1);
  const [parada, setParada] = useState<string | null>(null);
  const pendente = useRef<string | null>(null);

  const aplicar = () => {
    const t = trilho.current;
    if (t) t.style.transform = `translate3d(${estado.current.x}px,0,0)`;
    const s = selo(estado.current, performance.now());
    vista.current?.classList.toggle('segura', s !== null);
    if (s !== null && seloRef.current && seloRef.current.textContent !== s) seloRef.current.textContent = s;
  };

  // Repete os itens até cobrir 1,5× a largura da tela e duplica, para o laço não ter buraco nem salto.
  useLayoutEffect(() => {
    const v = vista.current;
    const t = trilho.current;
    if (!v || !t) return;
    const medir = () => {
      const largura = t.scrollWidth / (2 * repeticoes) || 1;
      const precisa = Math.min(12, Math.max(1, Math.ceil((v.clientWidth * 1.5) / largura)));
      if (precisa !== repeticoes) {
        setRepeticoes(precisa);
        return;
      }
      const proporcao = metade.current > 1 ? estado.current.x / metade.current : 0;
      metade.current = t.scrollWidth / 2 || 1;
      estado.current = { ...estado.current, x: embrulhar(proporcao * metade.current, metade.current) };
      aplicar();
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(v);
    return () => ro.disconnect();
  }, [itens, repeticoes]);

  // Trocar o filtro volta ao início e segura um instante.
  useEffect(() => {
    estado.current = { ...estado.current, x: 0, vel: 0, retomaEm: performance.now() + 800 };
    aplicar();
  }, [filtro]);

  useEffect(() => {
    let ultimo = performance.now();
    let quadro = 0;
    const laco = (t: number) => {
      const dt = (t - ultimo) / 1000;
      ultimo = t;
      const novo = avancar(estado.current, dt, t, metade.current);
      if (novo !== estado.current) estado.current = novo;
      aplicar();
      quadro = requestAnimationFrame(laco);
    };
    quadro = requestAnimationFrame(laco);
    return () => cancelAnimationFrame(quadro);
  }, []);

  const abrirDetalhe = (id: string) => {
    setParada(id);
    abrir(id, () => {
      estado.current = fecharDetalhe(estado.current, performance.now());
      setParada(null);
    });
  };

  const aoApertar = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-id]')?.dataset.id ?? null;
    pendente.current = null;
    arraste.current = { x0: e.clientX, xs: estado.current.x, lx: e.clientX, lt: performance.now(), id, pid: e.pointerId };
    estado.current = comecarArraste(estado.current);
  };
  const aoMover = (e: PointerEvent<HTMLDivElement>) => {
    const a = arraste.current;
    if (!a || a.pid !== e.pointerId) return;
    const dx = e.clientX - a.x0;
    // Só captura o ponteiro quando vira arraste, para o clique simples continuar funcionando.
    if (Math.abs(dx) > 3 && !vista.current?.hasPointerCapture(e.pointerId)) vista.current?.setPointerCapture(e.pointerId);
    const agora = performance.now();
    const dt = (agora - a.lt) / 1000;
    const vel = dt > 0 ? (e.clientX - a.lx) / dt : 0;
    estado.current = arrastar(estado.current, a.xs, dx, metade.current, vel);
    vista.current?.classList.toggle('arrastando', Math.abs(dx) > 3);
    a.lx = e.clientX;
    a.lt = agora;
    aplicar();
  };
  const aoSoltar = (e: PointerEvent<HTMLDivElement>, cancelado = false) => {
    const a = arraste.current;
    if (!a || a.pid !== e.pointerId) return;
    arraste.current = null;
    vista.current?.classList.remove('arrastando');
    const r = soltar(estado.current, performance.now(), cancelado ? Infinity : e.clientX - a.x0, a.id);
    estado.current = r.estado;
    if (r.abrir) setParada(r.abrir);
    // O detalhe abre no "click" que vem logo depois: no toque, abrir já no pointerup faria o
    // click de compatibilidade cair no fundo do pop-up e fechá-lo na hora.
    pendente.current = r.abrir;
    // Se o navegador não mandar o click (raro), abre assim mesmo para a fita não ficar parada.
    if (r.abrir) window.setTimeout(aoClicar, 500);
  };
  const aoClicar = () => {
    const id = pendente.current;
    pendente.current = null;
    if (id) abrirDetalhe(id);
  };

  const aoTeclar = (e: KeyboardEvent<HTMLDivElement>) => {
    const agora = performance.now();
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      estado.current = mover(estado.current, e.key === 'ArrowLeft' ? 160 : -160, agora, metade.current, RETOMA_TECLADO);
      aplicar();
      e.preventDefault();
    } else if (e.key === 'Enter' || e.key === ' ') {
      const id = (e.target as HTMLElement).closest<HTMLElement>('[data-id]')?.dataset.id;
      if (id) {
        e.preventDefault();
        estado.current = pararEm(estado.current, id);
        abrirDetalhe(id);
      }
    }
  };

  // A roda do mouse precisa de ouvinte não passivo para não rolar a página junto.
  useEffect(() => {
    const v = vista.current;
    if (!v) return;
    const roda = (e: WheelEvent) => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!d) return;
      estado.current = mover(estado.current, -d, performance.now(), metade.current, RETOMA_SOLTAR);
      aplicar();
      e.preventDefault();
    };
    v.addEventListener('wheel', roda, { passive: false });
    return () => v.removeEventListener('wheel', roda);
  }, []);

  if (!itens.length) return <div className="fita fita-vazia">Nenhum ativo nesta seleção da fita.</div>;

  const copias = Array.from({ length: repeticoes * 2 }, (_, i) => i);
  return (
    <div className="fita">
      <div
        ref={vista}
        className="fita-vista"
        tabIndex={0}
        role="region"
        aria-label="Fita de cotações. Arraste ou use as setas para navegar; clique num ativo para parar a fita nele."
        onPointerDown={aoApertar}
        // Clique de mouse não move o foco para o item: o foco do teclado é que segura a fita.
        onMouseDown={(e) => e.preventDefault()}
        onPointerMove={aoMover}
        onPointerUp={(e) => aoSoltar(e)}
        onPointerCancel={(e) => aoSoltar(e, true)}
        onClick={aoClicar}
        onKeyDown={aoTeclar}
        onFocus={(e) => {
          // O navegador rola a vista para mostrar o item focado; quem move a fita é o transform.
          e.currentTarget.scrollLeft = 0;
          const alvo = e.target as HTMLElement;
          if (alvo.dataset.id && alvo.matches(':focus-visible')) {
            // Teclado: traz o item focado para a vista e segura a fita enquanto ele tiver o foco.
            const x = embrulhar(16 - alvo.offsetLeft, metade.current);
            estado.current = { ...estado.current, foco: true, vel: 0, x };
            aplicar();
          }
        }}
        onBlur={(e) => {
          if ((e.target as HTMLElement).dataset.id)
            estado.current = { ...estado.current, foco: false, retomaEm: performance.now() + 800 };
        }}
      >
        <div ref={trilho} className="fita-trilho num">
          {copias.map((c) => itens.map((p) => <ItemFita key={`${c}-${p.id}`} p={p} copia={c > 0} parada={parada === p.id} />))}
        </div>
        <span ref={seloRef} className="fita-selo" aria-hidden="true">
          Você está no controle
        </span>
      </div>
    </div>
  );
}
