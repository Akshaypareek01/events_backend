import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { AdminUser } from "../models/AdminUser.js";
import { ClassSession } from "../models/ClassSession.js";
import { ProgramConfig } from "../models/ProgramConfig.js";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/yoga-event";

/** Dev seed: program metadata + placeholder class rows (replace Zoom URLs in admin). */
async function seed() {
  await mongoose.connect(MONGODB_URI);

  await ProgramConfig.findOneAndUpdate(
    {},
    {
      title: "Samsara Yoga — 3 Month Journey",
      durationMonths: 3,
      priceInr: 499,
      currency: "INR",
      allowedCorporateDomains: [],
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const adminEmail = (process.env.ADMIN_SEED_EMAIL ?? "admin@ex.com").toLowerCase();
  const adminPassword = process.env.ADMIN_SEED_PASSWORD ?? "admin@2849182421";
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await AdminUser.findOneAndUpdate(
    { email: adminEmail },
    { email: adminEmail, passwordHash, role: "admin" },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  console.log(`Admin user: ${adminEmail} (password from ADMIN_SEED_PASSWORD or default changeme)`);

  const existingCount = await ClassSession.countDocuments();
  if (existingCount > 0) {
    await ClassSession.deleteMany({});
  }
  const inserted = await ClassSession.insertMany([
      {
        title: "Morning Yoga - Batch 1",
        timeLabel: "06:00 AM",
        zoomLink: "https://zoom.us/j/REPLACE_MORNING_1",
        type: "morning",
        active: true,
      },
      {
        title: "Morning Yoga - Batch 2",
        timeLabel: "07:00 AM",
        zoomLink: "https://zoom.us/j/REPLACE_MORNING_2",
        type: "morning",
        active: true,
      },
      {
        title: "Morning Yoga - Batch 3",
        timeLabel: "08:00 AM",
        zoomLink: "https://zoom.us/j/REPLACE_MORNING_3",
        type: "morning",
        active: true,
      },
      {
        title: "Morning Yoga - Batch 4",
        timeLabel: "09:00 AM",
        zoomLink: "https://zoom.us/j/REPLACE_MORNING_4",
        type: "morning",
        active: true,
      },
      {
        title: "Evening Yoga - Batch 1",
        timeLabel: "06:00 PM",
        zoomLink: "https://zoom.us/j/REPLACE_EVENING_1",
        type: "evening",
        active: true,
      },
      {
        title: "Evening Yoga - Batch 2",
        timeLabel: "07:00 PM",
        zoomLink: "https://zoom.us/j/REPLACE_EVENING_2",
        type: "evening",
        active: true,
      },
      {
        title: "Evening Yoga - Batch 3",
        timeLabel: "08:00 PM",
        zoomLink: "https://zoom.us/j/REPLACE_EVENING_3",
        type: "evening",
        active: true,
      },
      {
        title: "Evening Yoga - Batch 4",
        timeLabel: "09:00 PM",
        zoomLink: "https://zoom.us/j/REPLACE_EVENING_4",
        type: "evening",
        active: true,
      },
    ]);
  const createdClasses = inserted.length;
  const totalClasses = await ClassSession.countDocuments();
  console.log(
    existingCount > 0
      ? `Class sessions reset: removed ${existingCount}, created ${createdClasses} (total now: ${totalClasses})`
      : `Class sessions created: ${createdClasses} (total now: ${totalClasses})`,
  );

  console.log("Seed complete");
  await mongoose.disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
