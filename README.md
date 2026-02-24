# TJSP Sentenças MVP

Scraper de decisões do TJSP (Consulta de Julgados de 1º Grau - CJPG) com extração de texto de PDFs, classificação de resultado e persistência em SQLite.

## Requisitos

- Node.js 18+
- Playwright (Chromium)

## Instalação

```bash
npm install
npx playwright install chromium
```

## Configuração

Copie `.env.example` para `.env` e preencha:

- `TJSP_CJPG_URL` - URL da consulta (padrão: https://esaj.tjsp.jus.br/cjpg/)
- `DATE_FROM` / `DATE_TO` - Período (DD/MM/YYYY)
- `JUIZ` - Nome do magistrado
- `DB_PATH` - Caminho do SQLite (padrão: ./data/sentencas.db)

## Uso

```bash
npm run scrape    # Executa o scraper
npx ts-node src/analysis/stats.ts   # Exibe estatísticas
```
