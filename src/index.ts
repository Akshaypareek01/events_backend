import "dotenv/config";
import mongoose from "mongoose";
import { createApp } from "./app.js";
import { startReminderCron } from "./cron/reminders.js";
import { assertProductionSecrets } from "./lib/productionSecrets.js";

assertProductionSecrets();

const PORT = Number(process.env.PORT) || 4000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/yoga-event";
/** Comma-separated list, e.g. `http://localhost:3000,https://www.example.com` */
const WEB_ORIGINS = (process.env.WEB_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const app = createApp(WEB_ORIGINS);

async function main() {
  mongoose.set("strictQuery", true);
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected");
  } catch (e) {
    console.error("MongoDB connection failed (is mongod running?)", e);
  }

  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });

  startReminderCron();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
