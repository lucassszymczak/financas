# Instruções para a rotina: cotações amplas no JSON

Este texto é para **acrescentar** ao prompt da rotina que gera o `radar_AAAA-MM-DD.json`. Ele não muda o Radar diário nem o semanal: o texto, os destaques, o termômetro, as leituras e as listas `cotacoes` e `agro` continuam como estão. Ele só acrescenta ao JSON um bloco novo, `cotacoes_amplas`, com muitos mais ativos para a busca e o Mercado do app.

Copie a partir da linha abaixo.

---

## Bloco adicional do JSON: `cotacoes_amplas`

Além de tudo o que você já gera (sem mudar nada do Radar diário/semanal, do texto, de `cotacoes` e de `agro`), inclua no JSON o bloco `cotacoes_amplas` com as cotações do **último pregão** de um universo amplo de ativos. Esse bloco serve só para consulta no app (busca, Mercado e histórico): **não comente esses ativos no texto do Radar** e não os coloque em `cotacoes`, a não ser que já fossem para lá.

### Formato

```json
"cotacoes_amplas": {
  "data_ref": "AAAA-MM-DD",
  "fonte": "fonte principal usada",
  "nota_fonte": 4.5,
  "itens": [
    {"id": "WEGE3", "nome": "WEG ON", "grupo": "acoes_ibov", "setor": "Bens industriais",
     "valor": 41.20, "unidade": "R$", "variacao_pct": 0.8,
     "abertura": 40.90, "maxima": 41.50, "minima": 40.70, "fechamento_anterior": 40.87,
     "volume_financeiro": 612000000,
     "var_semana_pct": 1.2, "var_mes_pct": 3.1, "var_ano_pct": -5.4, "var_12m_pct": -2.2,
     "minima_52s": 35.10, "maxima_52s": 48.90}
  ]
}
```

Regras:

1. **Obrigatórios por item:** `id`, `grupo`, `valor`, `unidade` e `variacao_pct` (ou `variacao_pb` para juros). O `nome` é recomendado. Os demais campos são opcionais: inclua os que conseguir verificar.
2. **Nunca invente números.** Se não conseguir verificar um campo, use `null` ou omita o campo. Se um ativo inteiro não puder ser verificado, deixe-o fora da lista. Registre lacunas relevantes em `limitacoes`.
3. **Números em formato JSON:** ponto decimal, sem separador de milhar, sem "R$" e sem "%" (`41.2`, não `"41,20"`). Variações em pontos percentuais (`-1.29` = −1,29%). `volume_financeiro` em reais (`612000000`).
4. **Datas:** `data_ref` do bloco = data do último pregão. Se um item for de outra data (cripto do dia, bolsa da Ásia da madrugada, dado semanal), coloque `data_ref` no próprio item. Para dado semanal, use também `periodo` (ex.: `"05 a 09/10"`).
5. **Ids estáveis:** use sempre o mesmo `id` para o mesmo ativo em todos os dias, porque é ele que liga o histórico. Para ações, FIIs, BDRs e ETFs, use o código de negociação (`PETR4`, `MXRF11`). Para os demais, use os ids da tabela abaixo.
6. **Sem duplicar:** se um ativo já está em `cotacoes` ou `agro`, não precisa repeti-lo aqui (se repetir, o app usa o de `cotacoes`).
7. **Unidades:** `"R$"` para ações, FIIs, BDRs e ETFs; `"pts"` para índices; `"% a.a."` para juros (com `variacao_pb`); para moedas e commodities, a unidade de cotação (`"R$"`, `"US$"`, `"US$/barril"`, `"US$/onça"`, `"US$/bu"`, `"R$/sc 60 kg"`, `"R$/@"`).

### Universo a cobrir (o máximo que conseguir verificar)

| Grupo (`grupo`) | O que incluir | Ids |
|---|---|---|
| `acoes_ibov` | **Todas** as ações da carteira teórica **vigente** do Ibovespa, com `setor` | código de negociação |
| `acoes_outras` | Outras ações líquidas fora do Ibovespa que aparecerem nas notícias do dia | código de negociação |
| `indices_br` | Ibovespa, IBrX 100, IBrX 50, Small Caps, Dividendos, IFIX, Mid-Large Cap | `IBOV`, `IBXX`, `IBXL`, `SMLL`, `IDIV`, `IFIX`, `MLCX` |
| `indices_setoriais` | Financeiro, Imobiliário, Energia Elétrica, Consumo, Materiais Básicos, Industrial, Utilidade Pública, Agronegócio | `IFNC`, `IMOB`, `IEEX`, `ICON`, `IMAT`, `INDX`, `UTIL`, `IAGRO` |
| `fiis` | Os 20 maiores FIIs do IFIX por participação | código de negociação |
| `etfs` | BOVA11, SMAL11, IVVB11, HASH11, DIVO11 e outros líquidos | código de negociação |
| `bdrs` | BDRs mais negociados (Apple, Microsoft, Nvidia, Amazon, Alphabet, Meta, Tesla etc.) | código de negociação (`AAPL34`…) |
| `indices_mundo` | S&P 500, Nasdaq 100, Dow Jones, Russell 2000, VIX, Stoxx 600, DAX, FTSE 100, CAC 40, Nikkei 225, Hang Seng, Xangai, Kospi, ASX 200, Merval, IPC México | `SPX`, `NDX`, `DJI`, `RUT`, `VIX`, `SXXP`, `DAX`, `UKX`, `CAC`, `N225`, `HSI`, `SSEC`, `KOSPI`, `AS51`, `MERVAL`, `MEXBOL` |
| `moedas` | Dólar comercial e turismo, euro, libra, iene, yuan, peso argentino (em R$) | `USDBRL`, `USDBRLT`, `EURBRL`, `GBPBRL`, `JPYBRL`, `CNYBRL`, `ARSBRL` |
| `moedas_mundo` | DXY e pares globais | `DXY`, `EURUSD`, `USDJPY`, `USDCNY`, `USDMXN` |
| `curva_di` | Vértices do DI futuro (jan de cada ano disponível) | `DI1F27`, `DI1F28`, … `DI1F35` |
| `tesouro` | Taxas de compra do Tesouro Direto | `TESOURO_PRE_AAAA`, `TESOURO_IPCA_AAAA`, `TESOURO_SELIC_AAAA` |
| `juros_mundo` | Treasuries 2, 5, 10 e 30 anos; Bund 10 anos | `UST2`, `UST5`, `UST10`, `UST30`, `BUND10` |
| `commodities_energia` | Brent, WTI, gás natural | `BRENT`, `WTI`, `NATGAS` |
| `commodities_metais` | Ouro, prata, cobre, minério de ferro 62% | `OURO`, `PRATA`, `COBRE`, `MINERIO` |
| `commodities_agricolas` | Soja, milho, trigo, café, açúcar, algodão, boi (CBOT/ICE/B3) | `SOJA_CBOT`, `MILHO_CBOT`, `TRIGO_CBOT`, `CAFE_ICE`, `ACUCAR_ICE`, `ALGODAO_ICE`, `BOI_B3_<mês><ano>` |
| `cripto` | Bitcoin e Ethereum em R$ | `BTC`, `ETH` |

Mantenha o arquivo enxuto: uma linha por ativo, sem textos explicativos dentro dos itens. Algumas centenas de itens são normais (ficam abaixo de 100 KB).

### Checagem antes de entregar

- O JSON continua válido e com todas as seções de antes.
- `cotacoes_amplas.itens` não tem `id` repetido.
- Nenhum número foi estimado ou "puxado" de memória: tudo veio de fonte do dia, ou ficou `null`/fora da lista.
