/** Dashboard + class APIs: paid normal or approved corporate/free path. */
export function canAccessProgram(user: {
  userType: "normal" | "corporate";
  paymentStatus: "pending" | "paid" | "free";
  isApproved: boolean;
}): boolean {
  if (user.userType === "corporate") {
    return user.paymentStatus === "free" && user.isApproved;
  }
  return user.paymentStatus === "paid" && user.isApproved;
}
