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

const BACKUP_FILE = path.join(process.cwd(), "backups.json");

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

async function startServer() {
  const app = express();
  const PORT = 3000;

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

      const prompt = `Analise a imagem da escala de trabalho de um posto de combustíveis e extraia as informações de turnos (schedules), eventos (reuniões, treinamentos, manutenções) e a lista única de funcionários citados.
      Retorne um JSON seguindo exatamente este esquema:
      {
        "employees": ["Nome 1", "Nome 2"],
        "schedules": [
          { "data": "YYYY-MM-DD", "turno": "Nome do Turno", "frentistaResponsavel": "Nome do Funcionário" }
        ],
        "events": [
          { "data": "YYYY-MM-DD", "titulo": "Título do Evento", "tipo": "Treinamento|Reunião|Manutenção|Auditoria|Outro", "descricao": "Descrição curta", "horario": "HH:MM" }
        ]
      }
      Se não houver eventos ou turnos, retorne arrays vazios. Certifique-se de que as datas estão no formato YYYY-MM-DD e horários em HH:MM.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
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

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
