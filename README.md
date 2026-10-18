# Radar de Investimentos

Painel pessoal estilo homebroker com cotações, notícias explicadas, agro, clima, agenda e calculadoras. **O app não busca nada na internet**: todo o conteúdo vem do arquivo diário `radar_AAAA-MM-DD.json`, que você carrega no app. Os dados ficam guardados no próprio aparelho (IndexedDB) e o app funciona sem internet depois de aberto uma vez.

- Formato do arquivo: [`docs/schema.md`](docs/schema.md) (exemplo real em [`docs/radar_2026-10-16.json`](docs/radar_2026-10-16.json)).
- Para a rotina mandar muito mais cotações (todas as ações do Ibovespa, índices, moedas, cripto…) sem mudar o Radar: [`docs/rotina-cotacoes.md`](docs/rotina-cotacoes.md).
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
2. No app, toque em **📥** (no topo, ao lado do botão de tema; também em **Mais**) e escolha o arquivo. Dá para escolher vários de uma vez.
3. No computador, também dá para **arrastar o arquivo** para a janela.

O app valida o arquivo antes de salvar. Se algo estiver errado, ele mostra qual campo tem problema (por exemplo, `cotacoes[3].valor: esperado número, veio texto`) e não salva nada daquele arquivo. Se já existir uma edição com a mesma data, o app pergunta se você quer substituir.

Na primeira abertura, sem dados, o botão **👀 Ver exemplo** carrega a edição de 16/10/2026 para você conhecer o app. Ela pode ser apagada depois em **Histórico**.

## 4. Backup

O navegador pode apagar dados de sites em algumas situações (falta de espaço, limpeza de dados, iPhone sem usar o site por muito tempo). Por isso:

- **Configurações → Backup → Exportar backup** gera um único arquivo `radar-backup_AAAA-MM-DD.json` com todo o histórico e as configurações. Guarde-o no iCloud, Google Drive ou e-mail.
- **Importar backup** restaura esse arquivo. Edições com a mesma data são substituídas e as outras são mantidas.
- Se aparecer o botão **Pedir armazenamento persistente**, toque nele. Instalar o app (PWA) também ajuda a proteger os dados.

## 5. Sincronizar celular e computador

O app pode manter o mesmo histórico e as mesmas configurações em todos os seus aparelhos. Os dados ficam num **Gist secreto** da sua conta do GitHub. Gist é um espaço de arquivos do próprio GitHub; o secreto não aparece em buscas nem no seu perfil. A chave do GitHub só é pedida **uma vez, no primeiro aparelho**. Os outros entram com um código gerado pelo próprio app.

**Primeiro aparelho (uma vez só):**
1. Abra **Configurações → Sincronização entre aparelhos → Primeiro aparelho** e toque em **Abra esta página do GitHub**. A página já vem com a permissão **gist** marcada.
2. Em *Expiration*, escolha *No expiration* (ou 1 ano), toque em **Generate token** e copie a chave (começa com `ghp_`).
3. Cole a chave no app e toque em **Ativar sincronização**.

**Outros aparelhos (com o código do app):**
1. No aparelho já conectado, toque em **Conectar outro aparelho**. O app mostra um **QR code**, um **código** (começa com `RADAR1.`) e uma **senha de 6 números**.
2. No aparelho novo, aponte a câmera para o QR code, ou cole o código em **Configurações → Sincronização → Tenho um código**.
3. Digite a senha e toque em **Conectar**.

Detalhes do código:
- Ele leva a chave e o endereço do Gist cifrados (AES-256) com a senha. Sem a senha, o código não abre.
- Pode mandar o código por mensagem para você mesmo, mas não mande a senha junto.
- Código e senha valem por 24 horas. Depois disso, gere outro.
- No iPhone com o app instalado na tela de início, abra o app e cole o código lá. A câmera abre o Safari, que guarda os dados separados do app instalado.

Depois disso, cada aparelho sincroniza sozinho: ao abrir o app e alguns segundos depois de carregar um arquivo, apagar uma edição ou mudar uma configuração. O botão **Sincronizar agora** força na hora.

Como os dados de dois aparelhos se juntam:
- **Edições:** juntam-se as dos dois aparelhos; se a mesma data foi carregada nos dois, vale a carregada por último.
- **Edições apagadas:** somem também nos outros aparelhos.
- **Configurações:** vale a alterada por último.

A chave fica só nos aparelhos e não entra no backup. Para revogar, apague-a em github.com → Settings → Developer settings → Personal access tokens. Isso desconecta todos os aparelhos de uma vez.

## 6. Como o app funciona

### Topo: menu, taxas e fita

No alto fica uma barra escura com o conteúdo centralizado (até 1280 px) e o fundo de canto a canto:

- **Menu:** assinatura Oracle Capital → **Hoje · Mercado ▾ · Setores ▾ · Renda fixa ▾ · Agro ▾ · Clima · Agenda · Calculadoras · Mais ▾** → busca → tema → 📥 carregar. No computador, o submenu abre ao passar o mouse ou clicar, e o item da página atual fica sublinhado em dourado.
  - **Mercado:** Visão geral, Ações, Índices Brasil, Índices globais, Moedas, Commodities, FIIs e Cripto, com a quantidade de ativos de cada um.
  - **Setores:** Mapa setorial e cada setor B3 presente no arquivo, com a variação média simples do dia.
  - **Renda fixa:** Curva DI, Tesouro Direto, Juros no mundo e Taxas de referência.
  - **Agro:** Chicago, Físico Brasil (Cepea), Guarapuava e Noroeste Paulista.
  - **Mais:** Histórico, Configurações e Carregar arquivo.
- **Celular e telas até 1020 px:** o botão **☰** abre o menu em tela cheia. A barra inferior (Hoje, Mercado, Agro, Clima e Mais) continua.
- **Busca do topo:** encontra ativos pelo código ou nome e também setores, em todo o arquivo (`cotacoes`, `agro` e `cotacoes_amplas`). Tocar num ativo abre o detalhe; num setor, abre o mapa setorial nele.
- **Linha de taxas:** SELIC, CDI e IPCA 12M (de `taxas_referencia`) à esquerda; à direita, **Fita:** escolhe o que a fita mostra (Principais, Índices, Todas as ações, cada setor, Moedas, Juros e Tesouro, Commodities, Agro). A escolha fica salva no aparelho.
- **Fita de cotações:** ocupa a largura toda e roda sozinha (sem parar quando o mouse passa por cima). Cada item mostra o código, o valor e a variação (▲ verde, ▼ vermelho; juros em pb).
  - **Arrastar** com o mouse ou o dedo move a fita para os dois lados, com inércia. A roda do mouse e as setas do teclado também movem. Ela volta a rodar ~1,8 s depois que você solta.
  - **Clicar** num ativo (sem arrastar) **para a fita** nele: o item ganha o filete dourado, aparece "Parada em XXXX" e abre o detalhe. Ao fechar o detalhe, a fita volta a rodar em ~0,5 s.
  - Com "reduzir movimento" ativado no aparelho, a fita não roda sozinha; só arrastando.

No computador, menu, taxas e fita ficam fixos no alto. No celular, só a barra do menu fica fixa; taxas e fita sobem junto com a página.

### Telas

| Tela | O que mostra |
|---|---|
| 🏠 **Hoje** | Termômetro e, logo depois, as **Leituras do dia** em destaque (leitura geral, mercado, agro, regiões e "no campo"; toque para ir à aba). Em seguida, alertas, KPIs (itens com `kpi: true`), destaques e notícias (abrem em pop-up), limitações e aviso. |
| 📊 **Mercado** | Abas em pílula. **Visão geral:** leitura do mercado, busca, **Minha lista** (watchlist configurável) ou **Todos** os grupos do arquivo, em grupos recolhíveis com visão **Lista** ou **Mapa**. **Setores:** um cartão por setor B3 com a variação média simples, a barra de altas x baixas e "N ações · ▲ x · ▼ y"; o fundo fica mais verde ou mais vermelho conforme a variação. Tocar num setor mostra a tabela das ações dele. **Ações, Índices, Moedas, Commodities, FIIs, Cripto:** tabela ordenável por qualquer coluna (toque no título); em Ações, chips filtram por setor. |
| 🏦 **Renda fixa** | Taxas de referência (Selic, CDI, IPCA 12 meses) e tabelas de Curva DI, Tesouro Direto e Juros no mundo. |
| 🌾 **Agro** | Os mesmos grupos recolhíveis, um por praça (Chicago, Brasil, Guarapuava, Noroeste Paulista…), com a leitura de cada praça e o período dos dados semanais. O menu abre uma praça só. |
| 🌦️ **Clima** | ENSO, previsão por dia, alertas e "No campo". |
| 📅 **Agenda** | Eventos por dia em horário de Brasília. O dia de hoje fica destacado e os eventos passados ficam ocultos (há uma opção para mostrá-los). |
| 🧮 **Calculadoras** | CDB x LCA, Pré x IPCA+ x Pós (break-even), capital social, juros compostos e conversões saca/arroba/bushel. Os campos já vêm com as taxas do arquivo do dia; se o dado veio `null`, o campo fica vazio com um aviso. |
| 🗂️ **Histórico** | Edições salvas por mês; **Abrir** mostra uma edição antiga em modo leitura. Comparação de até 3 ativos (normalizado em base 100 ou em valor) em 7, 30 ou 90 dias, ou em todo o período. |
| ⚙️ **Configurações** | Nome do app, cor de destaque, tema, watchlist (marcar, reordenar, adicionar), limites de preço, backup e sincronização. |

**Setores:** o setor vem do campo `setor` de cada ação. Para as ações da carteira do Ibovespa que chegarem sem esse campo, o app usa o setor B3 conhecido delas. As médias são simples (cada ação pesa igual) e ignoram as ações sem variação no dia.

### Identidade visual (Oracle Capital)

O app segue o manual da marca da Oracle Capital (design system "Oracle Capital"):

- **Logo:** no topo, a assinatura negativa da marca: o símbolo (anel branco atravessado pela régua dourada) com "ORACLE CAPITAL" e o descritor "RADAR DE INVESTIMENTOS" (o nome do app, editável em Configurações). Em telas estreitas aparece só o símbolo. O ícone do app instalado é o símbolo sobre o quadrado navy, copiado do arquivo oficial.
- **Cores:** faixa do topo em navy-900 (#14213D), página em papel branco e um único acento dourado (gold-600, #A67C2E), usado só em linhas e formas: o sublinhado do menu, o item parado da fita e o filete das leituras. Altas e baixas usam as cores de sinal do manual, azul (#1D4ED8) e laranja (#B45309), sempre com ▲/▼ ou sinal ao lado. Assim continuam distintas para quem não enxerga vermelho e verde.
- **Tema escuro:** derivado do navy da marca (fundo navy-950). O manual só define o tema claro ("Papel"), então os tons do escuro foram ajustados para manter contraste de 4,5:1.
- **Tipografia:** Source Serif 4 nos títulos e na assinatura, Source Sans 3 em todo o resto. As duas fontes vêm embutidas no app e funcionam offline. Nada fica abaixo de 12 px, e os números usam algarismos tabulares, alinhados à direita nas tabelas.
- **Forma:** cantos retos, filetes finos e nenhuma sombra ou degradê. Cabeçalho de tabela no estilo rótulo, com filete navy de 2 px. Sem emojis decorativos nos títulos e menus ("dado antes de adorno"). Os emojis que vêm dentro do arquivo do dia, como os das notícias e do clima, continuam.
- **Cor de destaque:** o padrão agora é o navy da marca. Quem nunca tinha mudado a cor (verde antigo) passa para o navy automaticamente.

**Ibovespa completo:** a lista "Ibovespa — carteira completa" (Configurações → O que acompanhar) já vem com a carteira de referência e com a regra automática `grupo:acoes_ibov`, que traz qualquer ação que a rotina enviar como parte do índice. Assim, os rebalanceamentos da B3 aparecem sem editar nada.

**Detalhe do ativo:** ao tocar num ativo (na fita, na busca, num card de KPI, numa lista ou tabela), abre um pop-up com:
- gráfico do histórico (7, 30 ou 90 dias, ou todo o período);
- mínimo e máximo das edições carregadas;
- variação acumulada no período;
- data de referência e fonte;
- limite de alerta configurado;
- notícias do dia que citam o ativo.

**Alertas:**
- **Limites de preço:** os padrões são dólar acima de 5,10, DI jan/29 acima de 12,75% e boi Cepea SP abaixo de 370. Quando um limite é cruzado, o card fica com borda dourada e o alerta aparece na tela Hoje.
- **Clima:** cada alerta do arquivo aparece na tela Hoje, com ícone e cor conforme o nível.
- **Dado antigo:** se a data de referência de uma cotação é anterior ao último dia útil antes da edição (segunda olha sexta), a cotação recebe o selo "dado de DD/MM". Dados semanais não contam como antigos.

No celular, a barra inferior tem Hoje, Mercado, Agro, Clima e **Mais** (Renda fixa, Agenda, Calculadoras, Histórico, Configurações e Carregar). No computador, tudo fica no menu do topo.

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
  lib/categorias.ts    categorias do menu, setores B3 (média, altas/baixas) e opções da fita
  lib/fita.ts          regra da fita (rodar, arrastar, inércia, parar no clique, retomar) como funções puras
  components/          menu superior, fita, KPI, sparkline, cards, tabelas, gráficos, diálogos
  screens/             uma tela por aba (Mercado inclui Setores e as listas por categoria)
  styles/              tokens.css (temas) e base.css
docs/schema.md         contrato do arquivo diário
e2e/                   testes de ponta a ponta e arquivos de teste
```

Ao mudar o formato do arquivo, atualize juntos `src/schema/radar.ts` e `docs/schema.md`.
