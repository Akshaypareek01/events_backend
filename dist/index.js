import "dotenv/config";
import mongoose from "mongoose";
import { createApp } from "./app.js";
import { startReminderCron } from "./cron/reminders.js";
import { assertProductionSecrets } from "./lib/productionSecrets.js";
assertProductionSecrets();
const PORT = Number(process.env.PORT) || 4000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/yoga-event";
const WEB_ORIGIN = process.env.WEB_ORIGIN || "http://localhost:3000";
const app = createApp(WEB_ORIGIN);
async function main() {
    mongoose.set("strictQuery", true);
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("MongoDB connected");
    }
    catch (e) {
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
