import path from "path";
import fs from "fs";
import { extractTextFromPdf } from "./extractText";
import { extractMetadata } from "../analysis/extractMetadata";

async function run() {
  const arg = process.argv[2];
  const rawDir = path.join(__dirname, "..", "..", "runs", "raw");

  let pdfPath: string;
  if (arg) {
    pdfPath = path.isAbsolute(arg) ? arg : path.resolve(process.cwd(), arg);
  } else {
    if (!fs.existsSync(rawDir)) {
      console.error("Pasta runs/raw não existe. Execute o scraper primeiro ou informe o caminho do PDF:");
      console.error("  npx ts-node src/pdf/testMetadataExtract.ts <caminho/arquivo.pdf>");
      process.exit(1);
    }
    const files = fs.readdirSync(rawDir).filter((f) => f.endsWith(".pdf"));
    if (files.length === 0) {
      console.error("Nenhum PDF em runs/raw. Execute o scraper primeiro ou informe o caminho do PDF:");
      console.error("  npx ts-node src/pdf/testMetadataExtract.ts <caminho/arquivo.pdf>");
      process.exit(1);
    }
    pdfPath = path.join(rawDir, files[0]);
  }

  if (!fs.existsSync(pdfPath)) {
    console.error("Arquivo não encontrado:", pdfPath);
    process.exit(1);
  }

  console.log("PDF:", pdfPath);
  console.log("---");

  const text = await extractTextFromPdf(pdfPath);
  console.log("Tamanho do texto:", text.length, "caracteres\n");

  const meta = extractMetadata(text);

  console.log("Classe:", meta.classe || "(não encontrado)");
  console.log("Assunto:", meta.assunto || "(não encontrado)");
  console.log("Vara:", meta.vara || "(não encontrado)");
  console.log("Data da sentença:", meta.decisionDate || "(não encontrado)");
  console.log("Requerente:", meta.requerente || "(não encontrado)");
  console.log("Requerido:", meta.requerido || "(não encontrado)");

  if (process.env.DEBUG_META) {
    console.log("\n--- Primeiros 1200 caracteres (DEBUG_META=1) ---");
    console.log(text.slice(0, 1200));
  }
}

run().catch(console.error);
