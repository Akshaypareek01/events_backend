import crypto from "crypto";
const pepper = () => process.env.JWT_SECRET ?? "dev-insecure-change-me";
export function generateOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
}
export function hashOtp(otp) {
    return crypto.createHash("sha256").update(`${pepper()}:${otp}`).digest("hex");
}
export function verifyOtpHash(otp, hash) {
    return hashOtp(otp) === hash;
}
