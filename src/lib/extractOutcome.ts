import type { OutcomeLabel } from "../db";

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Heurística inicial (MVP). Você vai evoluir depois.
 * A função devolve: label + um trecho que justifica.
 */
export function extractOutcome(text: string): { label: OutcomeLabel; excerpt: string } {
  const t = norm(text);

  // Pegue uma janela do "dispositivo" se existir marcador típico
  const markers = [
    "ante o exposto",
    "isso posto",
    "diante do exposto",
    "pelo exposto",
    "dispositivo",
  ];

  let excerpt = text.slice(0, 2000);
  for (const m of markers) {
    const idx = t.indexOf(m);
    if (idx >= 0) {
      // tenta recortar a partir do marcador no texto original (aproximação)
      const approx = Math.max(0, Math.min(text.length - 1, idx));
      excerpt = text.slice(approx, approx + 2500);
      break;
    }
  }

  // Classificação simples
  if (t.includes("julgo improcedente") || t.includes("improcedente o pedido")) {
    return { label: "IMPROCEDENTE", excerpt: excerpt.slice(0, 800) };
  }
  if (t.includes("julgo procedente") && (t.includes("em parte") || t.includes("parcialmente"))) {
    return { label: "PARCIAL", excerpt: excerpt.slice(0, 800) };
  }
  if (t.includes("julgo procedente") || t.includes("procedente o pedido")) {
    return { label: "PROCEDENTE", excerpt: excerpt.slice(0, 800) };
  }
  if (
    t.includes("extingo o processo sem resolucao de merito") ||
    t.includes("sem resolucao do merito") ||
    t.includes("art. 485")
  ) {
    return { label: "EXTINCAO_SEM_MERITO", excerpt: excerpt.slice(0, 800) };
  }
  if (t.includes("homologo") && (t.includes("acordo") || t.includes("desistencia") || t.includes("transacao"))) {
    return { label: "HOMOLOGACAO", excerpt: excerpt.slice(0, 800) };
  }

  return { label: "OUTRO", excerpt: excerpt.slice(0, 800) };
}
