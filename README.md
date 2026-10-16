# Radar de Investimentos

Painel pessoal estilo homebroker com cotações, notícias explicadas, agro, clima, agenda e calculadoras. **O app não busca nada na internet**: todo o conteúdo vem do arquivo diário `radar_AAAA-MM-DD.json`, que você carrega no app. Os dados ficam guardados no próprio aparelho (IndexedDB) e o app funciona sem internet depois de aberto uma vez.

- Formato do arquivo: [`docs/schema.md`](docs/schema.md) (exemplo real em [`docs/radar_2026-10-16.json`](docs/radar_2026-10-16.json)).
- Tecnologia: Vite + React + TypeScript, `zod` (validação), `idb` (banco local), `uPlot` (gráficos). Site estático, sem servidor.

---

## 1. Publicar o site (uma vez só)

Você não precisa instalar nada no computador para isso. Tudo é feito no site do GitHub.

1. **Repositório.** Este código está no repositório `financas` da sua conta. Se preferir outro nome, abra **Settings → General → Repository name** e troque (por exemplo, `radar`). O endereço do site acompanha o nome.
2. **Leve o código para a branch `main`.** O trabalho foi feito na branch `claude/new-session-giqkfo`. Abra a aba **Pull requests → New pull request**, escolha `base: main` e `compare: claude/new-session-giqkfo`, crie o pull request e clique em **Merge pull request**.
3. **Ative o GitHub Pages.** Vá em **Settings → Pages**. Em **Build and deployment → Source**, escolha **GitHub Actions**. No plano gratuito, o Pages exige repositório **público**. Os seus dados não ficam no repositório, só no seu aparelho, mas o código fica visível.
4. **Aguarde a publicação.** Na aba **Actions**, o fluxo **Publicar no GitHub Pages** roda sozinho a cada mudança na `main` e leva 1 ou 2 minutos. Se ele não rodar, abra o fluxo e clique em **Run workflow**.
5. **Abra o site.** O endereço aparece em **Settings → Pages** e segue o formato `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.

Não precisa configurar caminho nenhum: o site usa caminhos relativos (`base: './'` no `vite.config.ts`) e funciona em qualquer subpasta.

## 2. Instalar no celular (PWA)

- **iPhone (Safari):** abra o endereço, toque em **Compartilhar → Adicionar à Tela de Início**.
- **Android (Chrome):** abra o endereço, toque no menu **⋮ → Instalar app** (ou "Adicionar à tela inicial").
- **Computador (Chrome/Edge):** ícone de instalar na barra de endereço.

Instalado, ele abre em tela cheia e funciona offline com os dados já carregados. Cada aparelho tem seus próprios dados: use o backup para levar o histórico de um para outro.

## 3. Carregar o Radar do dia

1. Salve o arquivo `radar_AAAA-MM-DD.json` que chega pela manhã (no celular, em Arquivos/Downloads).
2. No app, toque em **📥 Carregar** (no topo) e escolha o arquivo. Dá para escolher vários de uma vez.
3. No computador, também dá para **arrastar o arquivo** para a janela.

O app valida o arquivo antes de salvar. Se algo estiver errado, ele mostra qual campo tem problema (por exemplo, `cotacoes[3].valor: esperado número, veio texto`) e não salva nada daquele arquivo. Se já existir uma edição com a mesma data, o app pergunta se você quer substituir.

Na primeira abertura, sem dados, o botão **👀 Ver exemplo** carrega a edição de 16/10/2026 para você conhecer o app. Ela pode ser apagada depois em **Histórico**.

## 4. Backup

O navegador pode apagar dados de sites em algumas situações (falta de espaço, limpeza de dados, iPhone sem usar o site por muito tempo). Por isso:

- **Configurações → Backup → Exportar backup** gera um único arquivo `radar-backup_AAAA-MM-DD.json` com todo o histórico e as configurações. Guarde-o no iCloud, Google Drive ou e-mail.
- **Importar backup** restaura esse arquivo. Edições com a mesma data são substituídas e as outras são mantidas.
- Se aparecer o botão **Pedir armazenamento persistente**, toque nele. Instalar o app (PWA) também ajuda a proteger os dados.

## 5. Como o app funciona

| Aba | O que mostra |
|---|---|
| 🏠 **Hoje** | KPIs (itens com `kpi: true`) com mini-gráfico, Termômetro, alertas, destaques e notícias (toque para expandir), Leitura do dia, limitações e aviso. |
| 📊 **Mercado** | **Minha lista** (watchlist configurável; ativos ausentes aparecem como "sem dado hoje") ou **todos os grupos** do arquivo. Toque no título da coluna para ordenar e no ativo para ver o histórico. |
| 🌾 **Agro** | Blocos por região (Chicago, Brasil, Guarapuava, Noroeste Paulista…), com leitura de cada região e período dos dados semanais. |
| 🌦️ **Clima** | ENSO, previsão por dia, alertas e "No campo". |
| 📅 **Agenda** | Eventos por dia em horário de Brasília. O dia de hoje fica destacado e os eventos passados ficam ocultos (há uma opção para mostrá-los). |
| 🧮 **Calculadoras** | CDB x LCA, Pré x IPCA+ x Pós (break-even), capital social, juros compostos e conversões saca/arroba/bushel. Os campos já vêm com as taxas do arquivo do dia; se o dado veio `null`, o campo fica vazio com um aviso. |
| 🗂️ **Histórico** | Edições salvas por mês; **Abrir** mostra uma edição antiga em modo leitura. Comparação de até 3 ativos (normalizado em base 100 ou em valor) em 7, 30 ou 90 dias, ou em todo o período. |
| ⚙️ **Configurações** | Nome do app, cor de destaque, tema, watchlist (marcar, reordenar, adicionar), limites de preço, backup. |

**Alertas:**
- **Limites de preço:** os padrões são dólar acima de 5,10, DI jan/29 acima de 12,75% e boi Cepea SP abaixo de 370. Quando um limite é cruzado, o card fica com borda laranja e o alerta aparece na tela Hoje.
- **Clima:** cada alerta do arquivo aparece na tela Hoje, com ícone e cor conforme o nível.
- **Dado antigo:** se a data de referência de uma cotação é anterior ao último dia útil antes da edição (segunda olha sexta), a cotação recebe o selo "dado de DD/MM". Dados semanais não contam como antigos.

No celular, a barra inferior tem Hoje, Mercado, Agro, Clima e **Mais** (Agenda, Calculadoras, Histórico, Configurações). No computador, o menu fica na lateral.

---

## Para quem for mexer no código

```bash
npm install
npm run dev        # servidor local em http://localhost:5173
npm test           # testes unitários (Vitest)
npm run e2e        # testes no navegador, em 375 px e 1440 px (Playwright)
npm run lint
npm run typecheck
npm run check      # lint + tipos + testes unitários
npm run build      # gera dist/
```

Para o `npm run e2e` funcionar no seu computador, rode antes uma vez `npx playwright install chromium`.

Estrutura:

```
src/
  schema/radar.ts      schema zod (fonte dos tipos) + exemplo.json embutido
  lib/                 lógica pura: validação, formatação pt-BR, regra de dado antigo,
                       alertas, watchlist, agenda (fusos), cores/contraste, banco (idb)
  lib/calc/            IR regressivo, CDB x LCA, títulos/break-even, capital social, conversões
  components/          ticker, KPI, sparkline, cards, tabelas, gráficos, diálogos
  screens/             uma tela por aba
  styles/              tokens.css (temas) e base.css
docs/schema.md         contrato do arquivo diário
e2e/                   testes de ponta a ponta e arquivos de teste
```

Ao mudar o formato do arquivo, atualize juntos `src/schema/radar.ts` e `docs/schema.md`.
