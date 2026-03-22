import cors from "cors";
import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import { errorMiddleware } from "./middleware/errorMiddleware.js";
import { v1Router } from "./routes/v1/index.js";
import { razorpayWebhookHandler } from "./webhooks/razorpayWebhook.js";
export function createApp(webOrigin) {
    const app = express();
    /** Behind nginx/ALB/Cloudflare: set TRUST_PROXY=1 so rate limits use real client IP. */
    if (process.env.TRUST_PROXY === "1") {
        app.set("trust proxy", 1);
    }
    app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
    app.use(cors({
        origin: webOrigin,
        credentials: true,
    }));
    app.post("/webhooks/razorpay", express.raw({ type: "application/json" }), (req, res, next) => {
        void razorpayWebhookHandler(req, res).catch(next);
    });
    app.use(express.json({ limit: "32kb" }));
    app.get("/", (_req, res) => {
        res.json({
            ok: true,
            message: "Welcome to the Events API",
            service: "Samsara Yoga Events",
            docs: "Use /api/v1/* for application routes; GET /health for status.",
        });
    });
    app.get("/health", (_req, res) => {
        const db = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
        res.json({ ok: true, db });
    });
    app.use("/api/v1", v1Router);
    app.use(errorMiddleware);
    return app;
}
