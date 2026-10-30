// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { AtivoIcone } from './AtivoIcone';

describe('<AtivoIcone>', () => {
  it('bandeira dos EUA para SPX', () => {
    const { container } = render(<AtivoIcone id="SPX" grupo="indices_mundo" nome="S&P 500" />);
    const img = container.querySelector('img')!;
    expect(img.getAttribute('alt')).toBe('Estados Unidos');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('width')).toBe('20');
  });
  it('sem logo: iniciais (nunca imagem quebrada)', () => {
    const { container } = render(<AtivoIcone id="ZZZZ3" grupo="acoes_ibov" nome="Teste" />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toBe('ZZ');
  });
  it('se a imagem falhar, cai no avatar', () => {
    const { container } = render(<AtivoIcone id="SPX" grupo="indices_mundo" nome="S&P 500" />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toBe('SP');
  });
});
