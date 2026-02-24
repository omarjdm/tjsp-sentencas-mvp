# Contexto para novo chat

**Como usar:** Abra um novo chat no Cursor, mencione este projeto (`@tjsp-sentencas-mvp`) ou cole o conteúdo abaixo para dar contexto ao assistente.

**Atalho rápido (cole no chat):**
```
Projeto: tjsp-sentencas-mvp — scraper TJSP CJPG (Playwright + SQLite) + frontend web.
Stack: Node/TS, playwright, better-sqlite3, pdf-parse, express.
Comandos: npm run dev (frontend), npm run scrape, npm run process, npm run test:e2e.
Config: .env (DATE_FROM, DATE_TO, JUIZ, DB_PATH).
```

---

## Projeto: TJSP Sentenças MVP

Scraper de decisões do TJSP (Consulta de Julgados de 1º Grau - CJPG) que:
1. Preenche formulário no e-SAJ (período + magistrado)
2. Coleta links das decisões
3. Baixa PDFs
4. Extrai texto, metadados (Classe, Assunto, Vara, Data, Requerente, Requerido), identifica dispositivo, classifica resultado (PROCEDENTE, IMPROCEDENTE, PARCIAL, etc.)
5. Persiste em SQLite

**Frontend:** Formulário (data início/fim, juiz, qtd PDFs) → executa scraper → tabela com resultados. Carrega decisões do banco ao abrir a página.

**Stack:** Node.js 18+, TypeScript, Playwright (Chromium), better-sqlite3, pdf-parse, express, dotenv.

---

## Estrutura principal

```
src/
├── index.ts              # Entry point CLI → chama scraper
├── server.ts             # Express: GET /, POST /api/run, GET /api/decisions
├── scraper.ts            # Lógica Playwright (formulário, PDFs, insert)
├── db.ts                 # SQLite + schema decisions + migração colunas
├── lib/extractOutcome.ts # Classificação heurística (resultado)
├── analysis/
│   ├── extractMetadata.ts  # Extrai Classe, Assunto, Vara, Data, Requerente, Requerido
│   ├── findDispositivo.ts  # Recorta trecho decisório
│   ├── processAllPdfs.ts   # Processa PDFs em lote (sem scraper)
│   └── stats.ts           # Estatísticas agregadas
├── pdf/
│   ├── extractText.ts       # Extração de texto de PDF
│   └── testMetadataExtract.ts  # Testa extração de metadados em um PDF
├── parse/outcome.ts     # Re-export extractOutcome
public/
└── index.html           # Frontend (formulário + tabela)
scripts/
└── e2e-test.ts          # Teste E2E (servidor + API)
```

---

## Comandos

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor web em http://localhost:3000 (frontend + API) |
| `npm run scrape` | Executa scraper (TJSP CJPG) |
| `npm run process` | Processa todos os PDFs em `runs/raw/` e insere no DB |
| `npm run test:e2e` | Teste E2E (servidor + API, sem scraper real) |
| `npm run test:e2e:full` | Teste E2E completo (inclui scraper real, ~1 min) |
| `npm run test:metadata` | Testa extração de metadados em um PDF |
| `npx ts-node src/analysis/stats.ts` | Exibe estatísticas por juiz/label |

---

## Variáveis de ambiente (.env)

- `TJSP_CJPG_URL` — URL da consulta (https://esaj.tjsp.jus.br/cjpg/)
- `DATE_FROM` / `DATE_TO` — Período (DD/MM/YYYY)
- `JUIZ` — Nome do magistrado
- `DB_PATH` — Caminho do SQLite (padrão: ./data/sentencas.db)
- `HEADLESS` — true/false (browser visível)
- `MAX_RESULTS` — Limite de PDFs por execução
- `PLAYWRIGHT_BROWSERS_PATH` — ./.playwright (Apple Silicon)

---

## Banco de dados

Tabela `decisions`: source_url, process_number (UNIQUE), judge_name, court_unit, decision_date, outcome_label, outcome_excerpt, pdf_path, text_len, has_text, classe, assunto, requerente, requerido, fetched_at.

---

## API

- `GET /` — Página do frontend
- `POST /api/run` — body: `{ dateFrom, dateTo, juiz, maxPdfs }` — executa scraper
- `GET /api/decisions` — lista decisões do banco (últimas 500)

---

## Observações

- O scraper usa `waitForSelector` após o submit para aguardar a resposta da consulta (navegação pode demorar).
- O `openDb()` usa `CREATE TABLE IF NOT EXISTS` e migração para adicionar colunas (classe, assunto, requerente, requerido).
- `extractMetadata.ts` extrai metadados do cabeçalho dos PDFs (formato TJSP: "Classe - Assunto", Requerente/Requerido ou Autor/Executado).
- Após alterações no código do servidor, reinicie `npm run dev` para carregar as mudanças.
- Repositório: https://github.com/omarjdm/tjsp-sentencas-mvp
