# Prompt para documentação do projeto TJSP Sentenças MVP

Copie o texto abaixo e envie para o ChatGPT para gerar a documentação completa do projeto.

---

## Instruções para o ChatGPT

Você é um redator técnico especializado em documentação de software. Crie a documentação completa do projeto **TJSP Sentenças MVP**, conforme especificado abaixo.

### Sobre o projeto

O **TJSP Sentenças MVP** é um scraper em Node.js/TypeScript que:
1. Acessa a página de Consulta de Julgados de 1º Grau (CJPG) do portal e-SAJ do Tribunal de Justiça de São Paulo (TJSP)
2. Preenche o formulário com período (datas) e nome do magistrado
3. Coleta os links das decisões retornadas
4. Baixa os PDFs das sentenças
5. Extrai o texto dos PDFs
6. Identifica o trecho do "dispositivo" (parte decisória)
7. Classifica o resultado em categorias: PROCEDENTE, IMPROCEDENTE, PARCIAL, EXTINÇÃO SEM MÉRITO, HOMOLOGAÇÃO, OUTRO
8. Persiste tudo em banco SQLite

**Stack:** Node.js 18+, TypeScript, Playwright (Chromium), better-sqlite3, pdf-parse, dotenv.

### Estrutura do projeto

```
tjsp-sentencas-mvp/
├── src/
│   ├── index.ts              # Ponto de entrada
│   ├── scraper.ts            # Lógica principal de scraping (Playwright)
│   ├── db.ts                 # Conexão e schema SQLite
│   ├── lib/extractOutcome.ts # Heurísticas de classificação de resultado
│   ├── parse/outcome.ts      # Re-export do extractOutcome
│   ├── pdf/extractText.ts    # Extração de texto de PDF
│   ├── pdf/testExtract.ts    # Script de teste de extração
│   └── analysis/
│       ├── findDispositivo.ts # Identificação do trecho decisório
│       └── stats.ts           # Estatísticas agregadas do banco
├── data/                     # Banco SQLite (dev.db, sentencas.db)
├── runs/raw/                 # PDFs baixados
├── .env.example              # Template de variáveis de ambiente
├── package.json
└── tsconfig.json
```

### Entregáveis solicitados

#### 1. Documento Word (.doc ou .docx)

Crie um documento Word com as seguintes seções:

1. **Capa** – Nome do projeto, versão, data
2. **Sumário**
3. **Introdução** – Objetivo do projeto, público-alvo, contexto (TJSP, CJPG, e-SAJ)
4. **Requisitos** – Node.js, Playwright, dependências
5. **Instalação** – Passo a passo (clone, npm install, playwright install)
6. **Configuração** – Variáveis de ambiente (.env) com descrição de cada uma
7. **Uso** – Comandos principais (scrape, stats) com exemplos
8. **Arquitetura** – Fluxo do scraper (diagrama em texto ou descrição), módulos e responsabilidades
9. **Schema do banco** – Tabela `decisions` com colunas e tipos
10. **Classificação de resultados** – Explicação das categorias (PROCEDENTE, IMPROCEDENTE, etc.) e como são detectadas
11. **Estrutura de pastas** – Árvore comentada
12. **Solução de problemas** – Erros comuns (ex.: "Nenhum resultado encontrado", variáveis de ambiente faltando)
13. **Referências** – Links úteis (e-SAJ TJSP, CJPG)

Formato: texto profissional, linguagem clara, seções numeradas. Use tabelas onde fizer sentido (ex.: variáveis de ambiente, schema).

#### 2. Imagens para incluir na documentação

Sugira ou descreva as imagens que devem ser criadas (você pode gerar descrições detalhadas para ferramentas de geração de imagens, ou indicar screenshots que o usuário deve capturar):

- **Figura 1 – Fluxo do scraper** – Diagrama de fluxo (formulário → busca → PDFs → extração → classificação → SQLite). Pode ser um diagrama Mermaid ou descrição para desenho em draw.io/Lucidchart.
- **Figura 2 – Tela do CJPG** – Descrição para screenshot: "Página de consulta do CJPG com campos Magistrado, Data inicial, Data final e botão Consultar."
- **Figura 3 – Exemplo de resultado** – Descrição: "Lista de decisões com links 'Visualizar Inteiro Teor'."
- **Figura 4 – Estrutura do banco** – Diagrama ER simples: tabela `decisions` com as colunas principais.
- **Figura 5 – Saída do stats** – Descrição: "Exemplo de saída do comando stats (tabela por juiz/label e resumo por label)."

Para cada imagem, forneça:
- Título sugerido
- Descrição detalhada (para geração por IA ou para o usuário capturar)
- Legenda sugerida para o documento

### Formato de entrega

- O documento Word deve estar pronto para ser salvo como `.doc` ou `.docx`.
- As imagens podem ser descrições em markdown ou código Mermaid que o usuário pode converter em PNG/SVG.
- Inclua um índice de figuras no final do documento.

### Tom e estilo

- Linguagem técnica mas acessível
- Português brasileiro
- Evitar jargões desnecessários; explicar termos jurídicos quando usado (ex.: "dispositivo", "improcedente")

---
