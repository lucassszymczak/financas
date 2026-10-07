import { useEffect, useRef, useState } from 'react';
import { useToast } from '../../components/Toast';
import { useSettings } from '../../hooks/useData';
import {
  gerarBackup,
  lerBackup,
  marcarBackupFeito,
  nomeArquivoBackup,
  restaurarBackup,
  resumirBackup,
  type BackupLido,
  type ModoRestauro,
} from '../../lib/backup/backup';
import { compartilharArquivo, baixarArquivo, ehIOS, podeCompartilharArquivos } from '../../lib/backup/share';
import { db } from '../../lib/db/db';
import { formatDateBR } from '../../lib/dates';
import { limparLembreteBackup } from '../../lib/lembretes';
import { persistStatus, requestPersist, storageEstimate, type PersistStatus } from '../../lib/storage';

function quando(iso: string | null): string {
  if (!iso) return 'nunca';
  const d = new Date(iso);
  return `${formatDateBR(d.toISOString().slice(0, 10))} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

const PERSIST_LABEL: Record<PersistStatus, string> = {
  persistente: 'Persistente: o navegador não deve apagar os dados sozinho.',
  'nao-persistente': 'Não persistente: o navegador pode apagar os dados se faltar espaço ou após dias sem uso.',
  indisponivel: 'O navegador não informa o status.',
};

export function BackupSection() {
  const s = useSettings();
  const toast = useToast();
  const [ocupado, setOcupado] = useState(false);
  const [persist, setPersist] = useState<PersistStatus>('indisponivel');
  const [uso, setUso] = useState<{ usado: number; cota: number } | null>(null);
  const [lido, setLido] = useState<BackupLido | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const compartilhar = ehIOS() || podeCompartilharArquivos();

  useEffect(() => {
    void persistStatus().then(setPersist);
    void storageEstimate().then(setUso);
  }, []);

  const salvar = async (modo: 'compartilhar' | 'baixar') => {
    setOcupado(true);
    try {
      const blob = await gerarBackup(db);
      const nome = nomeArquivoBackup();
      const r =
        modo === 'compartilhar'
          ? await compartilharArquivo(blob, nome, 'Backup do Plano Patrimonial')
          : (baixarArquivo(blob, nome), 'baixado');
      if (r !== 'cancelado') {
        await marcarBackupFeito(db);
        limparLembreteBackup();
        toast.show(r === 'compartilhado' ? 'Backup pronto' : 'Backup baixado');
      }
    } catch (e) {
      toast.show(`Erro no backup: ${(e as Error).message}`);
    } finally {
      setOcupado(false);
    }
  };

  const restaurar = async (modo: ModoRestauro) => {
    if (!lido) return;
    if (modo === 'substituir' && !window.confirm('Substituir TODOS os dados deste aparelho pelo backup?')) return;
    setOcupado(true);
    try {
      await restaurarBackup(db, lido, modo);
      setLido(null);
      toast.show('Backup restaurado');
    } catch (e) {
      toast.show(`Erro ao restaurar: ${(e as Error).message}`);
    } finally {
      setOcupado(false);
    }
  };

  const resumo = lido ? resumirBackup(lido) : null;

  return (
    <section className="card stack" id="backup" aria-labelledby="bk-titulo">
      <h2 id="bk-titulo">Backup</h2>
      <p className="small muted">
        Os dados ficam só neste aparelho. O Safari pode apagar dados de sites não abertos por cerca de 7 dias; o backup protege
        contra isso.
      </p>
      <dl className="small" style={{ margin: 0 }}>
        <div className="row-between">
          <dt className="muted">Último backup</dt>
          <dd style={{ margin: 0 }}>{quando(s?.ultimoBackup ?? null)}</dd>
        </div>
        <div className="row-between">
          <dt className="muted">Último restauro</dt>
          <dd style={{ margin: 0 }}>{quando(s?.ultimoRestauro ?? null)}</dd>
        </div>
      </dl>
      {compartilhar ? (
        <>
          <button type="button" className="btn btn-primary btn-block" disabled={ocupado} onClick={() => salvar('compartilhar')}>
            Salvar backup no iCloud Drive
          </button>
          <p className="tiny muted">Na janela que abrir, toque em “Salvar em Arquivos” e escolha o iCloud Drive.</p>
          <button type="button" className="btn btn-block" disabled={ocupado} onClick={() => salvar('baixar')}>
            Baixar arquivo
          </button>
        </>
      ) : (
        <button type="button" className="btn btn-primary btn-block" disabled={ocupado} onClick={() => salvar('baixar')}>
          Baixar backup
        </button>
      )}

      <h3>Restaurar</h3>
      <p className="small muted">Use para recuperar dados ou mover para outro aparelho.</p>
      <input
        ref={inputRef}
        type="file"
        accept=".zip,application/zip"
        className="sr-only"
        aria-label="Escolher arquivo de backup"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          setErro(null);
          try {
            setLido(await lerBackup(f));
          } catch (err) {
            setErro((err as Error).message);
          }
        }}
      />
      <button type="button" className="btn btn-block" onClick={() => inputRef.current?.click()}>
        Escolher arquivo de backup
      </button>
      {erro && <p className="neg small">{erro}</p>}
      {resumo && (
        <div className="card stack-sm" style={{ background: 'var(--surface-2)' }}>
          <strong>Backup de {quando(resumo.criadoEm)}</strong>
          <span className="small">
            {resumo.lancamentos} lançamentos em {resumo.meses} meses · {resumo.comprovantes} comprovantes · {resumo.dividas}{' '}
            dívidas · {resumo.fixos} fixos
          </span>
          <div className="row">
            <button type="button" className="btn" disabled={ocupado} onClick={() => restaurar('mesclar')}>
              Mesclar
            </button>
            <button type="button" className="btn btn-danger" disabled={ocupado} onClick={() => restaurar('substituir')}>
              Substituir tudo
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setLido(null)}>
              Cancelar
            </button>
          </div>
          <p className="tiny muted">Mesclar acrescenta só o que falta, sem duplicar.</p>
        </div>
      )}

      <h3>Armazenamento</h3>
      <p className="small">{PERSIST_LABEL[persist]}</p>
      {uso && uso.cota > 0 && <p className="small muted">Em uso: {(uso.usado / 1_048_576).toFixed(1).replace('.', ',')} MB</p>}
      {persist !== 'persistente' && (
        <button type="button" className="btn" onClick={async () => setPersist(await requestPersist())}>
          Pedir armazenamento persistente
        </button>
      )}
      <p className="tiny muted">Dica opcional: no iPhone, “Adicionar à Tela de Início” também ajuda a manter os dados.</p>
    </section>
  );
}
