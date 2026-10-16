import { useState } from 'react';
import type { Destaque, Noticia } from '../schema/radar';
import { diaMes, humanizar } from '../lib/formato';
import { ListaFontes, Selo, type TomSelo } from './Basicos';
import { Modal } from './Modal';

const TOM_IMPACTO: Record<string, TomSelo> = { positivo: 'positivo', negativo: 'negativo', misto: 'misto', neutro: 'neutro' };
const ROTULO_CONFIANCA: Record<string, string> = { alta: 'alta', media: 'média', baixa: 'baixa' };

type Props = { item: Destaque } | { item: Noticia; noticia: true };

/** Card de destaque ou notícia. Ao tocar, o detalhe abre num pop-up. */
export function CardNoticia(props: Props) {
  const [aberto, setAberto] = useState(false);
  const { item } = props;
  const ehNoticia = 'noticia' in props;
  const visivel = ehNoticia ? (item as Noticia).resumo : (item as Destaque).o_que;
  const data = ehNoticia ? (item as Noticia).data : null;
  const blocos: [string, string | null | undefined][] = ehNoticia
    ? [['Por que importa', (item as Noticia).por_que_importa]]
    : [
        ['Por que aconteceu', (item as Destaque).por_que],
        ['O que muda', (item as Destaque).o_que_muda],
      ];

  const selosResumo = (
    <span className="selos">
      {item.categoria && <Selo>{humanizar(item.categoria)}</Selo>}
      {item.impacto && <Selo tom={TOM_IMPACTO[item.impacto] ?? 'neutro'}>impacto {item.impacto}</Selo>}
      {data && <Selo>{diaMes(data)}</Selo>}
    </span>
  );

  return (
    <article className="card-noticia">
      <button type="button" className="card-noticia-topo" aria-haspopup="dialog" onClick={() => setAberto(true)}>
        {item.emoji && (
          <span className="emoji" aria-hidden="true">
            {item.emoji}
          </span>
        )}
        <span className="card-noticia-corpo">
          <span className="card-noticia-titulo">{item.titulo}</span>
          <span className="card-noticia-oque">{visivel}</span>
          {selosResumo}
        </span>
        <span className="card-noticia-mais" aria-hidden="true">
          ›
        </span>
      </button>

      {aberto && (
        <Modal
          titulo={
            <>
              {item.emoji && <span aria-hidden="true">{item.emoji} </span>}
              {item.titulo}
            </>
          }
          cabecalho={selosResumo}
          onFechar={() => setAberto(false)}
        >
          <div className="noticia-detalhe">
            <p className="noticia-oque">{visivel}</p>
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
            {(item.horizonte || item.confianca || item.impacto) && (
              <div className="selos">
                {item.impacto && <Selo tom={TOM_IMPACTO[item.impacto] ?? 'neutro'}>Impacto: {item.impacto}</Selo>}
                {item.horizonte && <Selo>Horizonte: {item.horizonte}</Selo>}
                {item.confianca && <Selo tom="info">Confiança: {ROTULO_CONFIANCA[item.confianca] ?? item.confianca}</Selo>}
              </div>
            )}
            {item.fontes.length > 0 && (
              <div>
                <h4>Fontes</h4>
                <ListaFontes fontes={item.fontes} />
              </div>
            )}
          </div>
        </Modal>
      )}
    </article>
  );
}
