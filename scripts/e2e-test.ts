/**
 * Teste end-to-end do frontend TJSP Sentenças
 *
 * 1. Inicia o servidor em background
 * 2. Testa GET / (página HTML)
 * 3. Testa GET /api/decisions
 * 4. Testa POST /api/run com dados inválidos (400)
 * 5. [opcional] Testa POST /api/run com dados válidos (scraper real)
 *
 * Uso:
 *   npx ts-node scripts/e2e-test.ts           # testes rápidos (sem scraper real)
 *   npx ts-node scripts/e2e-test.ts --full    # inclui execução real do scraper
 */

import { spawn, ChildProcess } from "child_process";
import * as path from "path";

const PORT = Number(process.env.PORT) || 3000;
const BASE_URL = `http://localhost:${PORT}`;
const SERVER_START_TIMEOUT_MS = 15000;
const POLL_INTERVAL_MS = 300;

async function waitForServer(): Promise<boolean> {
  const deadline = Date.now() + SERVER_START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/`);
      if (res.ok) return true;
    } catch {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
  }
  return false;
}

async function runTests(fullScraper: boolean): Promise<{ passed: number; failed: number; errors: string[] }> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  // 1. GET / - deve retornar HTML
  try {
    const res = await fetch(`${BASE_URL}/`);
    const text = await res.text();
    if (res.ok && text.includes("TJSP Sentenças") && text.includes("Executar")) {
      passed++;
      console.log("✓ GET / retorna página HTML com formulário");
    } else {
      failed++;
      errors.push(`GET /: esperado HTML com formulário, got status=${res.status}`);
    }
  } catch (e) {
    failed++;
    errors.push(`GET /: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 2. GET /api/decisions - deve retornar JSON
  try {
    const res = await fetch(`${BASE_URL}/api/decisions`);
    const data = (await res.json()) as { decisions?: unknown[]; error?: string };
    if (res.ok && Array.isArray(data.decisions)) {
      passed++;
      console.log(`✓ GET /api/decisions retorna JSON (${data.decisions.length} decisões)`);
    } else if (res.ok && data.error) {
      passed++;
      console.log("✓ GET /api/decisions retorna JSON (erro do banco tratado)");
    } else {
      failed++;
      errors.push(`GET /api/decisions: status=${res.status}, body=${JSON.stringify(data).slice(0, 100)}`);
    }
  } catch (e) {
    failed++;
    errors.push(`GET /api/decisions: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 3. POST /api/run com dados inválidos - deve retornar 400
  try {
    const res = await fetch(`${BASE_URL}/api/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateFrom: "", dateTo: "", juiz: "", maxPdfs: 10 }),
    });
    const data = (await res.json()) as { error?: string };
    if (res.status === 400 && data.error) {
      passed++;
      console.log("✓ POST /api/run (inválido) retorna 400 com mensagem de erro");
    } else {
      failed++;
      errors.push(`POST /api/run inválido: esperado 400, got ${res.status}`);
    }
  } catch (e) {
    failed++;
    errors.push(`POST /api/run inválido: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 4. POST /api/run com maxPdfs inválido - deve retornar 400
  try {
    const res = await fetch(`${BASE_URL}/api/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateFrom: "01/01/2024", dateTo: "31/01/2024", juiz: "Teste", maxPdfs: 0 }),
    });
    const data = (await res.json()) as { error?: string };
    if (res.status === 400 && data.error) {
      passed++;
      console.log("✓ POST /api/run (maxPdfs=0) retorna 400");
    } else {
      failed++;
      errors.push(`POST /api/run maxPdfs=0: esperado 400, got ${res.status}`);
    }
  } catch (e) {
    failed++;
    errors.push(`POST /api/run maxPdfs=0: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 5. [opcional] POST /api/run com dados válidos - scraper real
  if (fullScraper) {
    console.log(
      "\nExecutando scraper real (pode levar 1-3 min, HEADLESS=true)..."
    );
    try {
      const res = await fetch(`${BASE_URL}/api/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateFrom: "01/01/2024",
          dateTo: "31/01/2024",
          juiz: "Luiz Henrique Lorey",
          maxPdfs: 1,
        }),
      });
      const data = (await res.json()) as {
        downloaded?: number;
        processed?: number;
        decisions?: unknown[];
        error?: string;
      };
      if (res.ok && typeof data.downloaded === "number" && typeof data.processed === "number") {
        passed++;
        console.log(
          `✓ POST /api/run (real): ${data.downloaded} baixados, ${data.processed} processados`
        );
      } else {
        failed++;
        errors.push(
          `POST /api/run real: status=${res.status}, error=${data.error ?? "unknown"}`
        );
      }
    } catch (e) {
      failed++;
      errors.push(`POST /api/run real: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { passed, failed, errors };
}

function main() {
  const fullScraper = process.argv.includes("--full");
  const projectRoot = path.join(__dirname, "..");

  let serverProcess: ChildProcess | null = null;

  const cleanup = () => {
    if (serverProcess?.pid) {
      process.kill(serverProcess.pid, "SIGTERM");
      serverProcess = null;
    }
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  (async () => {
    console.log("Iniciando servidor...");
    serverProcess = spawn("npx", ["ts-node", "src/server.ts"], {
      cwd: projectRoot,
      env: {
        ...process.env,
        PORT: String(PORT),
        PLAYWRIGHT_BROWSERS_PATH: path.join(projectRoot, ".playwright"),
        HEADLESS: "true",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    serverProcess.stdout?.on("data", (d) => process.stdout.write(d));
    serverProcess.stderr?.on("data", (d) => process.stderr.write(d));

    const ready = await waitForServer();
    if (!ready) {
      console.error("Servidor não iniciou a tempo.");
      cleanup();
      process.exit(1);
    }

    console.log("Servidor pronto. Executando testes...\n");

    const { passed, failed, errors } = await runTests(fullScraper);

    cleanup();

    console.log("\n--- Resultado ---");
    console.log(`Passou: ${passed}`);
    console.log(`Falhou: ${failed}`);
    if (errors.length > 0) {
      errors.forEach((e) => console.error("  -", e));
    }

    process.exit(failed > 0 ? 1 : 0);
  })().catch((e) => {
    console.error(e);
    cleanup();
    process.exit(1);
  });
}

main();
