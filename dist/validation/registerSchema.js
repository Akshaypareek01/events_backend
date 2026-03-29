import { z } from "zod";
const phoneRegex = /^[0-9+\s()-]{10,20}$/;
const sharedFields = {
    name: z.string().trim().min(2, "Name is required"),
    email: z.string().trim().email("Invalid email"),
    phone: z.string().trim().regex(phoneRegex, "Invalid phone"),
    city: z.string().trim().min(2, "City is required"),
    country: z.string().trim().min(2, "Country is required"),
};
export const registerBodySchema = z.discriminatedUnion("userType", [
    z.object({
        ...sharedFields,
        userType: z.literal("normal"),
    }),
    z.object({
        ...sharedFields,
        userType: z.literal("corporate"),
        corporateCompanyId: z.string().trim().min(1, "Select your company"),
        corporateCouponCode: z.string().trim().min(1, "Coupon code is required"),
    }),
]);
