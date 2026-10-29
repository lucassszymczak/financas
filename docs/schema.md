# Schema do arquivo diário `radar_AAAA-MM-DD.json`

Este documento é o contrato entre a rotina que gera o Radar e o app. O app valida cada arquivo com este schema (código em `src/schema/radar.ts`) antes de salvar. Um exemplo completo e válido está em [`radar_2026-10-16.json`](radar_2026-10-16.json).

**Versão do schema:** `1.0`

## Regras gerais

| Regra | Detalhe |
|---|---|
| Codificação | UTF-8, JSON puro (sem comentários, sem vírgula sobrando no fim). |
| Nome do arquivo | `radar_AAAA-MM-DD.json` (manhã) e `radar_AAAA-MM-DD_1230.json` (atualização do meio-dia), recomendados. O app usa `edicao.data` + `edicao.tipo`, não o nome, como chave. |
| Datas | Texto `AAAA-MM-DD` (ex.: `"2026-10-16"`). |
| Horas | Texto `HH:MM`, 24 horas (ex.: `"09:00"`). |
| Data e hora completas | ISO 8601 com fuso (ex.: `"2026-10-16T07:21:00-03:00"`). |
| Números | Número JSON com ponto decimal (`5.087`, não `"5,087"`). Percentuais em pontos percentuais (`12.73` = 12,73%). |
| `null` | Sempre aceito em campos marcados como "pode ser null". Significa **não verificado**: o app mostra "—" e não inventa valor. |
| Campos desconhecidos | São ignorados. A rotina pode mandar campos extras sem quebrar o app; o JSON original fica guardado no histórico. |
| Listas ausentes | Viram lista vazia. Seções opcionais ausentes simplesmente não aparecem. |
| Mesma edição | A chave de cada edição é `data#tipo` (ex.: `2026-10-21#manha`). Importar de novo a **mesma data e o mesmo tipo** faz o app perguntar se substitui. A edição do meio-dia **nunca** substitui nem apaga a da manhã: as duas ficam salvas e o app junta as duas no "dia completo" (ver [Várias edições no mesmo dia](#varias-edicoes-no-mesmo-dia)). |

Legenda das tabelas: **Obrig.** = obrigatório. "Pode ser null" = aceita `null`. Campos opcionais podem ser omitidos.

## Raiz

| Campo | Tipo | Obrig. | Exemplo / observação |
|---|---|---|---|
| `schema_version` | texto | sim | `"1.0"` |
| `edicao` | objeto | sim | ver [edicao](#edicao) |
| `termometro` | objeto | não, pode ser null | ver [termometro](#termometro) |
| `destaques` | lista de [destaque](#destaques) | não | 3 a 5 itens costuma funcionar bem |
| `noticias` | lista de [noticia](#noticias) | não | A partir de 29/10/2026: de 15 a 25 itens, no máximo 4 por editoria. |
| `editorias_sem_destaque` | lista de texto | não, pode ser null | Slugs das [editorias](#editorias) sem notícia relevante no dia (ex.: `["tecnologia_energia"]`). Slugs desconhecidos são descartados. |
| `leitura_do_dia` | texto | não, pode ser null | Parágrafo curto, aparece como "🧠 Leitura do dia". |
| `leituras_secao` | objeto texto→texto | não, pode ser null | ver [leituras_secao](#leituras_secao) |
| `cotacoes` | lista de [cotação](#cotacoes) | não | |
| `agro` | lista de [item agro](#agro) | não | |
| `cotacoes_amplas` | objeto | não, pode ser null | Universo amplo de cotações; ver [cotacoes_amplas](#cotacoes_amplas). |
| `taxas_referencia` | objeto | não, pode ser null | ver [taxas_referencia](#taxas_referencia) |
| `clima` | objeto | não, pode ser null | ver [clima](#clima) |
| `agenda` | lista de [evento](#agenda) | não | |
| `limitacoes` | lista de texto | não | O que não foi verificado nesta edição. Aparece recolhido na tela Hoje. |
| `aviso` | texto | não, pode ser null | Se faltar, o app mostra "Material informativo de uso interno, não é recomendação de investimento." |

## `edicao`

| Campo | Tipo | Obrig. | Exemplo |
|---|---|---|---|
| `data` | data | **sim** | `"2026-10-16"`: chave da edição no histórico e base da regra de "dado antigo". |
| `dia_semana` | texto | não | `"sexta"` |
| `tipo` | texto | não | `"manha"` (padrão quando falta) ou `"atualizacao_meio_dia"`. Outros valores são aceitos e viram edições separadas (a chave inclui o `gerado_em`). |
| `gerado_em` | data e hora | não | `"2026-10-16T07:21:00-03:00"`. Ordena as edições do dia e dá a hora mostrada nos selos ("atualizado às 12h30"). |
| `referencia_mercado` | texto | não | `"Fechamento de 15/10; Ásia e Brent da madrugada de 16/10"` |
| `titulo` | texto | não | `"Radar Diário de Investimentos · 16/10 (sexta)"` |

## `termometro`

| Campo | Tipo | Obrig. | Exemplo |
|---|---|---|---|
| `tom` | texto | não, pode ser null | `"cautela"`. Valores com cor: `otimismo`, `positivo`, `alivio`, `neutro`, `cautela`, `misto`, `tensao`, `pessimismo`, `negativo`. Outros aparecem em cinza. |
| `texto` | texto | **sim** | 2 a 4 frases. |

## `destaques`

Cada item vira um card expansível. Visível: `titulo` + `o_que`. Ao expandir: `por_que`, `o_que_muda`, ativos, selos e fontes.

| Campo | Tipo | Obrig. | Exemplo |
|---|---|---|---|
| `id` | texto | **sim** | `"datafolha-2026-10-15"` (único na edição) |
| `emoji` | texto | não | `"🗳️"` |
| `titulo` | texto | **sim** | `"Datafolha: empate técnico"` |
| `categoria` | texto | não | `"politica"`, `"mundo"`, `"brasil"`, `"agro"`… |
| `o_que` | texto | **sim** | O fato, em uma ou duas frases. |
| `por_que` | texto | não, pode ser null | "Por que aconteceu". |
| `o_que_muda` | texto | não, pode ser null | "O que muda" para o investidor. |
| `ativos_afetados` | lista de texto | não | `["Ibovespa", "Dólar"]`: viram chips. |
| `impacto` | texto | não | `"positivo"`, `"negativo"`, `"misto"`, `"neutro"` (com cor). |
| `horizonte` | texto | não | `"dias"`, `"semanas"`, `"meses"` |
| `confianca` | texto | não | `"alta"`, `"media"`, `"baixa"` |
| `fontes` | lista de [fonte](#fonte) | não | |
| `hora` | hora | não, pode ser null | `"12:05"`: hora da notícia. Sem ela, o app usa a hora do `gerado_em` da edição (em Brasília) e, sem isso, 07h15. |
| `atualiza_id` | texto | não, pode ser null | Numa edição posterior, o `id` do item da manhã que este atualiza. Normalmente o item mantém o mesmo `id` e traz também `atualiza_id`. |
| `atualizado_em` | hora | não, pode ser null | `"12:20"`: hora da atualização, mostrada no selo "Atualizada às 12h20". |
| `editoria` | texto | não, pode ser null | Slug da [editoria](#editorias) (ex.: `"mercados"`). Valor desconhecido não invalida o arquivo: vira `outras`. Sem ele, a editoria sai da `categoria`. |
| `relevancia` | objeto | não, pode ser null | `{ "mercado": 3, "sistema_financeiro": 2, "regiao_agro": 0, "novidade": 3, "total": 8 }`: notas inteiras de 0 a 3 e `total` de 0 a 12. Ordena as notícias; sem ela, o app não mostra nota nenhuma. |
| `canal_transmissao` | texto | não, pode ser null | Só em `politica_regulacao`: por onde a notícia chega ao mercado (ex.: `"fiscal → curva de juros"`). |

## `noticias`

Mesmo card dos destaques, com outros nomes de campo.

| Campo | Tipo | Obrig. | Exemplo |
|---|---|---|---|
| `id` | texto | **sim** | `"conab-1-lev-2026-27"` |
| `emoji` | texto | não | |
| `titulo` | texto | **sim** | |
| `data` | data | não, pode ser null | `"2026-10-15"` |
| `categoria` | texto | não | |
| `resumo` | texto | **sim** | Texto visível do card. |
| `por_que_importa` | texto | não, pode ser null | Aparece ao expandir. |
| `ativos_afetados`, `impacto`, `horizonte`, `confianca`, `fontes` | | não | Iguais aos de `destaques`. |
| `hora`, `atualiza_id`, `atualizado_em` | | não | Iguais aos de `destaques`. |
| `editoria`, `relevancia`, `canal_transmissao` | | não | Iguais aos de `destaques` (ver [Editorias](#editorias)). |

### `fonte`

| Campo | Tipo | Obrig. | Exemplo |
|---|---|---|---|
| `nome` | texto | **sim** | `"InfoMoney"` |
| `url` | texto | não, pode ser null | Link aberto em nova aba. |
| `nota` | número 0 a 5 | não, pode ser null | `3.5`: estrelas (aceita meia). |

## `leituras_secao`

Objeto em que cada chave é uma seção e o valor é uma frase de leitura (caixa "🔎 Leitura"). Chaves usadas pelo app:

| Chave | Onde aparece |
|---|---|
| `mercado` | Topo da aba Mercado. |
| `agro` | Topo da aba Agro. |
| `<regiao>` ou `<regiao>_agro` | No bloco daquela região do Agro. Ex.: `brasil_agro` (ou `brasil`), `guarapuava`, `noroeste_paulista`, `chicago`. |

## `cotacoes`

Cada item é um ativo. Aparece na fita de cotações do topo, nas tabelas do Mercado (agrupado por `grupo`), na watchlist e nos gráficos de histórico.

| Campo | Tipo | Obrig. | Exemplo / observação |
|---|---|---|---|
| `id` | texto | **sim** | `"IBOV"`, `"USDBRL"`, `"DI1F29"`. **Mantenha o mesmo id todos os dias**: é ele que liga o histórico. |
| `nome` | texto | **sim** | `"Ibovespa"` |
| `nome_curto` | texto | não | Rótulo na fita quando o `id` não é um código de bolsa. Se faltar, a fita usa o `id`. |
| `grupo` | texto | **sim** | Qualquer texto; o app cria uma tabela por grupo. Nomes conhecidos: `indices_br`, `indices_mundo`, `moedas`, `juros_br`, `juros_mundo`, `commodities`, `acoes_bluechips`, `acoes_agro`, `renda_fixa`. |
| `valor` | número | não, pode ser null | `204324.26`. **Para ações (grupos `acoes_*`), é o preço de fechamento em R$ e deve vir preenchido**: sem ele, o app mostra "sem preço no arquivo" e só a variação. |
| `unidade` | texto | não, pode ser null | `"pts"`, `"R$"`, `"US$"`, `"% a.a."`, `"%"`, `"US$/barril"`, `"R$/sc 60 kg"`… |
| `variacao_pct` | número | não, pode ser null | Variação em % no dia (`-1.06`). |
| `variacao_pb` | número | não, pode ser null | Variação em pontos-base, **para juros** (`25`). Se vier, o app mostra em pb e ignora `variacao_pct`. |
| `data_ref` | data | não, pode ser null | Data do preço (`"2026-10-15"`). Base da regra de "dado antigo". |
| `hora_ref` | hora | não, pode ser null | `"12:24"`: **valor intradiário** (do meio do pregão). O app mostra o selo "intradiário · 12h24" e **não** usa o valor no histórico nem nos gráficos de linha (só fechamentos). |
| `observacao` | texto | não, pode ser null | `"intradiário"` também marca o valor como intradiário (mesmo sem `hora_ref`). |
| `periodo` | texto | não | Para dado semanal (`"05 a 09/10"`). Itens com período nunca são marcados como antigos. |
| `fonte` | texto | não, pode ser null | |
| `url` | texto | não, pode ser null | |
| `nota_fonte` | número 0 a 5 | não, pode ser null | |
| `kpi` | verdadeiro/falso | não | `true` = vira card grande na tela Hoje (com mini-gráfico). Padrão: `false`. |
| `setor` | texto | não | Ações: setor B3 (ex.: `"Financeiro"`, `"Bens industriais"`). FIIs: o tipo do fundo (`"Logística"`, `"Lajes corporativas"`, `"Shoppings"`, `"Recebíveis"`/`"Papel"`, `"Híbrido"`, `"Fundo de fundos"`, `"Renda urbana"`…), que monta a divisão por tipo na aba FIIs. Monta o **Mapa setorial**, o menu Setores, os chips de Ações e as opções da fita; também entra na busca e no detalhe. Use sempre o mesmo nome para o mesmo setor. |
| `abertura`, `maxima`, `minima`, `fechamento_anterior` | número | não, pode ser null | Preços do pregão do `data_ref`, na mesma unidade de `valor`. |
| `volume_financeiro` | número | não, pode ser null | Em R$ (ex.: `612000000`). O app abrevia para "R$ 612,0 mi". |
| `var_semana_pct`, `var_mes_pct`, `var_ano_pct`, `var_12m_pct` | número | não, pode ser null | Variação acumulada em % (ex.: `-5.4`). |
| `minima_52s`, `maxima_52s` | número | não, pode ser null | Faixa de 52 semanas. |

Os campos de detalhe do pregão (de `setor` a `maxima_52s`) valem para `cotacoes`, `agro` e `cotacoes_amplas`. Todos são opcionais: o pop-up do ativo só mostra os que vierem.

### Ids recomendados

O app tem uma watchlist padrão com estes ids. Use-os quando o ativo vier no arquivo:

| Grupo da watchlist | Ids |
|---|---|
| Índices domésticos | `IBOV`, `IBXX`, `SMLL`, `IDIV`, `IFIX` |
| Blue chips | `PETR4`, `VALE3`, `ITUB4`, `BBAS3`, `BBDC4`, `ABEV3`, `WEGE3`, `B3SA3`, `ELET3`, `SUZB3`, `EMBJ3` |
| Agro e proteína | `SLCE3`, `AGRO3`, `JBSS3`, `BEEF3`, `MBRF3`, `RAIZ4`, `SMTO3`, `TTEN3` |
| Índices globais | `SPX`, `NDX`, `DJI`, `KOSPI`, `N225`, `DAX`, `SSEC` |
| Renda fixa e taxas | `SELIC`, `CDI`, `IPCA12M` (vêm de `taxas_referencia`), `DI1F27`, `DI1F29`, `DI1F31`, `UST2`, `UST10` |
| Tesouro Direto | `TESOURO_PRE_AAAA` e `TESOURO_IPCA_AAAA` (ex.: `TESOURO_PRE_2031`, `TESOURO_IPCA_2035`), no grupo `renda_fixa`, com `valor` = taxa em % a.a. e `unidade` `"% a.a."`. |

**Ações:** use `unidade: "R$"` e preencha `valor` com o preço de fechamento do `data_ref` (ex.: `{"id": "PETR4", "nome": "Petrobras PN", "grupo": "acoes_bluechips", "valor": 30.12, "unidade": "R$", "variacao_pct": -1.29, "data_ref": "2026-10-15", ...}`). Use `null` só quando o preço realmente não pôde ser verificado, e registre isso em `limitacoes`.

Outros ids usados pelos limites e calculadoras: `USDBRL` (dólar comercial), `BOI_CEPEA`, `SOJA_CBOT`, `SOJA_PGUA`.

## `agro`

Igual a `cotacoes`, trocando `grupo` por `regiao`.

| Campo | Tipo | Obrig. | Observação |
|---|---|---|---|
| `regiao` | texto | **sim** | Um bloco por região. Nomes conhecidos: `chicago`, `brasil`, `guarapuava`, `noroeste_paulista`. Outros aparecem com o nome formatado. |
| demais campos | | | Iguais aos de [cotacoes](#cotacoes) (`id`, `nome`, `valor`, `unidade`, `variacao_pct`, `data_ref`, `periodo`, `fonte`, `url`, `nota_fonte`, `kpi`…). |

## `cotacoes_amplas`

Bloco **opcional** com o universo grande de cotações do dia: todas as ações do Ibovespa, índices setoriais, FIIs, bolsas do mundo, moedas, commodities, cripto, curva de juros etc. Ele **não muda o Radar curado**:

- não entra na fita **Principais**, nos KPIs, no texto da tela Hoje nem no resumo de "dado antigo";
- aparece nas outras opções da fita (Todas as ações, setores, Índices…), no **Mapa setorial**, nas tabelas de Mercado e Renda fixa, no **Mercado → Todos**, na **busca de ativos**, na **watchlist** (preenchendo o que antes era "sem dado hoje"), no **histórico** e nos gráficos.

Se um `id` aparecer em `cotacoes`/`agro` **e** em `cotacoes_amplas`, vale o do Radar curado.

| Campo | Tipo | Obrig. | Observação |
|---|---|---|---|
| `data_ref` | data | não, pode ser null | Data padrão dos itens (normalmente o último pregão). |
| `hora_ref` | hora | não, pode ser null | Hora padrão dos itens: se vier, todo o bloco é intradiário. |
| `fonte`, `url` | texto | não, pode ser null | Fonte padrão dos itens. |
| `nota_fonte` | número 0 a 5 | não, pode ser null | Nota padrão. |
| `itens` | lista | não | Mesmos campos de [cotacoes](#cotacoes); `nome` pode faltar (o app usa o `id`). Cada item pode sobrescrever `data_ref`, `fonte`, `url` e `nota_fonte`. |

Grupos com nome próprio no app (outros aparecem com o nome formatado): `acoes_ibov`, `acoes_outras`, `indices_br`, `indices_setoriais`, `indices_mundo`, `fiis`, `bdrs`, `etfs`, `moedas`, `moedas_mundo`, `cripto`, `juros_br`, `curva_di`, `tesouro`, `juros_mundo`, `commodities`, `commodities_agricolas`, `commodities_metais`, `commodities_energia`.

Exemplo compacto:

```json
"cotacoes_amplas": {
  "data_ref": "2026-10-15",
  "fonte": "B3",
  "nota_fonte": 4.5,
  "itens": [
    {"id": "WEGE3", "nome": "WEG ON", "grupo": "acoes_ibov", "setor": "Bens industriais", "valor": 41.20, "unidade": "R$", "variacao_pct": 0.8,
     "abertura": 40.90, "maxima": 41.50, "minima": 40.70, "fechamento_anterior": 40.87, "volume_financeiro": 612000000,
     "var_mes_pct": 3.1, "var_ano_pct": -5.4, "var_12m_pct": -2.2, "minima_52s": 35.10, "maxima_52s": 48.90},
    {"id": "IFNC", "nome": "Índice Financeiro", "grupo": "indices_setoriais", "valor": 15890, "unidade": "pts", "variacao_pct": -1.1},
    {"id": "BTC", "nome": "Bitcoin", "grupo": "cripto", "valor": 610000, "unidade": "R$", "variacao_pct": 2.3, "data_ref": "2026-10-16", "fonte": "Mercado Bitcoin"}
  ]
}
```

Instruções prontas para a rotina gerar este bloco: [`rotina-cotacoes.md`](rotina-cotacoes.md).

## `taxas_referencia`

| Campo | Tipo | Obrig. | Exemplo |
|---|---|---|---|
| `selic_meta` | número | não, pode ser null | `15.0` (% a.a.) |
| `cdi_anual` | número | não, pode ser null | `14.9` (% a.a.) |
| `ipca_12m` | número | não, pode ser null | `5.1` (%) |
| `observacao` | texto | não, pode ser null | |

Viram os ativos `SELIC`, `CDI` e `IPCA12M` no Mercado e pré-preenchem as calculadoras. Com `null`, as calculadoras deixam o campo vazio e pedem o valor.

## `clima`

| Campo | Tipo | Obrig. | Observação |
|---|---|---|---|
| `enso` | objeto | não, pode ser null | `fase`, `intensidade`, `texto`, `data_ref`, `fonte`, `url` (todos opcionais, podem ser null). |
| `regioes` | lista | não | ver abaixo |
| `no_campo` | texto | não, pode ser null | Leitura agronômica, caixa "No campo". |

### `clima.regioes[]`

| Campo | Tipo | Obrig. | Exemplo |
|---|---|---|---|
| `id` | texto | **sim** | `"guarapuava"` |
| `nome` | texto | **sim** | `"Guarapuava (PR)"` |
| `resumo` | texto | não, pode ser null | |
| `previsao` | lista | não | Um item por dia (abaixo). |
| `alertas` | lista | não | Cada alerta vira alerta na tela Hoje. |
| `fonte`, `url` | texto | não, pode ser null | |

`previsao[]`:

| Campo | Tipo | Obrig. | Exemplo |
|---|---|---|---|
| `data` | data | **sim** | `"2026-10-17"` |
| `min`, `max` | número (°C) | não, pode ser null | `9`, `16` |
| `chuva_mm` | número | não, pode ser null | `0.5` |
| `prob_chuva` | número (%) | não, pode ser null | `63` |
| `condicao` | texto | não, pode ser null | `"Sol com nuvens"`. O ícone sai do texto (chuva, trovoada, nevoeiro, nuvens, sol…). |

`alertas[]`:

| Campo | Tipo | Obrig. | Exemplo |
|---|---|---|---|
| `tipo` | texto | **sim** | `frio`, `geada`, `chuva`, `temporal`, `granizo`, `vento`, `seca`, `calor`, `neblina` (ícone próprio; outros recebem ⚠️). |
| `nivel` | texto | **sim** | `informativo`, `atencao`, `alerta`, `perigo` (também aceita `amarelo`, `laranja`, `vermelho`, `severo`). Define a cor. |
| `texto` | texto | **sim** | |
| `inicio`, `fim` | data | não, pode ser null | |
| `fonte` | texto | não, pode ser null | |

## `agenda`

| Campo | Tipo | Obrig. | Exemplo |
|---|---|---|---|
| `data` | data | **sim** | `"2026-10-16"` |
| `hora` | hora | não, pode ser null | `"09:00"`. `null` = sem horário ("dia todo"). |
| `fuso` | texto (IANA) | não, pode ser null | `"America/Sao_Paulo"` (padrão). Se vier outro (ex.: `"America/New_York"`), o app converte para o horário de Brasília. |
| `pais` | texto | não, pode ser null | Código de 2 letras (`"BR"`, `"US"`, `"CN"`, `"EU"`): vira bandeira. |
| `evento` | texto | **sim** | |
| `o_que_mede` | texto | não, pode ser null | |
| `expectativa` | texto | não, pode ser null | |
| `relevancia` | texto | não, pode ser null | `"alta"`, `"media"`, `"baixa"` |
| `fonte`, `url` | texto | não, pode ser null | |

## Editorias

A partir de 29/10/2026, cada notícia (e cada destaque, quando houver) traz `editoria`. A ordem abaixo é a de exibição no menu **Notícias**, na página `/noticias` e no bloco "Radar por editoria" da tela Hoje.

| Ordem | Slug | Rótulo | Ícone |
|---|---|---|---|
| 1 | `bancos_cooperativas` | Bancos e cooperativas | 🏦 |
| 2 | `mercados` | Mercados | 📈 |
| 3 | `economia` | Economia | 🧮 |
| 4 | `business` | Business e empresas | 🏢 |
| 5 | `financas_produtos` | Finanças e produtos | 💰 |
| 6 | `agro` | Agro | 🌾 |
| 7 | `tecnologia_energia` | Tecnologia, IA e energia | 🤖 |
| 8 | `mundo` | Mundo | 🌍 |
| 9 | `politica_regulacao` | Política e regulação | 🏛️ |
| — | `outras` | Outras | 🗞️ (interna: legado sem mapeamento ou slug desconhecido) |

**Edições antigas (sem `editoria`).** O app deduz a editoria pela `categoria` (função `editoriaDe` em `src/dominio/editorias.ts`), na leitura, sem regravar o arquivo salvo:

| `categoria` | Editoria |
|---|---|
| `mercado` | `mercados` |
| `mundo` | `mundo` |
| `agro` | `agro` |
| `politica` | `politica_regulacao` |
| `brasil` | `politica_regulacao` se o título ou o resumo falar de Câmara, Senado, STF, PEC, projeto de lei, Congresso, eleição, ministro, Planalto, MP ou decreto; senão `economia` |
| qualquer outra | `outras` |

`categoria` continua aceita em todas as edições.

## Várias edições no mesmo dia

Cada dia útil pode ter a edição da **manhã** (07h15, `radar_AAAA-MM-DD.json`) e a **atualização do meio-dia** (12h30, `radar_AAAA-MM-DD_1230.json`, com `edicao.tipo: "atualizacao_meio_dia"`). As duas ficam salvas. A tela Hoje mostra o **dia completo**, que junta as edições em ordem de `gerado_em`. No Histórico dá para abrir cada edição sozinha, sem fusão.

**Notícias e destaques.** O app monta uma lista única com os itens de todas as edições do dia. Um item de uma edição posterior é **a mesma notícia** que um item anterior quando vale a primeira regra abaixo, em ordem de prioridade:

1. o `atualiza_id` de um é o `id` do outro;
2. os dois têm o mesmo `id`;
3. têm alguma URL em comum nas `fontes`. A URL é comparada normalizada: minúsculas, sem `http(s)://`, sem `www.`, sem `?…` nem `#…` e sem barra final;
4. os títulos são muito parecidos **e** a editoria é a mesma (a do campo `editoria` ou a deduzida da `categoria`; uma notícia nova em `mercados` casa com a mesma notícia antiga de categoria `mercado`). A semelhança é o índice de Jaccard ≥ 0,6 sobre as palavras do título, comparadas em minúsculas, sem acento, sem palavras vazias do português (de, a, o, para…) e mantendo os números. O limiar fica na constante `LIMIAR_TITULO` em `src/lib/noticias.ts`.

Quando é a mesma notícia:

- o app mostra a versão mais recente;
- junta as fontes sem repetir URL;
- guarda a hora da primeira aparição;
- põe o selo **"Atualizada às HHhMM"**, com a hora de `atualizado_em` ou, sem ela, a hora da edição;
- deixa as versões anteriores num "Versão das HHhMM" recolhido.

Notícias que só aparecem numa edição posterior recebem **"Nova · HHhMM"**.

A hora de cada item é `hora`; sem ela, a do `gerado_em` da edição; sem ele, 07h15. A ordem é destaques primeiro e, dentro de cada grupo, os mais recentes no topo. Se o mesmo assunto mudou de destaque para notícia (ou o contrário), vale a classificação da edição mais recente.

**Textos.** Termômetro, Leitura do dia e leituras de seção mostram o texto da edição mais recente que trouxer cada um, com "atualizado às HHhMM" e um link "ver da manhã". As `limitacoes` aparecem separadas por edição.

**Cotações.** A fusão é por `id`, campo a campo; vale a edição mais recente. Um `null` na edição nova **não apaga** um valor verificado de uma edição anterior: o app mantém o valor antigo e mostra de quando ele é ("valor de 20/10, manhã 07h15"). Itens que só existem na edição da manhã continuam aparecendo. O histórico e os gráficos usam **só fechamentos** (itens sem `hora_ref`). O valor intradiário de hoje aparece no gráfico do ativo como um ponto à parte, ligado por uma linha tracejada.

Arquivos antigos, sem nenhum desses campos, continuam funcionando: viram a edição da manhã.

## Regra de "dado antigo"

O último pregão esperado é o **dia útil anterior** a `edicao.data` (segunda olha sexta; feriados não são considerados). Uma cotação ou item agro com `data_ref` **anterior** a esse dia recebe o selo "dado de DD/MM". Itens com `periodo` ou sem `data_ref` não são marcados. Um valor **intradiário** (com `hora_ref`) só vale no próprio dia: se o `data_ref` for anterior a `edicao.data`, ele é marcado como antigo.

## Erros de validação

Quando o arquivo é inválido, o app aponta o caminho do campo, por exemplo:

```
edicao.data: campo obrigatório ausente
cotacoes[3].valor: esperado número, veio texto
agenda[0].data: data inválida (use AAAA-MM-DD) (veio "16/10/2026")
destaques[0].fontes[0].nota: nota máxima é 5 (veio "7")
```

Os índices começam em 0: `cotacoes[3]` é a quarta cotação da lista.
