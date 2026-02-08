import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { initDb } from "./db.js";
import routes from "./routes.js";
import { getProject } from "./store.js";

const app = express();
const PORT = process.env.PORT ?? 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: "2mb" }));

app.get("/", (_req, res) => {
  res.json({
    name: "gigX Freelance Escrow API",
    version: "1.0.0",
    endpoints: [
      "POST /preflight/escrow",
      "POST /project/create",
      "GET /projects",
      "GET /project/:id",
      "POST /project/:id/apply",
      "POST /project/:id/accept",
      "POST /project/:id/set-contract",
      "POST /project/:id/set-job",
      "GET /project/:id/start",
    ],
  });
});

app.use(routes);

type ChatMessage = {
  id: string;
  projectId: string;
  sender: string;
  text: string;
  ts: number;
};

const chatStore = new Map<string, ChatMessage[]>();

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: CORS_ORIGIN },
});

async function canAccessProject(projectId: string, wallet: string): Promise<boolean> {
  const project = await getProject(projectId);
  if (!project) return false;
  return project.businessAddress === wallet || project.freelancerAddress === wallet;
}

io.on("connection", (socket) => {
  socket.on("chat:join", async (payload: { projectId: string; wallet: string }) => {
    const { projectId, wallet } = payload ?? {};
    if (!projectId || !wallet) return;
    const allowed = await canAccessProject(projectId, wallet);
    if (!allowed) {
      socket.emit("chat:error", { message: "Unauthorized" });
      return;
    }
    const room = `project:${projectId}`;
    socket.join(room);
    const history = chatStore.get(projectId) ?? [];
    socket.emit("chat:history", history);
  });

  socket.on("chat:message", async (payload: { projectId: string; wallet: string; text: string }) => {
    const { projectId, wallet, text } = payload ?? {};
    if (!projectId || !wallet || !text) return;
    const allowed = await canAccessProject(projectId, wallet);
    if (!allowed) {
      socket.emit("chat:error", { message: "Unauthorized" });
      return;
    }
    const clean = text.trim().slice(0, 1000);
    if (!clean) return;
    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      projectId,
      sender: wallet,
      text: clean,
      ts: Date.now(),
    };
    const list = chatStore.get(projectId) ?? [];
    const next = [...list, msg].slice(-200);
    chatStore.set(projectId, next);
    io.to(`project:${projectId}`).emit("chat:message", msg);
  });
});

async function start() {
  if (process.env.DATABASE_URL) {
    try {
      await initDb();
    } catch (e) {
      console.warn("PostgreSQL init failed, using in-memory store:", (e as Error).message);
    }
  }
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((e) => {
  console.error("Startup failed:", e);
  process.exit(1);
});
