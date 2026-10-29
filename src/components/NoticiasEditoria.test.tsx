// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import novo from '../../public/exemplos/radar_exemplo_editorias.json';
import legado from '../../public/exemplos/radar_exemplo_legado.json';
import { radarSchema } from '../schema/radar';
import { noticiasDoPeriodo } from '../lib/noticias';
import { ListaNoticias, RadarPorEditoria } from './NoticiasEditoria';

afterEach(cleanup);

const rNovo = radarSchema.parse(novo);
const rLegado = radarSchema.parse(legado);
const itens = (r: typeof rNovo) => noticiasDoPeriodo([{ data: r.edicao.data, edicoes: [r] }]);

describe('Hoje: Radar por assunto', () => {
  it('um bloco por editoria com até 2 notícias e "Ver todas" apontando para a rota da editoria', () => {
    render(<RadarPorEditoria itens={itens(rNovo)} semDestaque={rNovo.editorias_sem_destaque} largo />);
    const bancos = screen.getByRole('button', { name: /Bancos e cooperativas/ });
    expect(bancos.getAttribute('aria-expanded')).toBe('true');
    const link = (slug: string) => document.querySelector(`.bloco-editoria-todas[href="#/noticias/${slug}"]`)?.textContent;
    expect(link('bancos_cooperativas')).toBe('Ver todas (3) →');
    expect(document.querySelectorAll('#bloco-bancos_cooperativas .item-compacto')).toHaveLength(2);
    // Mercados: 3 notícias + 1 destaque; o destaque não se repete no bloco.
    expect(link('mercados')).toBe('Ver todas (4) →');
    expect(document.querySelector('#bloco-mercados')!.textContent).not.toContain('Fluxo estrangeiro sustenta a bolsa');
    expect(screen.getByText(/Tecnologia, IA e energia · sem destaques relevantes hoje/)).toBeTruthy();
  });
  it('no celular, só os 3 primeiros blocos com conteúdo começam abertos; o estado é lembrado', () => {
    localStorage.clear();
    render(<RadarPorEditoria itens={itens(rNovo)} semDestaque={rNovo.editorias_sem_destaque} largo={false} />);
    const cab = (nome: RegExp) => screen.getByRole('button', { name: nome });
    expect(cab(/Bancos e cooperativas/).getAttribute('aria-expanded')).toBe('true');
    expect(cab(/^Mercados/).getAttribute('aria-expanded')).toBe('true');
    expect(cab(/Economia/).getAttribute('aria-expanded')).toBe('true');
    expect(cab(/Business/).getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(cab(/Business/));
    expect(cab(/Business/).getAttribute('aria-expanded')).toBe('true');
    expect(JSON.parse(localStorage.getItem('radar.editorias.abertas')!)).toEqual({ business: true });
  });
  it('edição antiga: blocos montados pela categoria; editorias sem notícia dizem que não há classificação', () => {
    render(<RadarPorEditoria itens={itens(rLegado)} semDestaque={rLegado.editorias_sem_destaque} largo />);
    expect(document.querySelector('.bloco-editoria-todas[href="#/noticias/politica_regulacao"]')?.textContent).toBe(
      'Ver todas (1) →',
    );
    expect(screen.getByText(/Bancos e cooperativas · nenhuma notícia classificada nesta edição/)).toBeTruthy();
  });
});

describe('Página /noticias/:editoria', () => {
  it('editoria listada em editorias_sem_destaque mostra o estado vazio do dia', () => {
    render(
      <ListaNoticias
        itens={itens(rNovo)}
        slug="tecnologia_energia"
        semDestaque={rNovo.editorias_sem_destaque}
        modo="relevancia"
        comData={false}
      />,
    );
    expect(screen.getByText('Sem destaques relevantes hoje neste assunto.')).toBeTruthy();
  });
  it('edição antiga sem o campo mostra o estado vazio de "não classificada"', () => {
    render(
      <ListaNoticias
        itens={itens(rLegado)}
        slug="bancos_cooperativas"
        semDestaque={rLegado.editorias_sem_destaque}
        modo="relevancia"
        comData={false}
      />,
    );
    expect(screen.getByText('Nenhuma notícia classificada neste assunto nesta edição.')).toBeTruthy();
  });
  it('lista da editoria em ordem de relevância, com canal de transmissão e relevância visível', () => {
    render(
      <ListaNoticias
        itens={itens(rNovo)}
        slug="politica_regulacao"
        semDestaque={rNovo.editorias_sem_destaque}
        modo="relevancia"
        comData={false}
      />,
    );
    const titulos = [...document.querySelectorAll('.card-completo-titulo')].map((h) => h.textContent);
    expect(titulos[0]).toContain('Câmara aprova projeto de lei');
    expect(screen.getAllByText(/Canal:/).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('img', { name: /Relevância: Mercado 3/ }).length).toBeGreaterThan(0);
  });
  it('"Todas" agrupa por editoria na ordem fixa', () => {
    render(
      <ListaNoticias
        itens={itens(rNovo)}
        slug={null}
        semDestaque={rNovo.editorias_sem_destaque}
        modo="relevancia"
        comData={false}
      />,
    );
    const grupos = [...document.querySelectorAll('.grupo-editoria-titulo a')].map((a) => a.textContent?.trim());
    expect(grupos[0]).toContain('Bancos e cooperativas');
    expect(grupos.at(-1)).toContain('Política e regulação');
    expect(screen.getByText(/Sem destaques relevantes: 🤖 Tecnologia, IA e energia/)).toBeTruthy();
  });
});
