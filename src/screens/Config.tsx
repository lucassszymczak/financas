import { useEffect, useMemo, useRef, useState } from 'react';
import { useEstado } from '../state';
import { Secao, IconeLixeira } from '../components/Basicos';
import { useDialogo } from '../components/Dialogo';
import { useCarregar } from '../components/Carregar';
import { useSincronizacao } from '../components/Sincronizacao';
import {
  COR_PADRAO,
  CONFIG_PADRAO,
  descreverRegra,
  ehRegra,
  type Config,
  type GrupoWatch,
  type Limite,
  type Tema,
} from '../lib/config';
import { apagarTudo, listarEdicoes, salvarEdicao } from '../lib/db';
import { baixarArquivo, lerBackup, montarBackup } from '../lib/importar';
import { dataHora, hojeISO, lerNumero, numero } from '../lib/formato';
import { todosPrecos } from '../lib/precos';
import { extrairCodigo, linkPareamento } from '../lib/pareamento';
import qrcode from 'qrcode-generator';
import { AtivoIcone } from '../components/AtivoIcone';

function mover<T>(lista: T[], i: number, delta: number): T[] {
  const j = i + delta;
  if (j < 0 || j >= lista.length) return lista;
  const nova = [...lista];
  [nova[i], nova[j]] = [nova[j]!, nova[i]!];
  return nova;
}

function Aparencia({ config, salvar }: { config: Config; salvar: (c: Config) => void }) {
  const [nome, setNome] = useState(config.nomeApp);
  return (
    <div className="cartao calc">
      <div className="grade-campos">
        <div className="campo">
          <label htmlFor="cfg-nome">Nome do app</label>
          <input
            id="cfg-nome"
            value={nome}
            maxLength={40}
            onChange={(e) => setNome(e.target.value)}
            onBlur={() => salvar({ ...config, nomeApp: nome.trim() || CONFIG_PADRAO.nomeApp })}
          />
        </div>
        <div className="campo">
          <label htmlFor="cfg-cor">Cor de destaque</label>
          <div className="botoes">
            <input
              id="cfg-cor"
              type="color"
              value={config.corDestaque}
              onChange={(e) => salvar({ ...config, corDestaque: e.target.value })}
            />
            <button type="button" className="btn btn-pequeno" onClick={() => salvar({ ...config, corDestaque: COR_PADRAO })}>
              Restaurar navy da marca
            </button>
          </div>
          <span className="mudo pequeno">O tom é ajustado automaticamente para manter a leitura confortável em cada tema.</span>
        </div>
        <div className="campo">
          <label htmlFor="cfg-tema">Tema</label>
          <select id="cfg-tema" value={config.tema} onChange={(e) => salvar({ ...config, tema: e.target.value as Tema })}>
            <option value="sistema">Igual ao do aparelho</option>
            <option value="escuro">Escuro (homebroker)</option>
            <option value="claro">Claro (institucional)</option>
          </select>
        </div>
        <div className="campo">
          <label className="check">
            <input
              type="checkbox"
              checked={config.mostrarLogos}
              onChange={(e) => salvar({ ...config, mostrarLogos: e.target.checked })}
            />
            <span>Mostrar logos e bandeiras</span>
          </label>
          <span className="mudo pequeno">Imagens guardadas no próprio app (pasta public/logos); funcionam sem internet.</span>
        </div>
      </div>
    </div>
  );
}

function Watchlist({ config, salvar, nomes }: { config: Config; salvar: (c: Config) => void; nomes: Map<string, string> }) {
  const [novo, setNovo] = useState<Record<number, string>>({});
  const set = (watchlist: GrupoWatch[]) => salvar({ ...config, watchlist });
  const g = config.watchlist;

  return (
    <div className="watch">
      {g.map((grupo, gi) => (
        <div key={gi} className="cartao watch-grupo">
          <div className="secao-topo">
            <input
              className="watch-nome"
              aria-label="Nome do grupo"
              value={grupo.nome}
              onChange={(e) => set(g.map((x, i) => (i === gi ? { ...x, nome: e.target.value } : x)))}
            />
            <div className="botoes">
              <button
                type="button"
                className="btn btn-pequeno btn-icone"
                aria-label={`Subir grupo ${grupo.nome}`}
                onClick={() => set(mover(g, gi, -1))}
                disabled={gi === 0}
              >
                ↑
              </button>
              <button
                type="button"
                className="btn btn-pequeno btn-icone"
                aria-label={`Descer grupo ${grupo.nome}`}
                onClick={() => set(mover(g, gi, 1))}
                disabled={gi === g.length - 1}
              >
                ↓
              </button>
              <button
                type="button"
                className="btn btn-pequeno btn-icone"
                aria-label={`Remover grupo ${grupo.nome}`}
                onClick={() => set(g.filter((_, i) => i !== gi))}
              >
                <IconeLixeira />
              </button>
            </div>
          </div>
          <ul className="watch-itens">
            {grupo.itens.map((it, ii) => {
              const atualiza = (itens: typeof grupo.itens) => set(g.map((x, i) => (i === gi ? { ...x, itens } : x)));
              return (
                <li key={`${it.id}-${ii}`}>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={it.ativo}
                      onChange={(e) => atualiza(grupo.itens.map((x, j) => (j === ii ? { ...x, ativo: e.target.checked } : x)))}
                    />
                    <span>
                      {!ehRegra(it.id) && <AtivoIcone id={it.id} nome={nomes.get(it.id)} />} <strong>{it.id}</strong> {nomes.get(it.id) && <span className="mudo">{nomes.get(it.id)}</span>}
                      {ehRegra(it.id) && <span className="mudo"> ({descreverRegra(it.id)})</span>}
                    </span>
                  </label>
                  <span className="botoes">
                    <button
                      type="button"
                      className="btn btn-pequeno btn-icone"
                      aria-label={`Subir ${it.id}`}
                      onClick={() => atualiza(mover(grupo.itens, ii, -1))}
                      disabled={ii === 0}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn btn-pequeno btn-icone"
                      aria-label={`Descer ${it.id}`}
                      onClick={() => atualiza(mover(grupo.itens, ii, 1))}
                      disabled={ii === grupo.itens.length - 1}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="btn btn-pequeno btn-icone"
                      aria-label={`Remover ${it.id}`}
                      onClick={() => atualiza(grupo.itens.filter((_, j) => j !== ii))}
                    >
                      ✕
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
          <form
            className="botoes"
            onSubmit={(e) => {
              e.preventDefault();
              const id = (novo[gi] ?? '').trim().toUpperCase();
              if (!id || grupo.itens.some((x) => x.id === id)) return;
              set(g.map((x, i) => (i === gi ? { ...x, itens: [...x.itens, { id, ativo: true }] } : x)));
              setNovo({ ...novo, [gi]: '' });
            }}
          >
            <input
              aria-label={`Novo ativo em ${grupo.nome}`}
              placeholder="Id (ex.: PETR3)"
              list="ids-conhecidos"
              value={novo[gi] ?? ''}
              onChange={(e) => setNovo({ ...novo, [gi]: e.target.value })}
            />
            <button type="submit" className="btn btn-pequeno">
              Adicionar
            </button>
          </form>
        </div>
      ))}
      <div className="botoes">
        <button type="button" className="btn" onClick={() => set([...g, { nome: 'Novo grupo', itens: [] }])}>
          ＋ Novo grupo
        </button>
        <button type="button" className="btn" onClick={() => set(CONFIG_PADRAO.watchlist)}>
          Restaurar lista padrão
        </button>
      </div>
    </div>
  );
}

function Limites({ config, salvar, nomes }: { config: Config; salvar: (c: Config) => void; nomes: Map<string, string> }) {
  const set = (limites: Limite[]) => salvar({ ...config, limites });
  const l = config.limites;
  // Texto em edição de cada valor (para aceitar vírgula enquanto digita).
  const [textos, setTextos] = useState<string[]>(() => l.map((x) => numero(x.valor, 2, 4)));
  // Quando os limites mudam por fora (restaurar padrões, backup), atualiza os textos que não batem mais.
  useEffect(() => {
    setTextos((prev) => config.limites.map((x, i) => (lerNumero(prev[i] ?? '') === x.valor ? prev[i]! : numero(x.valor, 2, 4))));
  }, [config.limites]);

  return (
    <div className="cartao calc">
      {l.length === 0 && <p className="mudo">Nenhum limite configurado.</p>}
      <ul className="limites">
        {l.map((x, i) => (
          <li key={i}>
            <input
              aria-label="Ativo"
              list="ids-conhecidos"
              value={x.id}
              onChange={(e) => set(l.map((y, j) => (j === i ? { ...y, id: e.target.value.toUpperCase() } : y)))}
            />
            <select
              aria-label="Condição"
              value={x.tipo}
              onChange={(e) => set(l.map((y, j) => (j === i ? { ...y, tipo: e.target.value as Limite['tipo'] } : y)))}
            >
              <option value="acima">acima de</option>
              <option value="abaixo">abaixo de</option>
            </select>
            <input
              aria-label="Valor"
              inputMode="decimal"
              value={textos[i] ?? ''}
              onChange={(e) => {
                const t = [...textos];
                t[i] = e.target.value;
                setTextos(t);
                const v = lerNumero(e.target.value);
                if (v !== null) set(l.map((y, j) => (j === i ? { ...y, valor: v } : y)));
              }}
            />
            <label className="check">
              <input
                type="checkbox"
                checked={x.ativo}
                onChange={(e) => set(l.map((y, j) => (j === i ? { ...y, ativo: e.target.checked } : y)))}
              />
              ativo
            </label>
            <button
              type="button"
              className="btn btn-pequeno btn-icone"
              aria-label={`Remover limite de ${x.id}`}
              onClick={() => {
                set(l.filter((_, j) => j !== i));
                setTextos(textos.filter((_, j) => j !== i));
              }}
            >
              <IconeLixeira />
            </button>
            {nomes.get(x.id) && <span className="mudo pequeno limite-nome">{nomes.get(x.id)}</span>}
          </li>
        ))}
      </ul>
      <div className="botoes">
        <button type="button" className="btn" onClick={() => set([...l, { id: '', tipo: 'acima', valor: 0, ativo: true }])}>
          ＋ Novo limite
        </button>
        <button type="button" className="btn" onClick={() => set(CONFIG_PADRAO.limites)}>
          Restaurar padrões
        </button>
      </div>
    </div>
  );
}

const LINK_CHAVE = 'https://github.com/settings/tokens/new?scopes=gist&description=Radar%20de%20Investimentos';

/** QR code desenhado em SVG (sem imagem externa), para o celular abrir o link de pareamento. */
function QrCodigo({ texto, rotulo }: { texto: string; rotulo: string }) {
  const qr = useMemo(() => {
    const q = qrcode(0, 'M');
    q.addData(texto);
    q.make();
    return q;
  }, [texto]);
  const n = qr.getModuleCount();
  let d = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.isDark(y, x)) d += `M${x + 4} ${y + 4}h1v1h-1z`;
  return (
    <svg className="qr" viewBox={`0 0 ${n + 8} ${n + 8}`} role="img" aria-label={rotulo} shapeRendering="crispEdges">
      <rect width={n + 8} height={n + 8} fill="#ffffff" />
      <path d={d} fill="#14213d" />
    </svg>
  );
}

/** Aparelho já conectado: gera o código + senha para conectar outro. */
function ConectarOutro() {
  const { gerarConvite } = useSincronizacao();
  const { aviso } = useCarregar();
  const [convite, setConvite] = useState<{ codigo: string; senha: string } | null>(null);
  const [erro, setErro] = useState('');
  const [gerando, setGerando] = useState(false);
  const gerar = async () => {
    setErro('');
    setGerando(true);
    try {
      setConvite(await gerarConvite());
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível gerar o código.');
    } finally {
      setGerando(false);
    }
  };
  if (!convite)
    return (
      <div className="botoes">
        <button type="button" className="btn" disabled={gerando} onClick={() => void gerar()}>
          {gerando ? 'Gerando código…' : 'Conectar outro aparelho'}
        </button>
        {erro && <p className="erro-sync">{erro}</p>}
      </div>
    );
  const link = linkPareamento(convite.codigo);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(convite.codigo);
      aviso('Código copiado.');
    } catch {
      aviso('Não foi possível copiar. Selecione o código e copie à mão.');
    }
  };
  return (
    <div className="convite" aria-live="polite">
      <h4>Conectar outro aparelho</h4>
      <div className="convite-corpo">
        <QrCodigo texto={link} rotulo="QR code para conectar outro aparelho" />
        <div className="convite-passos">
          <p>
            <strong>1.</strong> No outro aparelho, aponte a câmera para o QR code ou cole o código abaixo em{' '}
            <em>Configurações → Sincronização → Tenho um código</em>.
          </p>
          <p>
            <strong>2.</strong> Digite a senha:
          </p>
          <p className="convite-senha num" aria-label={`Senha ${convite.senha.split('').join(' ')}`}>
            {convite.senha.slice(0, 3)} {convite.senha.slice(3)}
          </p>
          <p className="mudo pequeno">
            O código e a senha valem por 24 horas. Envie o código por mensagem para você mesmo, se quiser, mas não envie a senha
            junto: sem ela o código não abre. No iPhone com o app instalado na tela de início, abra o app e cole o código lá (a
            câmera abre o Safari, que guarda os dados separados do app).
          </p>
        </div>
      </div>
      <textarea className="convite-codigo" readOnly value={convite.codigo} rows={3} aria-label="Código de pareamento" />
      <div className="botoes">
        <button type="button" className="btn btn-primario" onClick={() => void copiar()}>
          Copiar código
        </button>
        {typeof navigator.share === 'function' && (
          <button
            type="button"
            className="btn"
            onClick={() => void navigator.share({ title: 'Código do Radar', text: convite.codigo }).catch(() => {})}
          >
            Compartilhar código
          </button>
        )}
        <button type="button" className="btn" onClick={() => setConvite(null)}>
          Fechar
        </button>
      </div>
    </div>
  );
}

/** Aparelho novo: entra com o código + senha gerados no aparelho já conectado. */
function EntrarComCodigo({ codigoInicial }: { codigoInicial: string | null }) {
  const { ligarComCodigo } = useSincronizacao();
  const [codigo, setCodigo] = useState(codigoInicial ?? '');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [conectando, setConectando] = useState(false);
  const pronto = !!extrairCodigo(codigo) && /^\d{6}$/.test(senha);
  return (
    <form
      className="entrar-codigo"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!pronto) return;
        setErro('');
        setConectando(true);
        try {
          await ligarComCodigo(codigo, senha);
        } catch (er) {
          setErro(er instanceof Error ? er.message : 'Não foi possível conectar.');
        } finally {
          setConectando(false);
        }
      }}
    >
      <h4>Tenho um código de outro aparelho</h4>
      <p className="mudo pequeno">
        No aparelho que já sincroniza, abra Configurações → Sincronização → <strong>Conectar outro aparelho</strong>.
      </p>
      <label htmlFor="cfg-codigo">Código</label>
      <textarea
        id="cfg-codigo"
        className="convite-codigo"
        rows={3}
        placeholder="RADAR1.…"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
      <label htmlFor="cfg-senha">Senha de 6 números</label>
      <div className="botoes">
        <input
          id="cfg-senha"
          className="campo-senha num"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          placeholder="000000"
          value={senha}
          onChange={(e) => setSenha(e.target.value.replace(/\D/g, '').slice(0, 6))}
        />
        <button type="submit" className="btn btn-primario" disabled={!pronto || conectando}>
          {conectando ? 'Conectando…' : 'Conectar'}
        </button>
      </div>
      {erro && (
        <p className="erro-sync" role="alert">
          {erro}
        </p>
      )}
    </form>
  );
}

function Sincronizar({ codigoInicial }: { codigoInicial: string | null }) {
  const { status, ligar, desligar, sincronizarAgora } = useSincronizacao();
  const { confirmar } = useDialogo();
  const { aviso } = useCarregar();
  const [chave, setChave] = useState('');
  const ocupado = status.estado === 'sincronizando';

  if (status.estado === 'desligada') {
    return (
      <div className="cartao calc">
        <p>
          Mantém histórico e configurações iguais no celular e no computador. Os dados ficam num <strong>Gist secreto</strong> da
          sua conta do GitHub (não aparece em buscas nem no seu perfil). A chave do GitHub só é pedida no primeiro aparelho; os
          outros entram com um código gerado pelo app.
        </p>
        <EntrarComCodigo codigoInicial={codigoInicial} />
        <details className="primeiro-aparelho" open={!codigoInicial}>
          <summary>Primeiro aparelho: conectar com a chave do GitHub</summary>
          <ol className="passos">
            <li>
              <a href={LINK_CHAVE} target="_blank" rel="noreferrer noopener">
                Abra esta página do GitHub
              </a>{' '}
              (já vem com a opção <strong>gist</strong> marcada). Em <em>Expiration</em>, escolha <em>No expiration</em> ou 1 ano
              e toque em <strong>Generate token</strong>.
            </li>
            <li>
              Copie a chave (começa com <code>ghp_</code>) e cole abaixo. Depois, conecte os outros aparelhos com{' '}
              <strong>Conectar outro aparelho</strong>, sem precisar da chave.
            </li>
          </ol>
          <form
            className="botoes"
            onSubmit={(e) => {
              e.preventDefault();
              if (chave.trim().length < 20) return;
              void ligar(chave).then(() => setChave(''));
            }}
          >
            <input
              aria-label="Chave do GitHub"
              placeholder="ghp_…"
              value={chave}
              onChange={(e) => setChave(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="campo-chave"
            />
            <button type="submit" className="btn btn-primario" disabled={chave.trim().length < 20}>
              Ativar sincronização
            </button>
          </form>
          <p className="mudo pequeno">
            A chave fica guardada só neste aparelho e só dá acesso aos seus Gists. Ela não vai para o backup. Para revogar,
            apague-a em github.com → Settings → Developer settings → Tokens (isso desconecta todos os aparelhos).
          </p>
        </details>
      </div>
    );
  }

  const quando = status.ultima ? dataHora(status.ultima) : 'ainda não sincronizado';
  return (
    <div className="cartao calc">
      <p className="status-sync">
        {status.estado === 'sincronizando' && <>Sincronizando…</>}
        {status.estado === 'ociosa' && <>Sincronização ativa · última vez: {quando}</>}
        {status.estado === 'erro' && <>{status.mensagem}</>}
      </p>
      {status.estado === 'erro' && <p className="mudo pequeno">Última sincronização bem-sucedida: {quando}.</p>}
      <p className="mudo pequeno">
        Sincroniza sozinho ao abrir o app e alguns segundos depois de carregar um arquivo, apagar uma edição ou mudar uma
        configuração.
      </p>
      <div className="botoes">
        <button
          type="button"
          className="btn btn-primario"
          disabled={ocupado}
          onClick={() => void sincronizarAgora().then(() => aviso('Sincronização concluída.'))}
        >
          Sincronizar agora
        </button>
        <button
          type="button"
          className="btn"
          onClick={async () => {
            const ok = await confirmar({
              titulo: 'Desligar sincronização',
              texto: 'Este aparelho para de sincronizar e esquece a chave. Os dados daqui e do GitHub continuam como estão.',
              ok: 'Desligar',
            });
            if (ok) await desligar();
          }}
        >
          Desligar neste aparelho
        </button>
      </div>
      <ConectarOutro />
    </div>
  );
}

function Backup() {
  const { config, recarregar, salvarConfig, abrirEdicao } = useEstado();
  const { confirmar, avisar } = useDialogo();
  const { aviso } = useCarregar();
  const ref = useRef<HTMLInputElement>(null);
  const [persistente, setPersistente] = useState<boolean | null>(null);

  useEffect(() => {
    navigator.storage
      ?.persisted?.()
      .then(setPersistente)
      .catch(() => setPersistente(null));
  }, []);

  const exportar = async () => {
    const edicoes = await listarEdicoes();
    baixarArquivo(`radar-backup_${hojeISO()}.json`, JSON.stringify(montarBackup(edicoes, config)));
    aviso(`Backup com ${edicoes.length} ${edicoes.length === 1 ? 'edição' : 'edições'} gerado.`);
  };

  const importar = async (arquivo: File) => {
    const r = lerBackup(await arquivo.text());
    if (!r.ok) {
      await avisar({ titulo: 'Backup inválido', texto: r.erro });
      return;
    }
    const { edicoes, invalidas, config: cfg } = r.backup;
    const ok = await confirmar({
      titulo: 'Restaurar backup',
      texto: (
        <>
          <p>
            O backup tem <strong>{edicoes.length}</strong> {edicoes.length === 1 ? 'edição' : 'edições'}. Edições com a mesma data
            serão substituídas; as outras que você já tem continuam aqui. As configurações também serão restauradas.
          </p>
          {invalidas.length > 0 && <p className="campo-aviso">{invalidas.length} edição(ões) inválida(s) serão ignoradas.</p>}
        </>
      ),
      ok: 'Restaurar',
    });
    if (!ok) return;
    // Data de importação renovada: a restauração vale como importação nova (inclusive na sincronização).
    const agora = new Date().toISOString();
    for (const e of edicoes) await salvarEdicao({ ...e, importadoEm: agora });
    await salvarConfig(cfg);
    await recarregar();
    abrirEdicao(null);
    aviso('Backup restaurado.');
  };

  const apagar = async () => {
    const ok = await confirmar({
      titulo: 'Apagar todas as edições',
      texto:
        'Todas as edições salvas neste aparelho serão apagadas. As configurações continuam. Faça um backup antes, se quiser guardar o histórico.',
      ok: 'Apagar tudo',
      perigo: true,
    });
    if (!ok) return;
    await apagarTudo();
    abrirEdicao(null);
    await recarregar();
    aviso('Edições apagadas.');
  };

  return (
    <div className="cartao calc">
      <p>
        Os dados ficam só neste navegador. Para levar para outro aparelho ou se proteger de uma limpeza do navegador, gere um
        backup (um único arquivo JSON com todo o histórico e as configurações).
      </p>
      <div className="botoes">
        <button type="button" className="btn btn-primario" onClick={() => void exportar()}>
          ⬇️ Exportar backup
        </button>
        <button type="button" className="btn" onClick={() => ref.current?.click()}>
          ⬆️ Importar backup
        </button>
        <input
          ref={ref}
          type="file"
          accept=".json,application/json"
          hidden
          data-testid="input-backup"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void importar(f);
          }}
        />
      </div>
      {persistente === false && (
        <div className="botoes">
          <span className="mudo pequeno">O navegador pode apagar os dados se faltar espaço.</span>
          <button
            type="button"
            className="btn btn-pequeno"
            onClick={() =>
              void navigator.storage.persist().then((p) => {
                setPersistente(p);
                aviso(p ? 'Armazenamento protegido.' : 'O navegador não permitiu. Instale o app (PWA) para mais proteção.');
              })
            }
          >
            Pedir armazenamento persistente
          </button>
        </div>
      )}
      <hr className="divisor" />
      <div className="botoes">
        <button type="button" className="btn btn-perigo" onClick={() => void apagar()}>
          Apagar todas as edições
        </button>
      </div>
    </div>
  );
}

export function Config({ parear = null }: { parear?: string | null }) {
  // Chegou pelo link/QR de pareamento: vai direto para a sincronização.
  useEffect(() => {
    if (parear) document.getElementById('cfg-sync')?.scrollIntoView({ block: 'start' });
  }, [parear]);
  const { config, salvarConfig, edicoes } = useEstado();
  const salvar = (c: Config) => void salvarConfig(c);
  const nomes = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of [...edicoes].reverse()) for (const p of todosPrecos(e.radar)) m.set(p.id, p.nome);
    return m;
  }, [edicoes]);

  return (
    <div className="tela">
      <datalist id="ids-conhecidos">
        {[...nomes.entries()].map(([id, nome]) => (
          <option key={id} value={id}>
            {nome}
          </option>
        ))}
      </datalist>
      <Secao titulo="Aparência" id="cfg-aparencia">
        <Aparencia config={config} salvar={salvar} />
      </Secao>
      <Secao titulo="O que acompanhar" id="cfg-watch">
        <p className="mudo pequeno">
          Esta lista organiza a aba Mercado → Minha lista. O app só mostra o que vier no arquivo; ativos ausentes aparecem como
          “sem dado hoje”. Um id terminado em * (ex.: TESOURO_PRE_*) pega todos os vencimentos.
        </p>
        <Watchlist config={config} salvar={salvar} nomes={nomes} />
      </Secao>
      <Secao titulo="Limites de preço" id="cfg-limites">
        <p className="mudo pequeno">Quando o arquivo cruzar um limite, o card fica destacado e o alerta aparece na tela Hoje.</p>
        <Limites config={config} salvar={salvar} nomes={nomes} />
      </Secao>
      <Secao titulo="Sincronização entre aparelhos" id="cfg-sync">
        <Sincronizar codigoInicial={parear} />
      </Secao>
      <Secao titulo="Backup" id="cfg-backup">
        <Backup />
      </Secao>
      <p className="mudo pequeno centro">
        {config.nomeApp} · versão {__VERSAO__} · {edicoes.length} {edicoes.length === 1 ? 'edição salva' : 'edições salvas'}
      </p>
    </div>
  );
}
