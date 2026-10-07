# Plano Patrimonial

Site pessoal de finanças que roda **inteiro no navegador**. Não há servidor, banco remoto nem API paga. Os dados ficam no próprio aparelho (IndexedDB) e só saem dele pelo backup que você mesmo gera.

A especificação completa está em [`SPEC.md`](SPEC.md).

## Uso

- Abra o link no Safari (iPhone) ou no Chrome/Safari (computador). Não há nada para instalar.
- Opcional: no iPhone, use **Compartilhar → Adicionar à Tela de Início** para abrir como se fosse um app. Isso também reduz o risco de o Safari apagar os dados.
- **Faça backup com frequência** (Ajustes → Backup). O Safari pode apagar dados de sites que você não abre por cerca de 7 dias.

## Desenvolvimento

```bash
npm install
npm run dev        # servidor local
npm test           # testes unitários (Vitest)
npm run e2e        # testes de ponta a ponta (Playwright, iPhone e computador)
npm run lint
npm run typecheck
npm run build      # gera dist/
```

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
