import { createContext, useContext, useId, useMemo, useState, type ReactNode } from 'react';
import { useRadar } from '../state';
import type { Radar } from '../schema/radar';
import { diaMes, lerNumero, numero, pct, reais } from '../lib/formato';
import { compararCdbLca } from '../lib/calc/cdb';
import { compararTitulos } from '../lib/calc/titulos';
import { projetarCapital } from '../lib/calc/capital';
import { anualParaMensal, mensalParaAnual, valorFuturo } from '../lib/calc/taxas';
import { bushelParaSacaReais, KG_ARROBA, sacaReaisParaBushel } from '../lib/calc/conversao';
import {
  buscarCotacao,
  PROCURA_ARROBA,
  PROCURA_CDI,
  PROCURA_DOLAR,
  PROCURA_IPCA,
  PROCURA_SELIC,
  PROCURA_TESOURO_IPCA,
  PRODUTOS,
  procuraBushel,
  procuraSaca,
  radaresAte,
  type Cotacao,
  type Produto,
} from '../lib/calc/cotacoes';

const CALCS = [
  { id: 'cdb', nome: 'CDB x LCA' },
  { id: 'titulos', nome: 'Pré x IPCA+ x Pós' },
  { id: 'capital', nome: 'Capital social' },
  { id: 'juros', nome: 'Juros e conversões' },
] as const;
type CalcId = (typeof CALCS)[number]['id'];

/** Texto inicial de um campo: número do arquivo formatado, ou vazio quando for null. */
const ini = (v: number | null | undefined, casas = 2) => (v === null || v === undefined ? '' : numero(v, casas, 4));

function Campo({
  rotulo,
  valor,
  onChange,
  sufixo,
  aviso,
  dica,
  extra,
}: {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  sufixo?: string;
  aviso?: string | null;
  dica?: string;
  extra?: ReactNode;
}) {
  const id = useId();
  const invalido = valor.trim() !== '' && lerNumero(valor) === null;
  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      <div className="campo-entrada">
        <input
          id={id}
          inputMode="decimal"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalido || undefined}
          aria-describedby={aviso || dica ? `${id}-d` : undefined}
        />
        {sufixo && <span className="sufixo">{sufixo}</span>}
      </div>
      {(aviso || dica || invalido) && (
        <span id={`${id}-d`} className={aviso || invalido ? 'campo-aviso' : 'mudo pequeno'}>
          {invalido ? 'Número inválido. Use vírgula para decimais (ex.: 12,5).' : (aviso ?? dica)}
        </span>
      )}
      {extra}
    </div>
  );
}

function Resultado({ children, faltando }: { children: ReactNode; faltando: boolean }) {
  return (
    <div className="resultado" aria-live="polite">
      {faltando ? <p className="mudo">Preencha todos os campos para ver o resultado.</p> : children}
    </div>
  );
}

const Aviso = ({ extra }: { extra?: string }) => (
  <p className="mudo pequeno aviso-simulacao">
    Simulação com as premissas acima, só para apoio à conversa. Não é recomendação nem garantia de rentabilidade.
    {extra ? ` ${extra}` : ''}
  </p>
);

/**
 * Cotações para pré-preencher as calculadoras: a mais recente de cada item, na edição aberta
 * ou, se ela não trouxer o dado, na última edição anterior que trouxe.
 */
function taxasDoDia(radares: Radar[]) {
  const b = (pr: Parameters<typeof buscarCotacao>[1]) => buscarCotacao(radares, pr);
  return {
    cdi: b(PROCURA_CDI),
    selic: b(PROCURA_SELIC),
    ipca: b(PROCURA_IPCA),
    pre: b({ ids: [], regra: (p) => p.id.startsWith('TESOURO_PRE_') }) ?? b({ ids: ['DI1F29'] }),
    real: b(PROCURA_TESOURO_IPCA),
    dolar: b(PROCURA_DOLAR),
    arroba: b(PROCURA_ARROBA),
    bushel: Object.fromEntries(PRODUTOS.map((g) => [g.id, b(procuraBushel(g.id))])) as Record<Produto, Cotacao | null>,
    saca: Object.fromEntries(PRODUTOS.map((g) => [g.id, b(procuraSaca(g.id))])) as Record<Produto, Cotacao | null>,
  };
}
type Taxas = ReturnType<typeof taxasDoDia>;

/** Data da edição aberta, para avisar quando a cotação veio de uma edição anterior. */
const EdicaoCtx = createContext('');

/** Texto do campo a partir da cotação (ou vazio). */
const doCot = (c: Cotacao | null, casas = 2) => ini(c?.valor, casas);

/**
 * Campo pré-preenchido com uma cotação do Radar. Pode ser editado à vontade; quando o valor
 * difere da cotação, aparece um botão para voltar a ela.
 */
function CampoCotado({
  cotacao,
  faltando,
  casas = 2,
  dica,
  ...props
}: {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  sufixo?: string;
  cotacao: Cotacao | null;
  /** Aviso quando o arquivo não trouxe a cotação. */
  faltando: string;
  casas?: number;
  dica?: string;
}) {
  const edicao = useContext(EdicaoCtx);
  const padrao = doCot(cotacao, casas);
  const editado = cotacao !== null && lerNumero(props.valor) !== lerNumero(padrao);
  const origem = cotacao
    ? `${dica ? `${dica} ` : ''}Cotação: ${cotacao.nome}${cotacao.dataRef ? `, ${diaMes(cotacao.dataRef)}` : ''}${
        cotacao.edicao !== edicao ? ` (edição de ${diaMes(cotacao.edicao)}, a última com o dado)` : ''
      }.`
    : undefined;
  return (
    <Campo
      {...props}
      aviso={cotacao === null ? faltando : null}
      dica={origem}
      extra={
        editado && (
          <button type="button" className="btn-link usar-cotacao" onClick={() => props.onChange(padrao)}>
            Usar cotação ({padrao})
          </button>
        )
      }
    />
  );
}

const AVISO_NULL = (nome: string) => `${nome} não veio nos arquivos carregados: informe manualmente.`;

function CdbLca({ tx }: { tx: Taxas }) {
  const [valor, setValor] = useState('10.000,00');
  const [dias, setDias] = useState('365');
  const [pCdb, setPCdb] = useState('100');
  const [pLca, setPLca] = useState('90');
  const [cdi, setCdi] = useState(doCot(tx.cdi));
  const n = [valor, dias, pCdb, pLca, cdi].map(lerNumero);
  const faltando = n.some((x) => x === null) || n[1]! <= 0;
  const r = faltando
    ? null
    : compararCdbLca({ valor: n[0]!, dias: n[1]!, pctCdb: n[2]! / 100, pctLca: n[3]! / 100, cdiAnual: n[4]! / 100 });

  return (
    <div className="cartao calc">
      <div className="grade-campos">
        <Campo rotulo="Valor aplicado" sufixo="R$" valor={valor} onChange={setValor} />
        <Campo rotulo="Prazo" sufixo="dias corridos" valor={dias} onChange={setDias} />
        <Campo rotulo="CDB/RDC" sufixo="% do CDI" valor={pCdb} onChange={setPCdb} />
        <Campo rotulo="LCA/LCI" sufixo="% do CDI" valor={pLca} onChange={setPLca} />
        <CampoCotado
          rotulo="CDI anual"
          sufixo="% a.a."
          valor={cdi}
          onChange={setCdi}
          cotacao={tx.cdi}
          faltando={AVISO_NULL('CDI')}
        />
      </div>
      <Resultado faltando={!r}>
        {r && (
          <>
            <div className="comparacao">
              <div className={r.vencedor === 'cdb' ? 'vencedor' : undefined}>
                <h4>CDB/RDC {r.vencedor === 'cdb' && '· melhor'}</h4>
                <p className="valor-grande num">{reais(r.cdb.liquido)}</p>
                <p className="mudo pequeno">
                  Bruto {reais(r.cdb.bruto)} · IR {pct(r.aliquota * 100, 1)} ({reais(r.cdb.ir)})
                </p>
              </div>
              <div className={r.vencedor === 'lca' ? 'vencedor' : undefined}>
                <h4>LCA/LCI (isenta) {r.vencedor === 'lca' && '· melhor'}</h4>
                <p className="valor-grande num">{reais(r.lca.liquido)}</p>
                <p className="mudo pequeno">Rendimento {reais(r.lca.rendimento)} · sem IR</p>
              </div>
            </div>
            <p className="frase">
              Uma LCA de <strong>{numero(n[3]!, 0, 2)}% do CDI</strong> equivale a um CDB de{' '}
              <strong>{numero(r.cdbEquivalente * 100, 1)}% do CDI</strong> neste prazo.{' '}
              {r.vencedor === 'empate'
                ? 'As duas opções empatam.'
                : r.vencedor === 'lca'
                  ? `A LCA rende ${reais(r.lca.liquido - r.cdb.liquido)} a mais, líquido.`
                  : `O CDB rende ${reais(r.cdb.liquido - r.lca.liquido)} a mais, líquido.`}
            </p>
          </>
        )}
      </Resultado>
      <Aviso extra="Usa dias úteis aproximados (252 por ano) e não considera FGC, liquidez ou carência." />
    </div>
  );
}

function Titulos({ tx }: { tx: Taxas }) {
  const [valor, setValor] = useState('10.000,00');
  const [anos, setAnos] = useState('3');
  const [pre, setPre] = useState(doCot(tx.pre));
  const [real, setReal] = useState(doCot(tx.real));
  const [infl, setInfl] = useState(doCot(tx.ipca));
  const [cdi, setCdi] = useState(doCot(tx.cdi));
  const [pCdi, setPCdi] = useState('100');
  const [ir, setIr] = useState(true);
  const n = [valor, anos, pre, real, infl, cdi, pCdi].map(lerNumero);
  const faltando = n.some((x) => x === null) || n[1]! <= 0;
  const r = faltando
    ? null
    : compararTitulos({
        valor: n[0]!,
        anos: n[1]!,
        pre: n[2]! / 100,
        real: n[3]! / 100,
        inflacaoEsperada: n[4]! / 100,
        cdiEsperado: n[5]! / 100,
        pctCdi: n[6]! / 100,
        descontarIR: ir,
      });
  const implicita = n[2] !== null && n[3] !== null ? ((1 + n[2]! / 100) / (1 + n[3]! / 100) - 1) * 100 : null;

  return (
    <div className="cartao calc">
      <div className="grade-campos">
        <Campo rotulo="Valor aplicado" sufixo="R$" valor={valor} onChange={setValor} />
        <Campo rotulo="Prazo" sufixo="anos" valor={anos} onChange={setAnos} />
        <CampoCotado
          rotulo="Taxa prefixada"
          sufixo="% a.a."
          valor={pre}
          onChange={setPre}
          cotacao={tx.pre}
          faltando={AVISO_NULL('Taxa prefixada')}
        />
        <CampoCotado
          rotulo="Juro real do IPCA+"
          sufixo="% a.a."
          valor={real}
          onChange={setReal}
          cotacao={tx.real}
          faltando="Tesouro IPCA+ não veio nos arquivos: informe a taxa real."
        />
        <CampoCotado
          rotulo="Inflação média esperada"
          sufixo="% a.a."
          valor={infl}
          onChange={setInfl}
          cotacao={tx.ipca}
          faltando="IPCA 12 meses não verificado nos arquivos: informe sua expectativa."
          dica="Sua premissa (começa com o IPCA 12 meses)."
        />
        <CampoCotado
          rotulo="CDI médio esperado"
          sufixo="% a.a."
          valor={cdi}
          onChange={setCdi}
          cotacao={tx.cdi}
          faltando={AVISO_NULL('CDI')}
        />
        <Campo rotulo="Pós-fixado" sufixo="% do CDI" valor={pCdi} onChange={setPCdi} />
        <label className="check">
          <input type="checkbox" checked={ir} onChange={(e) => setIr(e.target.checked)} />
          Descontar IR regressivo
        </label>
      </div>
      {implicita !== null && (
        <p className="frase destaque-frase">
          Inflação implícita (break-even): <strong>{pct(implicita)}</strong> ao ano.{' '}
          {n[4] !== null &&
            (n[4]! > implicita
              ? 'Sua inflação esperada está acima dela: o IPCA+ tende a render mais que o prefixado.'
              : n[4]! < implicita
                ? 'Sua inflação esperada está abaixo dela: o prefixado tende a render mais que o IPCA+.'
                : 'Sua inflação esperada é igual a ela: prefixado e IPCA+ empatam.')}
        </p>
      )}
      <Resultado faltando={!r}>
        {r && (
          <>
            <div className="comparacao tres">
              {r.alternativas.map((a) => (
                <div key={a.nome} className={a.nome === r.melhor ? 'vencedor' : undefined}>
                  <h4>
                    {a.nome} {a.nome === r.melhor && '· melhor'}
                  </h4>
                  <p className="valor-grande num">{reais(a.liquido)}</p>
                  <p className="mudo pequeno">
                    Bruto {reais(a.bruto)}
                    {ir && ` · IR ${reais(a.ir)}`}
                  </p>
                </div>
              ))}
            </div>
            <p className="frase">
              Em {numero(n[1]!, 0, 1)} {n[1] === 1 ? 'ano' : 'anos'}, com essas premissas, o melhor resultado líquido é o{' '}
              <strong>{r.melhor}</strong>.
            </p>
          </>
        )}
      </Resultado>
      <Aviso extra="Considera levar o título até o vencimento; antes disso, o preço oscila (marcação a mercado)." />
    </div>
  );
}

function Capital({ tx }: { tx: Taxas }) {
  const [inicial, setInicial] = useState('5.000,00');
  const [aporte, setAporte] = useState('200,00');
  const [anos, setAnos] = useState('5');
  const [pSelic, setPSelic] = useState('100');
  const [selic, setSelic] = useState(doCot(tx.selic));
  const [sobras, setSobras] = useState('0');
  const [ir, setIr] = useState(true);
  const n = [inicial, aporte, anos, pSelic, selic, sobras].map(lerNumero);
  const faltando = n.some((x) => x === null) || n[2]! <= 0;
  const taxaAnual = faltando ? 0 : (n[3]! / 100) * (n[4]! / 100);
  const r = faltando
    ? null
    : projetarCapital({
        inicial: n[0]!,
        aporteMensal: n[1]!,
        meses: Math.round(n[2]! * 12),
        taxaAnual,
        sobrasAnual: n[5]! / 100,
        irJuros: ir,
      });

  return (
    <div className="cartao calc">
      <div className="grade-campos">
        <Campo rotulo="Valor inicial integralizado" sufixo="R$" valor={inicial} onChange={setInicial} />
        <Campo rotulo="Aporte mensal" sufixo="R$" valor={aporte} onChange={setAporte} />
        <Campo rotulo="Prazo" sufixo="anos" valor={anos} onChange={setAnos} />
        <Campo
          rotulo="Remuneração (premissa)"
          sufixo="% da Selic"
          valor={pSelic}
          onChange={setPSelic}
          dica="Juros ao capital, conforme política da cooperativa."
        />
        <CampoCotado
          rotulo="Selic"
          sufixo="% a.a."
          valor={selic}
          onChange={setSelic}
          cotacao={tx.selic}
          faltando={AVISO_NULL('Selic')}
        />
        <Campo
          rotulo="Sobras (opcional)"
          sufixo="% a.a."
          valor={sobras}
          onChange={setSobras}
          dica="Distribuição anual estimada sobre o saldo."
        />
        <label className="check">
          <input type="checkbox" checked={ir} onChange={(e) => setIr(e.target.checked)} />
          Descontar IR de 15% sobre os juros ao capital
        </label>
      </div>
      <Resultado faltando={!r}>
        {r && (
          <>
            <div className="comparacao">
              <div className="vencedor">
                <h4>Saldo projetado</h4>
                <p className="valor-grande num">{reais(r.saldo)}</p>
                <p className="mudo pequeno">Total aportado {reais(r.aportado)}</p>
              </div>
              <div>
                <h4>Rendimento</h4>
                <p className="valor-grande num">{reais(r.saldo - r.aportado)}</p>
                <p className="mudo pequeno">
                  Juros {reais(r.juros)}
                  {ir && ` (IR ${reais(r.irJuros)})`} · Sobras {reais(r.sobras)}
                </p>
              </div>
            </div>
            <p className="frase">
              Integralizando {reais(n[0]!)} e mais {reais(n[1]!)} por mês, com remuneração de {pct(taxaAnual * 100)} ao ano
              {n[5]! > 0 ? ` e sobras de ${pct(n[5]!)} ao ano` : ''}, o capital chegaria a <strong>{reais(r.saldo)}</strong> em{' '}
              {numero(n[2]!, 0, 1)} {n[2] === 1 ? 'ano' : 'anos'}.
            </p>
            <details className="detalhe-anos">
              <summary>Saldo ano a ano</summary>
              <ul>
                {r.porAno.map((a) => (
                  <li key={a.ano}>
                    Ano {a.ano}: <span className="num">{reais(a.saldo)}</span>
                  </li>
                ))}
              </ul>
            </details>
          </>
        )}
      </Resultado>
      <Aviso extra="Juros ao capital e sobras dependem do resultado da cooperativa e de aprovação em assembleia: não são garantidos." />
    </div>
  );
}

function Juros({ tx }: { tx: Taxas }) {
  const [mensal, setMensal] = useState('1');
  const [anual, setAnual] = useState(doCot(tx.selic));
  const [vi, setVi] = useState('1.000,00');
  const [ap, setAp] = useState('100,00');
  const [tx_, setTx] = useState('1');
  const [meses, setMeses] = useState('12');
  const [dolar, setDolar] = useState(doCot(tx.dolar, 3));
  const [grao, setGraoEstado] = useState<Produto>('soja');
  const [bu, setBu] = useState(doCot(tx.bushel.soja));
  const [saca, setSaca] = useState(doCot(tx.saca.soja));
  const [arroba, setArroba] = useState(doCot(tx.arroba));
  // Trocar o produto traz as cotações dele (Chicago e saca); dá para editar depois.
  const setGrao = (g: Produto) => {
    setGraoEstado(g);
    setBu(doCot(tx.bushel[g]));
    setSaca(doCot(tx.saca[g]));
  };
  const nomeGrao = PRODUTOS.find((x) => x.id === grao)!.nome;

  const m = lerNumero(mensal);
  const a = lerNumero(anual);
  const fv = [vi, ap, tx_, meses].map(lerNumero);
  const d = lerNumero(dolar);
  const buN = lerNumero(bu);
  const sacaN = lerNumero(saca);
  const arrobaN = lerNumero(arroba);
  const vf = fv.some((x) => x === null) ? null : valorFuturo(fv[0]!, fv[1]!, fv[2]! / 100, Math.round(fv[3]!));

  return (
    <div className="calc-grupo">
      <div className="cartao calc">
        <h3>Taxa mensal ↔ anual</h3>
        <div className="grade-campos">
          <Campo rotulo="Taxa mensal" sufixo="% a.m." valor={mensal} onChange={setMensal} />
          <CampoCotado
            rotulo="Taxa anual"
            sufixo="% a.a."
            valor={anual}
            onChange={setAnual}
            cotacao={tx.selic}
            faltando="Selic não verificada nos arquivos: digite a taxa que quiser converter."
            dica="Começa com a Selic."
          />
        </div>
        <p className="frase">
          {m !== null && (
            <>
              {pct(m)} ao mês = <strong>{pct(mensalParaAnual(m / 100) * 100)} ao ano</strong>.{' '}
            </>
          )}
          {a !== null && (
            <>
              {pct(a)} ao ano = <strong>{pct(anualParaMensal(a / 100) * 100, 4)} ao mês</strong>.
            </>
          )}
        </p>
      </div>

      <div className="cartao calc">
        <h3>Valor futuro com aportes</h3>
        <div className="grade-campos">
          <Campo rotulo="Valor inicial" sufixo="R$" valor={vi} onChange={setVi} />
          <Campo rotulo="Aporte mensal" sufixo="R$" valor={ap} onChange={setAp} />
          <Campo rotulo="Taxa" sufixo="% a.m." valor={tx_} onChange={setTx} />
          <Campo rotulo="Prazo" sufixo="meses" valor={meses} onChange={setMeses} />
        </div>
        <Resultado faltando={vf === null}>
          {vf !== null && (
            <p className="frase">
              Em {numero(fv[3]!, 0)} meses, o valor chega a <strong>{reais(vf)}</strong>, dos quais{' '}
              {reais(fv[0]! + fv[1]! * Math.round(fv[3]!))} foram aportados e {reais(vf - fv[0]! - fv[1]! * Math.round(fv[3]!))}{' '}
              são juros.
            </p>
          )}
        </Resultado>
      </div>

      <div className="cartao calc">
        <h3>Saca e arroba: R$ ↔ US$</h3>
        <div className="grade-campos">
          <CampoCotado
            rotulo="Dólar"
            sufixo="R$"
            valor={dolar}
            onChange={setDolar}
            cotacao={tx.dolar}
            casas={3}
            faltando={AVISO_NULL('Dólar')}
          />
          <div className="campo">
            <label htmlFor="grao">Produto</label>
            <select id="grao" value={grao} onChange={(e) => setGrao(e.target.value as Produto)}>
              {PRODUTOS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nome}
                </option>
              ))}
            </select>
            <span className="mudo pequeno">Troca as cotações de Chicago e da saca para o produto escolhido.</span>
          </div>
          <CampoCotado
            rotulo={`${nomeGrao} Chicago`}
            sufixo="US$/bushel"
            valor={bu}
            onChange={setBu}
            cotacao={tx.bushel[grao]}
            faltando={`${nomeGrao} em Chicago não veio nos arquivos: digite o valor.`}
          />
          <CampoCotado
            rotulo={`${nomeGrao} saca 60 kg`}
            sufixo="R$"
            valor={saca}
            onChange={setSaca}
            cotacao={tx.saca[grao]}
            faltando={`Saca de ${nomeGrao.toLowerCase()} não veio nos arquivos: digite o valor.`}
          />
          <CampoCotado
            rotulo="Arroba do boi (15 kg)"
            sufixo="R$"
            valor={arroba}
            onChange={setArroba}
            cotacao={tx.arroba}
            faltando="Arroba do boi não veio nos arquivos: digite o valor."
          />
        </div>
        <Resultado faltando={d === null || d <= 0}>
          {d !== null && d > 0 && (
            <ul className="frase lista-conv">
              {buN !== null && (
                <li>
                  US$ {numero(buN, 2, 4)}/bushel de {nomeGrao.toLowerCase()} ={' '}
                  <strong>{reais(bushelParaSacaReais(buN, d, grao))}/saca</strong> (sem prêmio nem frete).
                </li>
              )}
              {sacaN !== null && (
                <li>
                  {reais(sacaN)}/saca = <strong>US$ {numero(sacaN / d)}/saca</strong> ou US${' '}
                  {numero(sacaReaisParaBushel(sacaN, d, grao), 2, 4)}
                  /bushel.
                </li>
              )}
              {arrobaN !== null && (
                <li>
                  {reais(arrobaN)}/@ = <strong>US$ {numero(arrobaN / d)}/@</strong> (US$ {numero(arrobaN / d / KG_ARROBA, 3)}/kg).
                </li>
              )}
            </ul>
          )}
        </Resultado>
      </div>
      <Aviso />
    </div>
  );
}

export function Calculadoras() {
  const { radar, edicoes } = useRadar();
  const [calc, setCalc] = useState<CalcId>('cdb');
  const tx = useMemo(
    () =>
      taxasDoDia(
        radaresAte(
          radar,
          edicoes.map((e) => e.radar),
        ),
      ),
    [radar, edicoes],
  );
  // A chave reinicia os campos quando outra edição é aberta.
  const k = `${calc}-${radar.edicao.data}`;
  return (
    <EdicaoCtx.Provider value={radar.edicao.data}>
      <div className="tela">
        <div className="alternador" role="group" aria-label="Calculadoras">
          {CALCS.map((c) => (
            <button key={c.id} type="button" aria-pressed={calc === c.id} onClick={() => setCalc(c.id)}>
              {c.nome}
            </button>
          ))}
        </div>
        {calc === 'cdb' && <CdbLca key={k} tx={tx} />}
        {calc === 'titulos' && <Titulos key={k} tx={tx} />}
        {calc === 'capital' && <Capital key={k} tx={tx} />}
        {calc === 'juros' && <Juros key={k} tx={tx} />}
      </div>
    </EdicaoCtx.Provider>
  );
}
