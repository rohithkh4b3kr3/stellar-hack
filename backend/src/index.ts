/**
 * gigX Freelance Escrow API
 * - Never holds funds; stellar-contract: create_escrow, complete_job, cancel_within_6h, refund_after_hard_deadline
 * - Set ESCROW_CONTRACT_ID (and optionally XLM_TOKEN_ID, DATABASE_URL). Set SOROBAN_RPC_URL for testnet.
 */
import "dotenv/config";
import express from "express";
import cors from "cors";
import { initDb } from "./db.js";
import routes from "./routes.js";

const app = express();
const PORT = process.env.PORT ?? 5000;

app.use(cors());
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

async function start() {
  if (process.env.DATABASE_URL) {
    try {
      await initDb();
    } catch (e) {
      console.warn("PostgreSQL init failed, using in-memory store:", (e as Error).message);
    }
  }
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((e) => {
  console.error("Startup failed:", e);
  process.exit(1);
});
