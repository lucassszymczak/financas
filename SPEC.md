# Projeto: Plano Patrimonial — site pessoal de finanças, gratuito e sem instalação

Salve este documento como `SPEC.md` na raiz e use-o como especificação. Antes de codar, leia tudo, proponha um plano em fases, liste as dúvidas que mudariam a arquitetura e espere minha confirmação. Depois implemente fase por fase, com um commit por etapa e testes passando.

## 1. Objetivo e restrições

Site pessoal, aberto pelo navegador (Safari no iPhone e Chrome/Safari no computador), para:
- capturar gastos por foto, print, extrato ou texto;
- medir o resultado mensal com as regras de decisão do meu plano;
- acompanhar dívidas, reserva e capital social;
- guardar comprovantes dedutíveis no IR.

Usuário único. Interface em português do Brasil. Moeda BRL.

**Restrições obrigatórias:**
- **Nada para instalar.** O uso é pelo link no navegador. Não exigir instalação de PWA, app ou extensão. "Adicionar à Tela de Início" pode ser sugerido como opcional, nunca necessário.
- **Custo zero:** nenhuma API paga, nenhum servidor, nenhum banco remoto, nenhum serviço que exija conta além da hospedagem estática gratuita.
- **Tudo roda no navegador e os dados ficam no aparelho.** Nenhuma chamada de rede além de carregar o próprio site. Bibliotecas, fontes e dados de OCR servidos pelo próprio site, sem CDN.
- **Nenhum dado financeiro pessoal no código, seeds ou commits.** Valores iniciais entram pela tela de configuração ou pela importação de backup.

## 2. Stack

- Vite + React + TypeScript estrito. Site estático.
- IndexedDB via Dexie para dados e comprovantes (Blobs). Chamar `navigator.storage.persist()` e mostrar o status na Configuração.
- Service worker apenas para cache dos arquivos do site (carregamento rápido e uso sem internet). Nada que dependa de instalação.
- OCR: Tesseract.js com o idioma `por`, com `worker`, `core` e `traineddata` em `public/`. Carregar sob demanda na primeira foto, com barra de progresso e aviso de que o primeiro carregamento demora mais.
- PDF: pdf.js (pdfjs-dist) com o worker servido localmente.
- ZIP: JSZip. Validação: zod.
- Testes: Vitest (obrigatório para a lógica financeira e para os parsers); Playwright para o fluxo principal, incluindo viewport de iPhone.
- **Hospedagem gratuita, com README para os dois caminhos:**
  - GitHub Pages via GitHub Actions (exige repositório público no plano gratuito; ajustar `base` do Vite).
  - Cloudflare Pages conectado ao repositório (funciona com repositório privado): build `npm run build`, saída `dist`.

## 3. Proteção dos dados (o site não tem servidor)

- **Backup completo:** um ZIP com `dados.json` e a pasta `comprovantes/`.
  - **No iPhone:** botão "Salvar backup no iCloud Drive" usando a Web Share API com o arquivo, para o usuário escolher "Salvar em Arquivos".
  - **No computador:** download do arquivo.
- **Restaurar backup:** substituir tudo ou mesclar sem duplicar (idempotente por id).
- **Avisos:**
  - banner no topo se o último backup tiver mais de 7 dias;
  - lembrete após lançar um extraordinário ou fechar o mês;
  - na Configuração, explicar em uma frase que o Safari pode apagar dados de sites não abertos por cerca de 7 dias e que o backup protege contra isso.
- **Mover dados entre aparelhos:** exportar num aparelho e restaurar no outro. Mostrar a data do último backup e a do último restauro.

## 4. Modelo de dados (Dexie)

- `settings` (registro único):
  - reserva, capital, longevidadeModo (`'2/2' | '6/6'`), salarioBaseLongevidade;
  - ultimoMesAplicado (`YYYY-MM`), jurosPagos, fipeCarro;
  - projecao {resultadoManual, pisoReserva, decimoNov, decimoDez, plrMarco, restituicaoJunho, janelaLongevidade};
  - tetos {categoria: valor};
  - ultimoBackup, ultimoRestauro.
- `debts`: id, nome, saldo, taxaMensal (%), parcela, ordem, ativo.
- `fixedItems`: id, tipo, categoria, descricao, valor, ativo.
- `transactions`:
  - id, data, mes, tipo, categoria, descricao, estabelecimento, valor (> 0), forma (`Cartão | Conta / Pix | Dinheiro`);
  - origem (`foto | print | extrato | texto | manual | fixo | importacao`);
  - fixoId, dedutivel (`null | saude | educacao`), cnpj, beneficiario, reembolsado, comprovanteId, comprovantePendente, criadoEm.
- `receipts`: id, blob (JPEG), criadoEm.
- `categoryRules`: chave (única), tipo, categoria, atualizadoEm. Máximo 300; remover as mais antigas.
- `keywordDictionary`: palavra, tipo, categoria, dedutivel (editável).
- `csvMappings`: nome do banco, colunas, formato de data e de valor.
- `closings`: mes, texto.
- `snapshots`: mes, reserva, capital, saldos das dívidas, jurosDoMes.

**Tipos de lançamento:**
- `saida` e `entrada` entram no resultado.
- `trabalho` (despesa paga por mim e reembolsada pelo empregador), `extra_in` (13º, PLR, restituição, 1/3 de férias) e `extra_out` (destino de extraordinários) ficam **fora** do resultado.

**Categorias:**
- **saida:** Moradia, Carro (parcela), Escola, Acordo familiar, Seguros, Assinaturas, Poupança dos filhos, Mercado (além do VA), Restaurante, Transporte, Combustível, Saúde, Farmácia, Lazer, Vestuário, Estética, Informática, Educação/Cultura, Casa e manutenção, Presentes, Música (equipamento), Outros.
- **entrada:** Salário líquido, Música (shows), Juros e rendimentos, Outras entradas.
- **trabalho:** Hospedagem, Transporte, Alimentação em viagem, Combustível, Outros.
- **extra_in:** 13º salário, PLR, Restituição IR, 1/3 de férias, Outros.
- **extra_out:** Reforma, Amortização de dívida, Depósito na reserva, Longevidade, Uso livre (30%), Outros.

## 5. Lógica financeira

Funções puras em `src/lib/finance/`, com testes unitários para cada uma.

1. **Resultado do mês** = soma de `entrada` − soma de `saida`.
2. **Previsão de fechamento** (só no mês corrente):
   - saídas previstas = max(fixos de saída lançados, soma dos fixos ativos de saída) + saídas variáveis × dias_do_mês / dia_atual;
   - entradas previstas = max(entradas lançadas, fixos de entrada);
   - sempre rotulada como estimativa.
3. **Regra do Longevidade:**
   - resultado (ou previsão, no mês corrente) ≥ −500 → recomendar subir para 6/6 na próxima janela;
   - abaixo disso → esperar;
   - janelas em junho e novembro.
4. **Contribuição mensal ao capital:**
   - 2/2 = 2% + 2% do salário base;
   - 6/6 = 6% + 6%;
   - custo extra para mim ao subir = 4% do salário base.
5. **Aplicar parcelas do mês** (botão; um mês por vez; não passa do mês corrente):
   - com juros: saldo = max(0, saldo × (1 + i) − parcela);
   - sem juros: saldo −= parcela;
   - capital += contribuição; jurosPagos += juros do mês;
   - grava um snapshot.
6. **Meses restantes:**
   - com juros: ceil(−ln(1 − saldo × i / parcela) / ln(1 + i));
   - sem juros: ceil(saldo / parcela).
7. **Simulação de 12 meses** a partir do mês seguinte ao último aplicado:
   - fluxo mensal = média dos meses fechados (ou valor manual; padrão −1200 sem dados);
   - menos o custo extra do Longevidade a partir da janela escolhida;
   - consignado: saldo × (1 + i) − parcela; depois de quitado, a parcela volta ao fluxo;
   - acordo familiar: idem, sem juros;
   - extraordinários em novembro, dezembro, março e junho: primeiro completam a reserva até o piso, o resto amortiza o consignado, e a sobra vai para a reserva;
   - saída: tabela mês a mês (fluxo, reserva, consignado, capital), mês de quitação e alerta se a reserva terminar abaixo do piso.
8. **Assistente de extraordinários** (ao lançar `extra_in`):
   - reserva < 15.000 → completar até 15.000;
   - depois, amortizar o consignado até quitar;
   - com o consignado quitado: 30% uso livre e 70% patrimônio (primeiro reserva até 30.000, depois amortização do CDC).
9. **Duplicados:** mesmo valor (±0,01) e data a até 2 dias de distância → marcar e desmarcar por padrão.
10. **Chave de estabelecimento:** minúsculas, sem acentos, só letras, palavras com mais de 1 letra, primeiras 3 palavras.
11. **Recorrências:** saídas não fixas com a mesma chave em 2 meses ou mais e valores dentro de ±15% da média → listar com custo anual.
12. **Tetos com ritmo:**
    - fração = dia / dias_do_mês;
    - alerta se gasto > teto × fração × 1,15;
    - amarelo acima de 80% do teto;
    - vermelho se estourou.

## 6. Captura sem IA

Parsers em `src/lib/capture/`, com testes usando amostras fictícias.

- **Categorização** (ordem de prioridade):
  1. regra aprendida pela chave do estabelecimento;
  2. dicionário de palavras-chave, com valores iniciais e editável: posto/ipiranga/shell/petrobras → Combustível; farmácia/drogaria/raia/pague menos → Farmácia; uber/99 → Transporte; mercado/supermercado/atacad → Mercado; restaurante/lanch/pizz/ifood → Restaurante; clinica/odonto/laborat/hospital/medic/fisio/psicolog → Saúde e dedutível saude; escola/colegio/educacional → Escola e dedutível educacao; hotel/pousada/airbnb/booking → sugerir tipo `trabalho`; netflix/spotify/apple/google/amazon prime → Assinaturas;
  3. "Outros".
- **Pagamento de fatura, transferência entre contas próprias e estorno:** detectados por palavras-chave e chegam desmarcados.
- **Aprendizado:** ao confirmar a revisão, se eu mudei categoria ou tipo, grava ou atualiza a regra.
- **OFX:** blocos `STMTTRN` (DTPOSTED, TRNAMT, MEMO/NAME); negativo = saída, positivo = entrada. Suportar OFX SGML e XML.
- **CSV:** detectar separador (`;` ou `,`), cabeçalho e colunas de data, descrição e valor; datas dd/mm/aaaa e aaaa-mm-dd; números brasileiros (1.234,56). Tela de mapeamento de colunas quando a detecção falhar, salva por banco.
- **PDF com texto:** extrair linhas com pdf.js (agrupar por coordenada y) e aplicar regex de lançamento: data no início, descrição, valor no fim, sinal ou indicação D/C. Sem texto → rasterizar as páginas e usar OCR.
- **Foto ou print (OCR):**
  - pré-processar: redimensionar a 1800 px, escala de cinza, contraste;
  - rodar o Tesseract (`por`);
  - do texto, extrair:
    - valor: prioridade para linhas com TOTAL / VALOR TOTAL / VALOR A PAGAR / VALOR PAGO / VALOR; senão o maior valor monetário;
    - data (dd/mm/aaaa, dd/mm/aa, dd/mm);
    - CNPJ (com validação dos dígitos verificadores);
    - estabelecimento: primeira linha relevante em maiúsculas, ou "Para"/"Recebedor" em comprovante de Pix;
    - forma: Pix → Conta / Pix; crédito/débito/cartão → Cartão.
  - Resumo por categoria de app de cartão: pares "categoria ... R$ valor" viram um item por linha.
  - Mostrar o texto reconhecido num painel recolhível para correção.
- **Texto ou ditado** (pelo teclado do celular): regex para frases como "gastei 87 no posto hoje", "42,50 farmácia ontem", "recebi 400 do show". Entender hoje/ontem/anteontem e dd/mm.
- **Fila de revisão** (tudo passa por ela):
  - item editável (valor, data, tipo, categoria, dedutível);
  - selos: possível duplicado, regra aplicada, reembolsável, dedutível, CNPJ;
  - miniatura;
  - escolha "Guardar foto" / "Descartar foto", com dedutíveis guardados automaticamente e trabalho marcado como guardar por padrão.

## 7. Telas

Navegação por abas, inferior no celular e lateral ou superior no computador.

1. **Capturar** (tela inicial)
   - Botão grande "Tirar foto do gasto" (`input accept="image/*" capture="environment"`), "Prints e fotos" (múltiplos), "Extrato" (OFX, CSV, PDF) e campo de texto.
   - Fila de revisão, lançamento manual, "Lançar fixos do mês" (sem duplicar) e edição dos fixos.
2. **Mês**
   - Navegação de mês, resultado em destaque, régua de −3.000 a +3.000 com marcas em 0 e −500, previsão e veredito pela regra do Longevidade.
   - Reembolsos pendentes com dias em aberto (alerta acima de 20 dias) e botão "Recebido".
   - Barras por categoria e lista agrupada por tipo, com exclusão (confirmar se houver comprovante de IR).
3. **Controle**
   - **Fechamento do mês gerado por template:**
     - resultado e leitura da regra;
     - três maiores desvios em relação ao mês anterior ou aos tetos, com valores;
     - uma ação sugerida por regra simples (por exemplo, criar ou ajustar o teto da categoria que mais subiu).
     Salvo em `closings`.
   - Tetos com marca de ritmo.
   - **Calendário:**
     - todo mês: fatura no dia 11, CDC no dia 25, fechar o mês anterior no dia 1;
     - janelas do Longevidade em junho e novembro;
     - 13º em 30/11 e 20/12;
     - PLR em março e setembro;
     - lembrete de IR em março;
     - lembrete de backup semanal.
   - Recorrências.
   - **Simulador "e se":** amortizar uma dívida (parcelas e juros evitados), trocar o carro (venda a 90% da FIPE − quitação − compra à vista) e efeito do 6/6 em 12 meses.
4. **Plano**
   - Reserva com barra até 15 mil, depositar e retirar.
   - Dívidas com amortizar, corrigir saldo, juros do mês e término previsto.
   - Capital com seletor 2/2 ou 6/6, FIPE e patrimônio no carro.
   - "Aplicar parcelas de <mês>".
   - Evolução (snapshots) e projeção de 12 meses editável.
   - Regras do plano:
     - ordem de uso de cada real livre: reserva mínima de 15 mil → Longevidade 6/6 se a regra permitir → quitar consignado → reserva até 30 mil → amortizar CDC → reserva de 6 meses e investimentos;
     - não contratar crédito para dívida de terceiros;
     - fatura sempre integral;
     - reembolso de trabalho não é renda;
     - depois do consignado, extraordinários seguem 70/30.
5. **Respostas rápidas**
   - Calculadoras com texto pronto:
     - "Posso gastar R$ X?": compara com a previsão e com a regra do −500;
     - "Quanto falta para quitar cada dívida?";
     - "Onde estou acima do ritmo?";
     - "Vale subir o Longevidade na próxima janela?".
   - Sempre diferenciar fato de estimativa.
6. **IR e comprovantes**
   - Ano-calendário com totais de saúde e educação.
   - Dedutíveis com CNPJ, ver e baixar comprovante, anexar foto aos pendentes.
   - Área separada para outros comprovantes guardados.
   - **Exportar:**
     - CSV de lançamentos do ano;
     - CSV de dedutíveis (separador `;`, BOM UTF-8, vírgula decimal);
     - ZIP com os comprovantes do ano, nomeados `AAAA-MM-DD_beneficiario_valor.jpg`.
7. **Configuração e backup**
   - Valores iniciais (reserva, capital, salário base do Longevidade, último mês aplicado, FIPE), dívidas, fixos e dicionário de categorias.
   - Backup e restauração (seção 3) e status do armazenamento persistente.

## 8. Importação do backup do app anterior

Aceitar um JSON no formato `{config, months, fech}`:

- **`config`:**
  - `fixos[]` com `{tipo, cat, desc, valor}`;
  - `debts` com `{consig, cdc, mae}`, cada um `{nome, saldo, taxa, parcela}`;
  - `reserva`, `capital`, `longev`, `ultimoAplicado`, `jurosPagos`, `historico[]`, `tetos{}`, `regras{}`, `fipe`, `proj{}`.
- **`months`:** `{"YYYY-MM": [itens]}`, cada item `{tipo, cat, desc, valor, data, forma, estab, dedutivel, cnpj, beneficiario, recebido, fixoId, origem, assetId}`.
- **`fech`:** `{"YYYY-MM": texto}`.

Itens com `assetId` entram com `comprovantePendente = true`, porque as fotos antigas não vêm no JSON. Mostrar um resumo antes de gravar e ser idempotente.

## 9. Design

- Visual limpo e calmo.
- Tipografia: Sora (títulos e números) e Source Sans 3 (texto), servidas pelo próprio site, com números tabulares.
- Paleta clara:
  - bg #EDF1EF, superfície #FFFFFF, tinta #15231E, secundário #5A6A64, linhas #D3DCD8;
  - destaque #2346B8; positivo #1D7748; negativo #B0301D; atenção #9A6200.
- Modo escuro equivalente.
- Mobile first e bom também no computador. Toque de no mínimo 44 px, safe areas do iPhone, foco visível, `prefers-reduced-motion`.
- Textos curtos
