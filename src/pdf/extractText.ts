import fs from "fs";
import { PDFParse } from "pdf-parse";

/**
 * Lê um PDF do disco e devolve o texto extraído (se existir).
 * Se o PDF for "imagem escaneada", o texto tende a vir vazio.
 */
export async function extractTextFromPdf(pdfPath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(pdfPath);
  const parse = new PDFParse({ data: new Uint8Array(dataBuffer) });
  try {
    const result = await parse.getText();
    return (result.text || "").trim();
  } finally {
    await parse.destroy();
  }
}