/**
 * Tenta encontrar o trecho do dispositivo a partir de marcadores comuns.
 * Retorna um recorte do texto (janela) para facilitar classificação.
 */
export function extractDispositivoWindow(fullText: string): string {
    const text = fullText.replace(/\s+/g, " "); // normaliza espaços
  
    const markers = [
      "ante o exposto",
      "diante do exposto",
      "isso posto",
      "pelo exposto",
      "do dispositivo",
      "dispositivo",
    ];
  
    const lower = text.toLowerCase();
  
    for (const m of markers) {
      const idx = lower.indexOf(m);
      if (idx >= 0) {
        // pega um pedaço a partir do marcador (ex: 2500 caracteres)
        return text.slice(idx, idx + 2500).trim();
      }
    }
  
    // se não achou marcador, devolve o fim do texto (muitas sentenças têm dispositivo no final)
    return text.slice(Math.max(0, text.length - 2500)).trim();
  }