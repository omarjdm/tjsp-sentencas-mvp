import "dotenv/config";
import fs from "fs";
import path from "path";
import { extractTextFromPdf } from "../pdf/extractText";
import { extractDispositivoWindow } from "./findDispositivo";
import { extractOutcome } from "../parse/outcome";
import { extractMetadata } from "./extractMetadata";
import { openDb } from "../db";

async function run() {
  const db = openDb();

  const insert = db.prepare(`
    INSERT OR REPLACE INTO decisions (
      process_number,
      judge_name,
      outcome_label,
      outcome_excerpt,
      pdf_path,
      text_len,
      has_text,
      court_unit,
      decision_date,
      classe,
      assunto,
      requerente,
      requerido
    ) VALUES (
      @process_number,
      @judge_name,
      @outcome_label,
      @outcome_excerpt,
      @pdf_path,
      @text_len,
      @has_text,
      @court_unit,
      @decision_date,
      @classe,
      @assunto,
      @requerente,
      @requerido
    )
  `);

  const dir = path.join(__dirname, "..", "..", "runs", "raw");

  const files = fs.readdirSync(dir).filter(f => f.endsWith(".pdf"));

  console.log("Total de PDFs encontrados:", files.length);

  for (const file of files) {
    const fullPath = path.join(dir, file);

    console.log("Processando:", file);

    const text = await extractTextFromPdf(fullPath);

    const hasText = text.length > 500 ? 1 : 0;

    const dispositivo = extractDispositivoWindow(text);

    const { label, excerpt } = extractOutcome(dispositivo);

    const meta = extractMetadata(text);

    insert.run({
      process_number: file.replace(".pdf", ""),
      judge_name: process.env.JUIZ ?? "Desconhecido",
      outcome_label: label,
      outcome_excerpt: excerpt,
      pdf_path: fullPath,
      text_len: text.length,
      has_text: hasText,
      court_unit: meta.vara || "",
      decision_date: meta.decisionDate || "",
      classe: meta.classe || "",
      assunto: meta.assunto || "",
      requerente: meta.requerente || "",
      requerido: meta.requerido || "",
    });
  }

  console.log("Processamento concluído.");
}

run().catch(console.error);