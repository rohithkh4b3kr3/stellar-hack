/**
 * B2B Freelance Escrow API
 * - Enforces HTTP 402 for advance payment
 * - Never holds funds; all money is in the Soroban contract
 * - Wallet = identity (signature verification, no signup)
 */
import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./routes.js";
const app = express();
const PORT = process.env.PORT ?? 5000;
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.get("/", (_req, res) => {
    res.json({
        name: "B2B Freelance Escrow API",
        version: "1.0.0",
        endpoints: [
            "POST /project/create",
            "GET /projects",
            "GET /project/:id",
            "POST /project/:id/apply",
            "POST /project/:id/accept",
            "POST /project/:id/set-contract",
            "GET /project/:id/start (402)",
            "POST /project/:id/submit",
            "POST /project/:id/approve",
            "POST /project/:id/refund",
        ],
    });
});
app.use(routes);
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
