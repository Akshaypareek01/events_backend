import { ProgramConfig } from "../models/ProgramConfig.js";
export async function getProgramMeta() {
    const doc = await ProgramConfig.findOne().sort({ updatedAt: -1 });
    return {
        title: doc?.title ?? "Samsara Yoga Program",
        priceInr: doc?.priceInr ?? 499,
        currency: doc?.currency ?? "INR",
    };
}
