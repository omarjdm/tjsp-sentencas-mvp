import "dotenv/config";
import express from "express";
import path from "path";
import { main } from "./scraper";
import { openDb } from "./db";

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());

// Serve static files from public/
app.use(express.static(path.join(__dirname, "..", "public")));

// GET / - serve index.html
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

// POST /api/run - run scraper with params
app.post("/api/run", async (req, res) => {
  const { dateFrom, dateTo, juiz, maxPdfs } = req.body;

  if (!dateFrom || !dateTo || !juiz) {
    res.status(400).json({
      error: "Campos obrigatórios: dateFrom, dateTo, juiz (formato DD/MM/YYYY)",
    });
    return;
  }

  const max = Number(maxPdfs);
  if (isNaN(max) || max < 1) {
    res.status(400).json({
      error: "maxPdfs deve ser um número maior que 0",
    });
    return;
  }

  try {
    const result = await main({
      dateFrom: String(dateFrom),
      dateTo: String(dateTo),
      juiz: String(juiz),
      maxPdfs: max,
    });
    res.json(result);
  } catch (err) {
    console.error("Scraper error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Erro ao executar scraper",
    });
  }
});

// GET /api/decisions - list decisions from DB
app.get("/api/decisions", (_req, res) => {
  try {
    const db = openDb();
    const rows = db
      .prepare(
        `SELECT process_number, judge_name, outcome_label, outcome_excerpt,
                classe, assunto, court_unit, decision_date, requerente, requerido, fetched_at
         FROM decisions
         ORDER BY fetched_at DESC
         LIMIT 500`
      )
      .all();
    res.json({ decisions: rows });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Erro ao consultar banco",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
