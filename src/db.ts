import Database from "better-sqlite3";

export type OutcomeLabel =
  | "PROCEDENTE"
  | "IMPROCEDENTE"
  | "PARCIAL"
  | "EXTINCAO_SEM_MERITO"
  | "HOMOLOGACAO"
  | "OUTRO";

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

export function openDb(path = process.env.DB_PATH ?? "data/dev.db"): InstanceType<typeof Database> {
  // #region agent log
  agentLog("pre-fix", "H1", "src/db.ts:31", "openDb called", {
    pathArg: path,
    envDbPath: process.env.DB_PATH ?? null,
  });
  // #endregion

  const db = new Database(path);
  db.pragma("journal_mode = WAL");

  // #region agent log
  agentLog("pre-fix", "H2", "src/db.ts:40", "executing schema reset block", {
    operation: "CREATE_IF_NOT_EXISTS_ONLY",
  });
  // #endregion

  db.exec(`
    CREATE TABLE IF NOT EXISTS decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_url TEXT,
      process_number TEXT UNIQUE,
      judge_name TEXT,
      court_unit TEXT,
      decision_date TEXT,
      outcome_label TEXT,
      outcome_excerpt TEXT,
      pdf_path TEXT,
      text_len INTEGER,
      has_text INTEGER,
      fetched_at TEXT DEFAULT (datetime('now'))
    );
  `);

  return db;
}
