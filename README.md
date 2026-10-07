# Plano Patrimonial

Site pessoal de finanças que roda **inteiro no navegador**. Não há servidor, banco remoto nem API paga. Os dados ficam no próprio aparelho (IndexedDB) e só saem dele pelo backup que você mesmo gera.

A especificação completa está em [`SPEC.md`](SPEC.md).

## Uso

- Abra o link no Safari (iPhone) ou no Chrome/Safari (computador). Não há nada para instalar.
- Opcional: no iPhone, use **Compartilhar → Adicionar à Tela de Início** para abrir como se fosse um app. Isso também reduz o risco de o Safari apagar os dados.
- **Faça backup com frequência** (Ajustes → Backup). O Safari pode apagar dados de sites que você não abre por cerca de 7 dias.

## Telas

| Aba | O que faz |
|---|---|
| **Capturar** | Foto, prints, extrato (OFX, CSV, PDF) e texto ou ditado. Tudo passa pela fila de revisão. Também tem lançamento manual e "Lançar fixos do mês". |
| **Mês** | Resultado, régua de −3 mil a +3 mil, previsão (estimativa), veredito do Longevidade, reembolsos pendentes, barras por categoria e lista editável. |
| **Controle** | Fechamento do mês, tetos com ritmo, calendário, recorrências e simulador "e se". |
| **Plano** | Reserva, dívidas, aplicar parcelas, capital, assistente de extraordinários, projeção de 12 meses, evolução e regras. |
| **Respostas** | Quatro perguntas rápidas, sempre separando fato de estimativa. |
| **IR** | Totais de saúde e educação, comprovantes, anexos pendentes e exportação (CSV e ZIP). |
| **Ajustes** | Backup e restauração, valores iniciais, dívidas, fixos, dicionário, importação do app anterior e tema. |

### Primeiro uso

1. **Se você usava o app anterior:** Ajustes → Importar do app anterior → escolha o JSON. Confira o resumo e toque em Importar. Os lançamentos que tinham foto ficam como "comprovante pendente" na aba IR, para anexar de novo.
2. **Se está começando do zero:** Ajustes → Valores iniciais, Dívidas (indique o papel de cada uma: consignado, CDC, acordo) e Fixos.
3. Faça o primeiro backup.

### OCR

A leitura de fotos usa o Tesseract no próprio navegador. Na primeira foto, o leitor (cerca de 6 MB) é baixado do próprio site. Depois, fica em cache. Funciona melhor com foto reta, bem iluminada e com o comprovante ocupando a tela. Se algo sair errado, abra "Texto reconhecido", corrija e toque em "Reler texto corrigido".

## Desenvolvimento

```bash
npm install
npm run dev        # servidor local
npm test           # testes unitários (Vitest)
npm run e2e        # testes de ponta a ponta (Playwright, iPhone e computador)
npm run lint
npm run typecheck
npm run check      # lint + typecheck + testes unitários
npm run build      # gera dist/
```

Estrutura:

- `src/lib/finance/`: lógica financeira pura (resultado, previsão, Longevidade, dívidas, simulação, extraordinários, duplicados, recorrências, tetos, fechamento, calendário, respostas).
- `src/lib/capture/`: parsers (texto, OFX, CSV, linhas de PDF, comprovantes de OCR) e fila de revisão.
- `src/lib/db/`: esquema Dexie e validação zod.
- `src/lib/backup/`, `src/lib/ir/`, `src/lib/importar/`, `src/lib/plano/`: backup, exportação do IR, importação do app anterior e ações do plano.
- `src/screens/`: telas. `e2e/`: testes de ponta a ponta (incluem OCR real e uso sem internet).

`npm run dev` e `npm run build` copiam antes os arquivos do OCR (Tesseract: worker, core WebAssembly e idioma `por`) de `node_modules` para `public/ocr/`. Assim, eles são servidos pelo próprio site, sem CDN. Essa pasta não vai para o git.

## Hospedagem gratuita

O site usa caminhos relativos (`base: './'`) e navegação por `#/`. Por isso, funciona na raiz de um domínio ou numa subpasta sem nenhum ajuste.

### Opção A: GitHub Pages (via GitHub Actions)

No plano gratuito, o GitHub Pages exige **repositório público**. Como nenhum dado pessoal vai para o código, isso é seguro, mas o código fica visível.

1. Torne o repositório público.
2. Em **Settings → Pages → Build and deployment → Source**, escolha **GitHub Actions**.
3. Faça push na branch `main`. O workflow `.github/workflows/pages.yml` testa, gera e publica o site.
4. O endereço fica em `https://<usuario>.github.io/<repositorio>/`.

### Opção B: Cloudflare Pages (funciona com repositório privado)

1. No painel da Cloudflare: **Workers & Pages → Create → Pages → Connect to Git** e escolha o repositório.
2. Framework preset: **None**.
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Variável de ambiente: `NODE_VERSION = 22`
3. Salve. Cada push na branch de produção publica uma nova versão em `https://<projeto>.pages.dev`.

## Privacidade

- Nenhuma chamada de rede além de carregar o próprio site. Fontes, bibliotecas e dados do OCR são servidos pelo site.
- Nenhum dado financeiro no código. Os valores iniciais entram pela tela de Ajustes ou pela importação de backup.
- O service worker só guarda em cache os arquivos do site, para abrir rápido e funcionar sem internet.

## Decisões de implementação

As dúvidas da especificação foram resolvidas assim. Mudar alguma delas é simples.

- **Dívidas têm um `papel`** (`consignado`, `cdc`, `acordo` ou `outra`). A simulação e o assistente de extraordinários usam o papel para saber qual dívida é qual.
- **"Aplicar parcelas" altera apenas os saldos das dívidas**, o capital e os juros pagos. As parcelas já entram no resultado como fixos ou como desconto no salário, então não são lançadas de novo.
- **A reserva só muda por ação explícita:** depositar, retirar ou o assistente de extraordinários. O resultado do mês não altera a reserva sozinho.
- **O assistente de extraordinários, ao ser confirmado,** cria os lançamentos `extra_out` e atualiza a reserva e os saldos numa única operação.
- **"Meses fechados"** são os meses com fechamento salvo (`closings`).
- **Valores em centavos inteiros** no banco e no backup (`valor: 12345` = R$ 123,45). Isso evita erro de arredondamento.
- **Backup sem senha.** O ZIP é guardado onde você escolher, por exemplo no iCloud Drive.
- **Extraordinários têm o campo `alocado`.** Ele marca os que já passaram pelo assistente. Os importados do app anterior entram como já alocados.
- **Restaurar com "Mesclar"** acrescenta só os registros cujo id ainda não existe e mantém a configuração local. "Substituir tudo" apaga o aparelho e grava o backup.
- **Importação do app anterior:** valores em reais. Taxas abaixo de 0,1 são lidas como fração (0,0185 → 1,85% a.m.).
- **PDF sem sinal nem D/C:** o valor é tratado como saída (fatura de cartão), exceto quando a descrição indica crédito ("recebido", "depósito", "salário"). Dá para trocar o tipo na revisão.
