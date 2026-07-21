import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

import { GoogleGenAI, Type } from "@google/genai";

// AI configuration
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const BACKUP_FILE = (process.env.FUNCTIONS_EMULATOR || process.env.FUNCTION_SIGNATURE_TYPE || process.env.FIREBASE_CONFIG || process.env.FUNCTION_TARGET)
  ? "/tmp/backups.json"
  : path.join(process.cwd(), "backups.json");

// Helper to read backup file safely
function readBackups() {
  try {
    if (fs.existsSync(BACKUP_FILE)) {
      const data = fs.readFileSync(BACKUP_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading backups file:", err);
  }
  return {};
}

// Helper to write backup file safely
function writeBackups(backups: any) {
  try {
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(backups, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing backups file:", err);
  }
}

export async function createExpressApp() {
  const app = express();

  // Middleware for parsing JSON with a 15mb limit to allow complete system backups
  app.use(express.json({ limit: "15mb" }));

  // Enable CORS manually or generic header configuration
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // --- API ROUTES ---

  // POST /api/gemini/import-schedule
  app.post("/api/gemini/import-schedule", async (req, res) => {
    try {
      const { image, mimeType } = req.body;

      if (!image || !mimeType) {
        return res.status(400).json({ error: "Imagem e mimeType são obrigatórios." });
      }

      const prompt = `Analise a imagem da escala de trabalho ou escala de plantão de um posto de combustíveis.
      Sua tarefa é ler a imagem e extrair três tipos de informações estruturadas:
      1. Lista única de funcionários (employees): Todos os nomes de pessoas físicas identificadas na imagem (frentistas, gerentes, supervisores, lavadores).
      2. Turnos de trabalho (schedules): Mapeamento de datas para turnos de trabalho e o nome do funcionário responsável.
      3. Eventos (events): Reuniões, manutenções, auditorias ou treinamentos com data, título, tipo e horário.

      Regras de Negócio:
      - Padronização de Turnos:
        * T2, Manhã, M, 1º Turno, 06-14h -> "Manhã (06h - 14h)"
        * T3, Tarde, T, 2º Turno, 14-22h -> "Tarde (14h - 22h)"
        * T4, Noite, N, 3º Turno, 22-06h -> "Noite (22h - 06h)"
        * Folga, F, Repouso, DSR -> "Folga Geral"
        * Horista, Intermediário, H -> "Horista (10h - 18h)"
      - Formato de Data: YYYY-MM-DD. Se a imagem mostrar apenas os dias do mês (ex: 1, 2, 3... ou Dia 01, Dia 02...), assuma o mês e ano corrente (ex: 2026-07-01, 2026-07-02, etc.).
      - Formato de Horário: HH:MM.
      - Nomes de Funcionários: Padronize com letras maiúsculas/minúsculas limpas (Capitalized, ex: "João Silva").
      - Tipos de Evento Permitidos: Treinamento, Reunião, Manutenção, Auditoria, Outro.

      Retorne APENAS um JSON seguindo exatamente este esquema:
      {
        "employees": ["Nome Completo 1", "Nome Completo 2"],
        "schedules": [
          { "data": "2026-07-01", "turno": "Manhã (06h - 14h)", "frentistaResponsavel": "Nome do Funcionário" }
        ],
        "events": [
          { "data": "2026-07-01", "titulo": "Reunião Geral", "tipo": "Reunião", "horario": "09:00", "descricao": "Pauta da reunião" }
        ]
      }`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: {
          parts: [
            { text: prompt },
            { inlineData: { data: image, mimeType } }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              employees: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              schedules: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    data: { type: Type.STRING },
                    turno: { type: Type.STRING },
                    frentistaResponsavel: { type: Type.STRING }
                  },
                  required: ["data", "turno", "frentistaResponsavel"]
                }
              },
              events: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    data: { type: Type.STRING },
                    titulo: { type: Type.STRING },
                    tipo: { type: Type.STRING },
                    descricao: { type: Type.STRING },
                    horario: { type: Type.STRING }
                  },
                  required: ["data", "titulo", "tipo", "horario"]
                }
              }
            },
            required: ["employees", "schedules", "events"]
          }
        }
      });

      const extractedData = JSON.parse(response.text || "{}");
      return res.json(extractedData);
    } catch (error: any) {
      console.error("Gemini Error:", error);
      return res.status(500).json({ error: "Erro ao processar imagem com Gemini.", details: error.message });
    }
  });

  // GET /api/health - monitoring route
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      storage: fs.existsSync(BACKUP_FILE) ? "active" : "initialized",
    });
  });

  // GET /api/backup?cnpj=...
  app.get("/api/backup", (req, res) => {
    try {
      const cnpj = req.query.cnpj as string;
      if (!cnpj) {
        return res.status(400).json({ error: "CNPJ é obrigatório como parâmetro de busca." });
      }

      const backups = readBackups();
      const cleanCnpj = cnpj.replace(/\D/g, ""); // remove non-digits to normalize
      const entry = backups[cleanCnpj] || backups[cnpj]; // try clean first, fallback to raw

      if (!entry) {
        return res.status(404).json({ error: `Nenhum backup encontrado para o CNPJ ${cnpj}` });
      }

      return res.json(entry);
    } catch (error: any) {
      console.error("Error retrieving backup:", error);
      return res.status(500).json({ error: "Erro interno ao recuperar backup.", details: error.message });
    }
  });

  // POST /api/backup
  app.post("/api/backup", (req, res) => {
    try {
      const { cnpj, data, updated_at } = req.body;

      if (!cnpj) {
        return res.status(400).json({ error: "CNPJ é obrigatório no corpo da requisição." });
      }
      if (!data) {
        return res.status(400).json({ error: "Os dados ('data') de backup são obrigatórios." });
      }

      const backups = readBackups();
      const cleanCnpj = cnpj.replace(/\D/g, "");

      const backupEntry = {
        cnpj: cleanCnpj,
        data,
        updated_at: updated_at || new Date().toISOString(),
      };

      backups[cleanCnpj] = backupEntry;
      writeBackups(backups);

      console.log(`[Backup] Backup salvo com sucesso para o CNPJ: ${cleanCnpj} em ${backupEntry.updated_at}`);

      return res.json({
        success: true,
        message: "Backup salvo com sucesso no servidor.",
        cnpj: cleanCnpj,
        updated_at: backupEntry.updated_at,
      });
    } catch (error: any) {
      console.error("Error saving backup:", error);
      return res.status(500).json({ error: "Erro interno ao salvar backup.", details: error.message });
    }
  });

  return app;
}

export async function startServer() {
  const app = await createExpressApp();
  const PORT = 3000;

  // --- VITE DEVELOPMENT MIDDLEWARE OR PRODUCTION SERVING ---

  if (process.env.NODE_ENV !== "production") {
    console.log("Loading Vite in development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving static production build from /dist...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Meu Posto] Server running on http://0.0.0.0:${PORT}`);
  });
}

// Avoid starting the standalone server when imported inside a Firebase Function environment
const isFirebaseFunction = !!(
  process.env.FUNCTIONS_EMULATOR || 
  process.env.FUNCTION_SIGNATURE_TYPE || 
  process.env.FIREBASE_CONFIG ||
  process.env.FUNCTION_TARGET
);

if (!isFirebaseFunction) {
  startServer().catch((err) => {
    console.error("Failed to start server:", err);
  });
}
