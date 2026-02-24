# Contexto para novo chat

**Como usar:** Abra um novo chat no Cursor, mencione este projeto (`@tjsp-sentencas-mvp`) ou cole o conteúdo abaixo para dar contexto ao assistente.

**Atalho rápido (cole no chat):**
```
Projeto: tjsp-sentencas-mvp — scraper TJSP CJPG (Playwright + SQLite). 
Stack: Node/TS, playwright, better-sqlite3, pdf-parse. 
Comandos: npm run scrape, npm run process, npx ts-node src/analysis/stats.ts.
Config: .env (DATE_FROM, DATE_TO, JUIZ, DB_PATH).
```

---

## Projeto: TJSP Sentenças MVP

Scraper de decisões do TJSP (Consulta de Julgados de 1º Grau - CJPG) que:
1. Preenche formulário no e-SAJ (período + magistrado)
2. Coleta links das decisões
3. Baixa PDFs
4. Extrai texto, identifica dispositivo, classifica resultado (PROCEDENTE, IMPROCEDENTE, PARCIAL, EXTINÇÃO SEM MÉRITO, HOMOLOGAÇÃO, OUTRO)
5. Persiste em SQLite

**Stack:** Node.js 18+, TypeScript, Playwright (Chromium), better-sqlite3, pdf-parse, dotenv.

---

## Estrutura principal

```
src/
├── index.ts          # Entry point → chama scraper
├── scraper.ts        # Lógica Playwright (formulário, PDFs, insert)
├── db.ts             # SQLite + schema decisions
├── lib/extractOutcome.ts   # Classificação heurística
├── analysis/
│   ├── findDispositivo.ts  # Recorta trecho decisório
│   ├── processAllPdfs.ts  # Processa PDFs em lote (sem scraper)
│   └── stats.ts           # Estatísticas agregadas
├── pdf/extractText.ts     # Extração de texto de PDF
└── parse/outcome.ts       # Re-export extractOutcome
```

---

## Comandos

| Comando | Descrição |
|---------|-----------|
| `npm run scrape` | Executa scraper (TJSP CJPG) |
| `npm run dev` | Inicia servidor web com frontend em http://localhost:3000 |
| `npm run test:e2e` | Teste E2E (servidor + API, sem scraper real) |
| `npm run test:e2e:full` | Teste E2E completo (inclui scraper real, ~1 min) |
| `npm run process` | Processa todos os PDFs em `runs/raw/` e insere no DB |
| `npx ts-node src/analysis/stats.ts` | Exibe estatísticas por juiz/label |

---

## Variáveis de ambiente (.env)

- `TJSP_CJPG_URL` — URL da consulta (https://esaj.tjsp.jus.br/cjpg/)
- `DATE_FROM` / `DATE_TO` — Período (DD/MM/YYYY)
- `JUIZ` — Nome do magistrado
- `DB_PATH` — Caminho do SQLite (padrão: ./data/sentencas.db)
- `HEADLESS` — true/false (browser visível)
- `PLAYWRIGHT_BROWSERS_PATH` — ./.playwright (Apple Silicon)

---

## Banco de dados

Tabela `decisions`: source_url, process_number (UNIQUE), judge_name, court_unit, decision_date, outcome_label, outcome_excerpt, pdf_path, text_len, has_text, fetched_at.

---

## Observações

- O scraper usa `waitForSelector` após o submit para aguardar a resposta da consulta (navegação pode demorar).
- O `openDb()` usa `CREATE TABLE IF NOT EXISTS` (não apaga dados).
- `stats.ts` carrega `.env` e trata banco vazio com mensagem clara.
- Repositório: https://github.com/omarjdm/tjsp-sentencas-mvp
