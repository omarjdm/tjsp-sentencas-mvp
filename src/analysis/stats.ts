import "dotenv/config";
import { openDb } from "../db";

function agentLog(runId: string, hypothesisId: string, location: string, message: string, data: Record<string, unknown>) {
  fetch("http://127.0.0.1:7710/ingest/29c78868-1f8b-447e-ae6f-d5ec1f570675", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "302f81",
    },
    body: JSON.stringify({
      sessionId: "302f81",
      runId,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}

export function runStats() {
  // #region agent log
  agentLog("pre-fix", "H1", "src/analysis/stats.ts:26", "stats run started", {
    envDbPathDefined: Boolean(process.env.DB_PATH),
    envDbPathValue: process.env.DB_PATH ?? null,
  });
  // #endregion

  const db = openDb();

  const total = db.prepare("SELECT COUNT(*) as c FROM decisions").get() as { c: number };
  // #region agent log
  agentLog("pre-fix", "H3", "src/analysis/stats.ts:37", "total rows in decisions before grouped stats", {
    totalRows: total.c,
  });
  // #endregion

  console.log(`DB_PATH efetivo: ${process.env.DB_PATH ?? "data/dev.db"}`);
  console.log(`Total de decisões: ${total.c}`);

  if (total.c === 0) {
    console.log(
      "Sem dados para estatística. Execute o scraper com filtros que retornem resultados e rode o stats novamente.",
    );
    return;
  }

  // resumo por juiz e label
  const rows = db.prepare(`
    SELECT
      judge_name,
      outcome_label,
      COUNT(*) as n
    FROM decisions
    GROUP BY judge_name, outcome_label
    ORDER BY judge_name, n DESC
  `).all();

  // #region agent log
  agentLog("pre-fix", "H4", "src/analysis/stats.ts:53", "grouped stats generated", {
    groupedRows: rows.length,
  });
  // #endregion

  console.table(rows);

  const byLabel = db.prepare(`
    SELECT outcome_label, COUNT(*) as n
    FROM decisions
    GROUP BY outcome_label
    ORDER BY n DESC
  `).all();
  console.log("Resumo por label:");
  console.table(byLabel);
}

runStats();