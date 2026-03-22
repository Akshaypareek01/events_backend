import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { AdminUser } from "../models/AdminUser.js";
import { ClassSession } from "../models/ClassSession.js";
import { ProgramConfig } from "../models/ProgramConfig.js";
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/yoga-event";
/** Dev seed: program metadata + placeholder class rows (replace Zoom URLs in admin). */
async function seed() {
    await mongoose.connect(MONGODB_URI);
    await ProgramConfig.findOneAndUpdate({}, {
        title: "Samsara Yoga — 3 Month Journey",
        durationMonths: 3,
        priceInr: 499,
        currency: "INR",
        allowedCorporateDomains: [],
    }, { upsert: true, new: true, setDefaultsOnInsert: true });
    const adminEmail = (process.env.ADMIN_SEED_EMAIL ?? "admin@ex.com").toLowerCase();
    const adminPassword = process.env.ADMIN_SEED_PASSWORD ?? "admin@2849182421";
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await AdminUser.findOneAndUpdate({ email: adminEmail }, { email: adminEmail, passwordHash, role: "admin" }, { upsert: true, new: true, setDefaultsOnInsert: true });
    console.log(`Admin user: ${adminEmail} (password from ADMIN_SEED_PASSWORD or default changeme)`);
    const count = await ClassSession.countDocuments();
    if (count === 0) {
        await ClassSession.insertMany([
            {
                title: "Morning Yoga",
                timeLabel: "07:00 AM",
                zoomLink: "https://zoom.us/j/REPLACE_MORNING",
                type: "morning",
                active: true,
            },
            {
                title: "Evening Yoga",
                timeLabel: "07:00 PM",
                zoomLink: "https://zoom.us/j/REPLACE_EVENING",
                type: "evening",
                active: true,
            },
        ]);
    }
    console.log("Seed complete");
    await mongoose.disconnect();
}
seed().catch((e) => {
    console.error(e);
    process.exit(1);
});
