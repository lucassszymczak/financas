import { useId, useState } from 'react';
import type { Destaque, Noticia } from '../schema/radar';
import { diaMes, humanizar } from '../lib/formato';
import { ListaFontes, Selo, type TomSelo } from './Basicos';

const TOM_IMPACTO: Record<string, TomSelo> = { positivo: 'positivo', negativo: 'negativo', misto: 'misto', neutro: 'neutro' };
const ROTULO_CONFIANCA: Record<string, string> = { alta: 'alta', media: 'média', baixa: 'baixa' };

type Props = { item: Destaque } | { item: Noticia; noticia: true };

/** Card expansível de destaque ou notícia. */
export function CardNoticia(props: Props) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  const { item } = props;
  const ehNoticia = 'noticia' in props;
  const visivel = ehNoticia ? (item as Noticia).resumo : (item as Destaque).o_que;
  const blocos: [string, string | null | undefined][] = ehNoticia
    ? [['Por que importa', (item as Noticia).por_que_importa]]
    : [
        ['Por que aconteceu', (item as Destaque).por_que],
        ['O que muda', (item as Destaque).o_que_muda],
      ];

  return (
    <article className={`card-noticia${aberto ? ' aberto' : ''}`}>
      <button
        type="button"
        className="card-noticia-topo"
        aria-expanded={aberto}
        aria-controls={id}
        onClick={() => setAberto(!aberto)}
      >
        {item.emoji && (
          <span className="emoji" aria-hidden="true">
            {item.emoji}
          </span>
        )}
        <span className="card-noticia-corpo">
          <span className="card-noticia-titulo">{item.titulo}</span>
          <span className="card-noticia-oque">{visivel}</span>
          <span className="selos">
            {item.categoria && <Selo>{humanizar(item.categoria)}</Selo>}
            {item.impacto && <Selo tom={TOM_IMPACTO[item.impacto] ?? 'neutro'}>impacto {item.impacto}</Selo>}
            {ehNoticia && (item as Noticia).data && <Selo>{diaMes((item as Noticia).data)}</Selo>}
          </span>
        </span>
        <span className="chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      <div id={id} className="card-noticia-detalhe" hidden={!aberto}>
        {blocos.map(([titulo, texto]) =>
          texto ? (
            <div key={titulo}>
              <h4>{titulo}</h4>
              <p>{texto}</p>
            </div>
          ) : null,
        )}
        {item.ativos_afetados.length > 0 && (
          <div>
            <h4>Ativos afetados</h4>
            <div className="chips">
              {item.ativos_afetados.map((a) => (
                <span key={a} className="chip">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="selos">
          {item.impacto && <Selo tom={TOM_IMPACTO[item.impacto] ?? 'neutro'}>Impacto: {item.impacto}</Selo>}
          {item.horizonte && <Selo>Horizonte: {item.horizonte}</Selo>}
          {item.confianca && <Selo tom="info">Confiança: {ROTULO_CONFIANCA[item.confianca] ?? item.confianca}</Selo>}
        </div>
        {item.fontes.length > 0 && (
          <div>
            <h4>Fontes</h4>
            <ListaFontes fontes={item.fontes} />
          </div>
        )}
      </div>
    </article>
  );
}
