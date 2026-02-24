import { extractTextFromPdf } from "./extractText";
import { extractDispositivoWindow } from "../analysis/findDispositivo";

async function run() {
  const text = await extractTextFromPdf("runs/raw/1002143-63.2020.8.26.0609.pdf");
  console.log("Tamanho do texto:", text.length);
  console.log(text.slice(0, 500));

  const dispositivo = extractDispositivoWindow(text);
  console.log("DISPOSITIVO:", dispositivo.slice(0, 800));
}

run().catch(console.error);