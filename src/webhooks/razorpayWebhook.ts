import type { Request, Response } from "express";
import { User } from "../models/User.js";
import { sendMailSafe } from "../services/email.js";
import { paymentSuccessEmail } from "../services/emailTemplates.js";
import { getProgramMeta } from "../services/programConfig.js";
import { verifyWebhookSignature } from "../services/razorpayVerify.js";

type RazorpayWebhookBody = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        notes?: { userId?: string };
      };
    };
  };
};

async function markPaidIfNeeded(userId: string, paymentId: string) {
  const user = await User.findById(userId);
  if (!user || user.paymentStatus === "paid") return;

  user.paymentStatus = "paid";
  user.isApproved = true;
  user.razorpayPaymentId = paymentId;
  user.paidAt = new Date();
  await user.save();

  const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
  const meta = await getProgramMeta();
  const mail = paymentSuccessEmail({
    name: user.name,
    dashboardUrl: `${webOrigin}/dashboard`,
    programTitle: meta.title,
  });
  await sendMailSafe({ to: user.email, ...mail });
}

export async function razorpayWebhookHandler(req: Request, res: Response) {
  const signature = req.headers["x-razorpay-signature"] as string | undefined;
  const raw = req.body as Buffer;
  if (!Buffer.isBuffer(raw) || raw.length === 0) {
    return res.status(400).json({ message: "Invalid body" });
  }
  if (!verifyWebhookSignature(raw, signature)) {
    console.warn("[razorpay webhook] bad signature");
    return res.status(400).json({ message: "Bad signature" });
  }

  let body: RazorpayWebhookBody;
  try {
    body = JSON.parse(raw.toString("utf8")) as RazorpayWebhookBody;
  } catch {
    return res.status(400).json({ message: "Invalid JSON" });
  }

  if (body.event === "payment.captured") {
    const payment = body.payload?.payment?.entity;
    const paymentId = payment?.id;
    const orderId = payment?.order_id;
    let userId = payment?.notes?.userId;

    if (!userId && orderId) {
      const u = await User.findOne({ razorpayOrderId: orderId });
      userId = u?._id.toString();
    }

    if (userId && paymentId) {
      await markPaidIfNeeded(userId, paymentId);
    }
  }

  res.json({ ok: true });
}
