import { useMemo, useState } from 'react';
import { useEstado, useRadar } from '../state';
import { Secao, Selo, Vazio, type TomSelo } from '../components/Basicos';
import { eventosEmBrasilia } from '../lib/agenda';
import { agrupar } from '../lib/precos';
import { bandeira, dataLonga, hojeISO } from '../lib/formato';

const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const TOM_RELEVANCIA: Record<string, TomSelo> = { alta: 'destaque', media: 'aviso', média: 'aviso', baixa: 'neutro' };
const NOME_RELEVANCIA: Record<string, string> = { alta: 'alta', media: 'média', baixa: 'baixa' };

export function Agenda() {
  const { radar } = useRadar();
  const { modoLeitura } = useEstado();
  const [passados, setPassados] = useState(false);
  // Em modo leitura, "hoje" é a data da edição; senão, a data real em Brasília.
  const hoje = modoLeitura ? radar.edicao.data : hojeISO();
  const eventos = useMemo(() => eventosEmBrasilia(radar.agenda), [radar.agenda]);
  const visiveis = passados ? eventos : eventos.filter((e) => e.dataBr >= hoje);
  const dias = agrupar(visiveis, (e) => e.dataBr);
  const ocultos = eventos.length - visiveis.length;

  return (
    <div className="tela">
      <div className="secao-topo">
        <p className="mudo pequeno">Horários de Brasília.</p>
        <label className="check">
          <input type="checkbox" checked={passados} onChange={(e) => setPassados(e.target.checked)} />
          Mostrar eventos passados{ocultos > 0 && !passados ? ` (${ocultos})` : ''}
        </label>
      </div>
      {!dias.length && (
        <Vazio>{eventos.length ? 'Nenhum evento daqui para a frente nesta edição.' : 'Esta edição não trouxe agenda.'}</Vazio>
      )}
      {dias.map(([dia, lista]) => (
        <Secao
          key={dia}
          id={`dia-${dia}`}
          titulo={
            <>
              {maiuscula(dataLonga(dia))}
              {dia === hoje && (
                <>
                  {' '}
                  <Selo tom="destaque">hoje</Selo>
                </>
              )}
            </>
          }
        >
          <ul className={`agenda${dia === hoje ? ' agenda-hoje' : ''}${dia < hoje ? ' agenda-passada' : ''}`}>
            {lista.map((e, i) => (
              <li key={i}>
                <span className="agenda-hora num">{e.horaBr ?? 'dia todo'}</span>
                <span className="agenda-corpo">
                  <span className="agenda-titulo">
                    <span title={e.pais ?? undefined} aria-label={e.pais ?? 'país'}>
                      {bandeira(e.pais)}
                    </span>{' '}
                    <strong>
                      {e.url ? (
                        <a href={e.url} target="_blank" rel="noreferrer noopener">
                          {e.evento}
                        </a>
                      ) : (
                        e.evento
                      )}
                    </strong>
                    {e.relevancia && (
                      <Selo tom={TOM_RELEVANCIA[e.relevancia] ?? 'neutro'}>
                        relevância {NOME_RELEVANCIA[e.relevancia] ?? e.relevancia}
                      </Selo>
                    )}
                  </span>
                  {e.o_que_mede && <span className="agenda-mede">{e.o_que_mede}</span>}
                  {e.expectativa && (
                    <span className="pequeno">
                      <strong>Expectativa:</strong> {e.expectativa}
                    </span>
                  )}
                  {(e.fonte || e.convertido) && (
                    <span className="mudo pequeno">
                      {e.fonte}
                      {e.convertido && ` · original ${e.hora} (${e.fuso})`}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Secao>
      ))}
    </div>
  );
}
