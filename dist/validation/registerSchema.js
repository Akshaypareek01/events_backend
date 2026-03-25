import { z } from "zod";
const phoneRegex = /^[0-9+\s()-]{10,20}$/;
export const registerBodySchema = z
    .object({
    name: z.string().trim().min(2, "Name is required"),
    email: z.string().trim().email("Invalid email"),
    phone: z.string().trim().regex(phoneRegex, "Invalid phone"),
    city: z.string().trim().min(2, "City is required"),
    country: z.string().trim().min(2, "Country is required"),
    userType: z.enum(["normal", "corporate"]),
    gender: z.enum(["male", "female", "other"]).optional(),
    companyName: z.string().trim().optional(),
})
    .superRefine((data, ctx) => {
    if (data.userType === "corporate") {
        const c = data.companyName?.trim() ?? "";
        if (c.length < 2) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Company name is required",
                path: ["companyName"],
            });
        }
    }
});
