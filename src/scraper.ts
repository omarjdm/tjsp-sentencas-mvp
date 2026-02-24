import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

import { openDb } from "./db";
import { extractOutcome } from "./parse/outcome";
import { extractTextFromPdf } from "./pdf/extractText";
import { extractDispositivoWindow } from "./analysis/findDispositivo";

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

// =============================
// TIPOS
// =============================
export interface ScraperParams {
  dateFrom: string;
  dateTo: string;
  juiz: string;
  maxPdfs: number;
}

export interface DecisionRow {
  process_number: string;
  judge_name: string;
  outcome_label: string;
  outcome_excerpt: string;
}

export interface ScraperResult {
  downloaded: number;
  processed: number;
  decisions: DecisionRow[];
}

// =============================
// VARIÁVEIS DE AMBIENTE
// =============================
const CJPG_URL = process.env.TJSP_CJPG_URL!;
const HEADLESS = (process.env.HEADLESS ?? "false") === "true";
const SLOW_MO_MS = Number(process.env.SLOW_MO_MS ?? "0");
const MAX_RESULTS_ENV = Number(process.env.MAX_RESULTS ?? "30");

// =============================
// FUNÇÃO PARA VALIDAR ENV
// =============================
function requireEnv(name: string, v?: string) {
  if (!v) throw new Error(`Missing env var: ${name}`);
}

export async function main(params?: ScraperParams): Promise<ScraperResult> {
  // #region agent log
  agentLog("pre-fix-2", "H5", "src/scraper.ts:51", "scraper start", {
    dbPath: process.env.DB_PATH ?? null,
    maxResultsEnv: process.env.MAX_RESULTS ?? null,
    headlessEnv: process.env.HEADLESS ?? null,
  });
  // #endregion

  const DATE_FROM = params?.dateFrom ?? process.env.DATE_FROM!;
  const DATE_TO = params?.dateTo ?? process.env.DATE_TO!;
  const JUIZ = params?.juiz ?? process.env.JUIZ!;
  const maxPdfs = params?.maxPdfs ?? MAX_RESULTS_ENV;

  // =============================
  // VALIDAÇÃO DE VARIÁVEIS
  // =============================
  requireEnv("TJSP_CJPG_URL", CJPG_URL);
  requireEnv("DATE_FROM", DATE_FROM);
  requireEnv("DATE_TO", DATE_TO);
  requireEnv("JUIZ", JUIZ);

  const decisions: DecisionRow[] = [];

  // =============================
  // INICIALIZA BANCO
  // =============================
  const db = openDb();

  const insert = db.prepare(`
    INSERT OR REPLACE INTO decisions
      (source_url, process_number, judge_name, court_unit, decision_date, outcome_label, outcome_excerpt, pdf_path, text_len, has_text)
    VALUES
      (@source_url, @process_number, @judge_name, @court_unit, @decision_date, @outcome_label, @outcome_excerpt, @pdf_path, @text_len, @has_text)
  `);

  // =============================
  // INICIALIZA NAVEGADOR
  // =============================
  const browser = await chromium.launch({
    headless: HEADLESS,
    slowMo: SLOW_MO_MS,
  });

  const page = await browser.newPage();

  // =============================
  // ABRE PÁGINA DE BUSCA
  // =============================
  await page.goto(CJPG_URL, { waitUntil: "domcontentloaded" });

  // =============================
  // PREENCHIMENTO DO FORMULÁRIO
  // =============================

  // Preenche data inicial
  await page.locator('#iddadosConsulta\\.dtInicio').fill(DATE_FROM);

  // Preenche data final
  await page.locator('#iddadosConsulta\\.dtFim').fill(DATE_TO);

  // Preenche nome do magistrado
  await page.locator("#nmAgente").fill(JUIZ);

  // Dispara evento blur para o e-SAJ validar o campo
  await page.locator("#nmAgente").press("Tab");
  await new Promise((r) => setTimeout(r, 2000));

  // #region agent log
  const judgeAfterTab = await page.locator("#nmAgente").inputValue().catch(() => null);
  const autocompleteVisible = await page.locator(".ui-autocomplete, [role=listbox], .autocomplete-item, ul[id*='nmAgente']").count();
  agentLog("debug-consulta", "C1", "src/scraper.ts:108", "after Tab on magistrado", {
    judgeValueAfterTab: judgeAfterTab,
    judgeLength: judgeAfterTab?.length ?? 0,
    autocompleteElementsFound: autocompleteVisible,
    dateFrom: DATE_FROM,
    dateTo: DATE_TO,
  });
  // #endregion

  // =============================
  // ENVIA FORMULÁRIO
  // =============================
  const submitBtn = page.locator("#pbSubmit").or(page.getByRole("button", { name: /Consultar/i }));
  // #region agent log
  agentLog("pre-fix-3", "N1", "src/scraper.ts:114", "before submit click", {
    currentUrl: page.url(),
    dateFromValue: await page.locator('#iddadosConsulta\\.dtInicio').inputValue().catch(() => null),
    dateToValue: await page.locator('#iddadosConsulta\\.dtFim').inputValue().catch(() => null),
    judgeValue: await page.locator("#nmAgente").inputValue().catch(() => null),
  });
  // #endregion
  try {
    await submitBtn.first().click({ noWaitAfter: true });
    // Aguarda a resposta da consulta (navegação pode demorar; conteúdo aparece em pesquisar.do)
    await page.waitForSelector('text=/Não foi encontrado|Visualizar Inteiro Teor/', { timeout: 45000 }).catch(() => null);
    await new Promise((r) => setTimeout(r, 1500));
    // #region agent log
    agentLog("debug-consulta", "C2", "src/scraper.ts:135", "after submit and wait", {
      currentUrlAfterSubmit: page.url(),
      hasNoResultsMsg: (await page.locator("text=/Nenhum resultado|não foram encontrados/i").count()) > 0,
      hasInteiroTeor: (await page.locator('a[title="Visualizar Inteiro Teor"]').count()) > 0,
      bodyPreview: await page.locator("body").innerText().then((t) => t.slice(0, 500)).catch(() => null),
    });
    // #endregion
  } catch (error) {
    // #region agent log
    agentLog("pre-fix-3", "N2", "src/scraper.ts:134", "submit flow failed", {
      currentUrlOnError: page.url(),
      errorMessage: error instanceof Error ? error.message : String(error),
      validationText: await page.locator("body").innerText().then((t) => t.slice(0, 600)).catch(() => null),
    });
    // #endregion
    throw error;
  }

  // Espera os resultados (vários seletores de fallback - e-SAJ pode variar)
  const resultadoSelectors = [
    '#divDadosResultado',
    'a[title="Visualizar Inteiro Teor"]',
    'table.listaResultado',
    '[id*="Resultado"]',
  ];
  let resultados;
  for (const sel of resultadoSelectors) {
    try {
      await page.waitForSelector(sel, { timeout: 5000 });
      resultados = page.locator('a[title="Visualizar Inteiro Teor"]');
      if ((await resultados.count()) > 0) break;
    } catch {
      continue;
    }
  }
  if (!resultados || (await resultados.count()) === 0) {
    // #region agent log
    agentLog("pre-fix-4", "N4", "src/scraper.ts:158", "no results branch reached", {
      currentUrl: page.url(),
      inteiroTeorExactTitleCount: await page.locator('a[title="Visualizar Inteiro Teor"]').count(),
      inteiroTeorPartialTitleCount: await page.locator('a[title*="Inteiro Teor"]').count(),
      resultadoDivCount: await page.locator("#divDadosResultado").count(),
      resultadoTableCount: await page.locator("table.listaResultado").count(),
      noRecordsHintCount: await page.locator("text=/Nenhum resultado|Não foram encontrados|nenhum resultado/i").count(),
      bodySnippet: await page.locator("body").innerText().then((t) => t.slice(0, 800)).catch(() => null),
    });
    // #endregion
    const rawDir = path.join(__dirname, "..", "runs", "raw");
    if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true });
    await page.screenshot({ path: path.join(rawDir, "_debug_screenshot.png") }).catch(() => {});
    // #region agent log
    agentLog("post-fix", "N5", "src/scraper.ts:171", "no results handled gracefully", {
      action: "warn_and_exit_without_throw",
      screenshotPath: "runs/raw/_debug_screenshot.png",
    });
    // #endregion
    console.warn("Nenhum resultado encontrado. Screenshot salvo em runs/raw/_debug_screenshot.png");
    await browser.close();
    return { downloaded: 0, processed: 0, decisions: [] };
  }

  // =============================
  // CAPTURA LINKS DOS RESULTADOS
  // =============================

  const total = await resultados.count();
  console.log("Total encontrado:", total);
  // #region agent log
  agentLog("pre-fix-2", "H6", "src/scraper.ts:151", "results discovered", {
    totalFound: total,
  });
  // #endregion

  const MAX = Math.min(total, maxPdfs);

  // =============================
  // LOOP SOBRE CADA RESULTADO
  // =============================
  for (let i = 0; i < MAX; i++) {
    const item = resultados.nth(i);

    console.log("Abrindo item", i + 1);

    let pdfUrl: string | null = null;
    const pdfResolveRef: { resolve: (u: string) => void } = { resolve: () => {} };
    const pdfPromise = new Promise<string>((resolve) => {
      pdfResolveRef.resolve = resolve;
    });

    const ctx = page.context();
    const novaAbaPromise = ctx.waitForEvent("page").then((p) => {
      p.on("response", (resp) => {
        const url = resp.url();
        const ct = (resp.headers()["content-type"] || "").toLowerCase();
        if (url.includes("getPDF.do") && !url.includes("viewer.html") && (ct.includes("pdf") || ct.includes("octet-stream"))) {
          console.log("🔎 PDF capturado:", url.slice(0, 120) + "...");
          pdfResolveRef.resolve(url);
        }
      });
      return p;
    });

    await item.click();
    const novaAba = await novaAbaPromise;

    await novaAba.waitForLoadState("domcontentloaded");

    console.log("Nova aba aberta:", novaAba.url());

    // Aguarda até 25s pela URL do PDF (viewer pode demorar)
    pdfUrl = await Promise.race([
      pdfPromise,
      new Promise<null>((r) => setTimeout(() => r(null), 25000)),
    ]);

    const outDir = path.join(__dirname, "..", "runs", "raw");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    if (pdfUrl) {
      const processNumberRaw = pdfUrl.match(/nuProcesso=([^&]+)/)?.[1] ?? "";
      const nuProcesso = processNumberRaw.replace(/[^a-zA-Z0-9.-]/g, "_") || `doc_${i + 1}`;
      const outPath = path.join(outDir, `${nuProcesso}.pdf`);
      const res = await novaAba.request.get(pdfUrl);
      const buf = await res.body();
      fs.writeFileSync(outPath, buf);
      console.log("✓ PDF salvo:", outPath);

      const text = await extractTextFromPdf(outPath);
      const dispositivo = extractDispositivoWindow(text);
      const { label, excerpt } = extractOutcome(dispositivo);

      const processNumber = processNumberRaw || nuProcesso;
      insert.run({
        source_url: pdfUrl,
        process_number: processNumber,
        judge_name: JUIZ,
        court_unit: "",
        decision_date: "",
        outcome_label: label,
        outcome_excerpt: excerpt,
        pdf_path: outPath,
        text_len: text.length,
        has_text: text.length > 0 ? 1 : 0,
      });
      decisions.push({
        process_number: processNumber,
        judge_name: JUIZ,
        outcome_label: label,
        outcome_excerpt: excerpt,
      });
      // #region agent log
      agentLog("pre-fix-2", "H7", "src/scraper.ts:225", "row inserted", {
        processNumber,
        outcomeLabel: label,
        hasText: text.length > 0 ? 1 : 0,
      });
      // #endregion
      console.log("  →", label);
    } else {
      // Fallback: extrair texto do body (documentos em HTML ou viewer)
      const bodyText = await novaAba.locator("body").innerText().catch(() => "");
      if (bodyText.trim().length > 100) {
        const outPath = path.join(outDir, `documento_${i + 1}.txt`);
        fs.writeFileSync(outPath, bodyText, "utf-8");
        console.log("Texto salvo em:", outPath);
      } else {
        console.log("⚠ PDF/texto não capturado para item", i + 1);
      }
    }

    // Fecha a aba do documento
    await novaAba.close();
  }

  // =============================
  // FINALIZA
  // =============================
  await browser.close();
  const totalRows = db.prepare("SELECT COUNT(*) as c FROM decisions").get() as { c: number };
  // #region agent log
  agentLog("pre-fix-2", "H8", "src/scraper.ts:257", "scraper end with db row count", {
    totalRowsInDb: totalRows.c,
  });
  // #endregion
  console.log("Done.");
  return {
    downloaded: decisions.length,
    processed: decisions.length,
    decisions,
  };
}