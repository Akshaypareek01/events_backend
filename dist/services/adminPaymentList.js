import { User } from "../models/User.js";
/** Build Mongo match for admin payment list; date range is inclusive (UTC day bounds). */
export function buildAdminPaymentMatch(params) {
    const { status, from, to } = params;
    const statusOnly = {};
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
/** Paginated payment rows sorted by effective transaction date (newest first). */
export async function listAdminPayments(params) {
    const { page, limit, match, payableInr, currency } = params;
    const skip = (page - 1) * limit;
    const pipeline = [
        { $match: match },
        { $addFields: { sortDate: sortDateExpr } },
        {
            $facet: {
                data: [
                    { $sort: { sortDate: -1 } },
                    { $skip: skip },
                    { $limit: limit },
                ],
                total: [{ $count: "n" }],
            },
        },
    ];
    const agg = await User.aggregate(pipeline).exec();
    const bucket = agg[0];
    const raw = bucket?.data ?? [];
    const total = bucket?.total?.[0]?.n ?? 0;
    const rows = raw.map((u) => {
        const free = u.paymentStatus === "free";
        const paid = u.paymentStatus === "paid";
        const pendingNormal = u.paymentStatus === "pending" && u.userType === "normal";
        const amountInr = free ? 0 : paid || pendingNormal ? payableInr : 0;
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
