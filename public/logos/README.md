# Logos das empresas

Coloque aqui os logos que o app mostra ao lado de ações, FIIs, ETFs e BDRs.
O app **não busca nada na internet**: só usa os arquivos desta pasta.

## Nome do arquivo

`<RAIZ>.svg`, `<RAIZ>.png` ou `<RAIZ>.webp`, onde **RAIZ** são as 4 primeiras letras do código na B3, em maiúsculas.

| Ativo                | Arquivo     |
| -------------------- | ----------- |
| PETR3, PETR4         | `PETR.svg`  |
| VALE3                | `VALE.png`  |
| ITUB3, ITUB4         | `ITUB.webp` |
| BBAS3                | `BBAS.svg`  |
| HGLG11 (FII)         | `HGLG.png`  |

Um arquivo serve para todas as classes da mesma empresa (ON, PN, units).
Se houver mais de um formato para a mesma raiz, vale o `.svg`, depois `.webp`, depois `.png`.

## Formato

- Quadrado, com **pelo menos 64 × 64 px**.
- **Fundo transparente** (o app põe um fundo branco discreto atrás).
- Leve: até ~10 KB por arquivo.

## Depois de colocar os arquivos

Rode `npm run dev` ou `npm run build`. O build gera `src/data/logos-disponiveis.ts` com a lista do que existe
nesta pasta, e o app só mostra logos que estão nessa lista (nunca aparece imagem quebrada).
Ativos sem logo mostram um quadradinho com as iniciais.

Para baixar logos de uma lista sua, veja `scripts/logos-fontes.json` e `npm run logos:baixar` no README principal.
