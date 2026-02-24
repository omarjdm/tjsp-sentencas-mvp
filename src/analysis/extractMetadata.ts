/**
 * Extrai metadados (Classe, Assunto, Vara, Data da sentença) do texto de PDFs do TJSP.
 * Os metadados costumam aparecer no início do documento (primeiras 1-2 páginas).
 * Formato típico: "Classe - Assunto\tClasseValue - AssuntoValue"
 */

export interface ExtractedMetadata {
  classe: string;
  assunto: string;
  vara: string;
  decisionDate: string;
  requerente: string;
  requerido: string;
}

const MESES: Record<string, string> = {
  janeiro: "01", fevereiro: "02", março: "03", marco: "03", abril: "04",
  maio: "05", junho: "06", julho: "07", agosto: "08", setembro: "09",
  outubro: "10", novembro: "11", dezembro: "12",
};

function extractWithRegex(
  text: string,
  patterns: RegExp[],
  groupIndex = 1
): string {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\s+/g, " ");
  for (const re of patterns) {
    const m = normalized.match(re);
    if (m && m[groupIndex]) {
      return m[groupIndex].trim();
    }
  }
  return "";
}

function parseDataExtenso(str: string): string {
  const m = str.match(/(\d{1,2})\s+de\s+(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(\d{4})/i);
  if (!m) return "";
  const dia = m[1].padStart(2, "0");
  const mes = MESES[m[2].toLowerCase()] || "";
  return `${dia}/${mes}/${m[3]}`;
}

export function extractMetadata(text: string): ExtractedMetadata {
  const header = text.slice(0, 2500);
  const fullText = text.replace(/\r\n/g, "\n");

  // Classe - Assunto: Value (formato TJSP - valor pode ser "ClasseValue - AssuntoValue")
  const classeAssuntoRaw = extractWithRegex(header, [
    /Classe\s*[-–]\s*Assunto\s*:?\s*([^\n]+?)(?=\s*Autor:|\s*Requerente:|\s*Executado:)/i,
    /Classe\s*[-–]\s*Assunto\s*:?\s*([^\n]+)/i,
  ]);

  let classe = "";
  let assunto = "";
  if (classeAssuntoRaw) {
    const parts = classeAssuntoRaw.split(/\s+-\s+/);
    if (parts.length >= 2) {
      classe = parts[0].trim();
      assunto = parts.slice(1).join(" - ").trim();
    } else {
      assunto = classeAssuntoRaw;
    }
  }

  // Vara: linha do cabeçalho tipo "3ª VARA CÍVEL" ou "5ª VARA DAS EXECUÇÕES CRIMINAIS" (parar antes de endereço)
  const vara = extractWithRegex(header, [
    /(\dª?\s*VARA\s+[A-ZÀ-Ú\s]+?)(?=\s*RUA|\s*AVENIDA|\s*Horário|\s*Processo)/i,
    /(\dª?\s*VARA\s+[A-ZÀ-Ú\s]+)/i,
  ]);

  // Data: "Cidade, DD de mês de YYYY" no final do documento, ou DD/MM/YYYY
  let decisionDate = extractWithRegex(fullText, [
    /Data\s+(?:da\s+)?[Ss]enten[çc]a\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
    /Data\s+(?:do\s+)?[Jj]ulgamento\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
  ]);
  if (!decisionDate) {
    const dataExtenso = fullText.match(/[A-Za-zÀ-ú\s]+,\s*(\d{1,2}\s+de\s+(?:janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+\d{4})\.?\s*(?:\n|$)/);
    if (dataExtenso) {
      decisionDate = parseDataExtenso(dataExtenso[1]);
    }
  }
  if (!decisionDate) {
    decisionDate = extractWithRegex(fullText, [
      /(\d{2}\/\d{2}\/\d{4})\s*(?:[-–]\s*)?(?:SENTEN[ÇC]A|senten[çc]a)/i,
    ]);
  }

  // Requerente: cível | Autor: criminal
  const requerente = extractWithRegex(header, [
    /Requerente\s*:?\s*([^\n]+?)(?=\s*Requerido:|\s*Juiz|$)/i,
    /Autor\s*:?\s*([^\n]+?)(?=\s*Executado:|\s*Juiz|$)/i,
  ]);

  // Requerido: cível | Executado: criminal
  const requerido = extractWithRegex(header, [
    /Requerido\s*:?\s*([^\n]+?)(?=\s*Juiz|$)/i,
    /Executado\s*:?\s*([^\n]+?)(?=\s*Juiz|$)/i,
  ]);

  return {
    classe,
    assunto,
    vara,
    decisionDate,
    requerente,
    requerido,
  };
}
