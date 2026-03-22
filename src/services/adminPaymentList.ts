import type { PipelineStage } from "mongoose";
import { User } from "../models/User.js";

export type AdminPaymentStatusFilter = "all" | "paid" | "pending" | "free";

/** Build Mongo match for admin payment list; date range is inclusive (UTC day bounds). */
export function buildAdminPaymentMatch(params: {
  status: AdminPaymentStatusFilter;
  from?: Date;
  to?: Date;
}): Record<string, unknown> {
  const { status, from, to } = params;
  const statusOnly: Record<string, unknown> = {};
  if (status !== "all") {
    statusOnly.paymentStatus = status;
  }

  if (!from || !to) {
    return statusOnly;
  }

  const dr = { $gte: from, $lte: to };

  if (status === "paid") {
    return {
      paymentStatus: "paid",
      $or: [{ paidAt: dr }, { paidAt: { $exists: false }, updatedAt: dr }],
    };
  }

  if (status === "pending") {
    return { paymentStatus: "pending", createdAt: dr };
  }

  if (status === "free") {
    return { paymentStatus: "free", createdAt: dr };
  }

  // all
  return {
    $or: [
      {
        paymentStatus: "paid",
        $or: [{ paidAt: dr }, { paidAt: { $exists: false }, updatedAt: dr }],
      },
      { paymentStatus: "pending", createdAt: dr },
      { paymentStatus: "free", createdAt: dr },
    ],
  };
}

const sortDateExpr = {
  $cond: {
    if: { $eq: ["$paymentStatus", "paid"] },
    then: { $ifNull: ["$paidAt", "$updatedAt"] },
    else: "$createdAt",
  },
};

export type AdminPaymentRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city?: string;
  country?: string;
  userType: string;
  paymentStatus: string;
  isApproved: boolean;
  amountInr: number;
  currency: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paidAt: string | null;
  registeredAt: string;
  sortDate: string;
};

/** Paginated payment rows sorted by effective transaction date (newest first). */
export async function listAdminPayments(params: {
  page: number;
  limit: number;
  match: Record<string, unknown>;
  priceInr: number;
  currency: string;
}): Promise<{ rows: AdminPaymentRow[]; total: number }> {
  const { page, limit, match, priceInr, currency } = params;
  const skip = (page - 1) * limit;

  const pipeline: PipelineStage[] = [
    { $match: match },
    { $addFields: { sortDate: sortDateExpr } },
    {
      $facet: {
        data: [
          { $sort: { sortDate: -1 } as const },
          { $skip: skip },
          { $limit: limit },
        ],
        total: [{ $count: "n" }],
      },
    },
  ];

  const agg = await User.aggregate(pipeline).exec();
  const bucket = agg[0] as {
    data: Array<{
      _id: unknown;
      name: string;
      email: string;
      phone: string;
      city?: string;
      country?: string;
      userType: string;
      paymentStatus: string;
      isApproved: boolean;
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
      paidAt?: Date;
      createdAt: Date;
      sortDate: Date;
    }>;
    total: { n: number }[];
  };

  const raw = bucket?.data ?? [];
  const total = bucket?.total?.[0]?.n ?? 0;

  const rows: AdminPaymentRow[] = raw.map((u) => {
    const free = u.paymentStatus === "free";
    const paid = u.paymentStatus === "paid";
    const pendingNormal = u.paymentStatus === "pending" && u.userType === "normal";
    const amountInr = free ? 0 : paid || pendingNormal ? priceInr : 0;

    return {
      id: String(u._id),
      name: u.name,
      email: u.email,
      phone: u.phone,
      city: u.city,
      country: u.country,
      userType: u.userType,
      paymentStatus: u.paymentStatus,
      isApproved: u.isApproved,
      amountInr,
      currency,
      razorpayOrderId: u.razorpayOrderId,
      razorpayPaymentId: u.razorpayPaymentId,
      paidAt: u.paidAt ? u.paidAt.toISOString() : null,
      registeredAt: u.createdAt.toISOString(),
      sortDate: u.sortDate.toISOString(),
    };
  });

  return { rows, total };
}
