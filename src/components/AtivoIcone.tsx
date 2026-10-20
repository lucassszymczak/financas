import { useState } from 'react';
import { LOGOS_DISPONIVEIS } from '../data/logos-disponiveis';
import { avatar, iconeAtivo, type AtivoBase } from '../lib/icones';
import { useMostrarLogos } from '../state';

/**
 * Logo da empresa, bandeira do país, ícone da commodity ou avatar com iniciais, à esquerda do nome do ativo.
 * Nunca mostra imagem quebrada: se o arquivo falhar, cai no avatar.
 */
export function AtivoIcone({ id, grupo, nome, regiao, tamanho = 20 }: AtivoBase & { tamanho?: number }) {
  const mostrar = useMostrarLogos();
  const [falhou, setFalhou] = useState(false);
  if (!mostrar) return null;
  const icone = iconeAtivo({ id, grupo, nome, regiao }, LOGOS_DISPONIVEIS, import.meta.env.BASE_URL);
  const estilo = { width: tamanho, height: tamanho };
  if ((icone.tipo === 'logo' || icone.tipo === 'bandeira') && !falhou) {
    return (
      <img
        className={`ativo-icone ativo-${icone.tipo}`}
        src={icone.src}
        width={tamanho}
        height={tamanho}
        loading="lazy"
        decoding="async"
        alt={icone.tipo === 'logo' ? (nome ?? id) : icone.nomePais}
        title={icone.tipo === 'bandeira' ? icone.nomePais : undefined}
        onError={() => setFalhou(true)}
        style={estilo}
      />
    );
  }
  if (icone.tipo === 'emoji') {
    return (
      <span className="ativo-icone ativo-emoji" aria-hidden="true" style={{ ...estilo, fontSize: tamanho * 0.8 }}>
        {icone.emoji}
      </span>
    );
  }
  const a = icone.tipo === 'iniciais' ? icone : avatar(id);
  return (
    <span
      className="ativo-icone ativo-iniciais"
      aria-hidden="true"
      style={{ ...estilo, background: a.cor, fontSize: tamanho * 0.42 }}
    >
      {a.texto}
    </span>
  );
}
