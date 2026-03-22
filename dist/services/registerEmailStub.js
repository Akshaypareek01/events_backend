/** Phase 06 replaces this with SES/Resend templates. */
export function registerEmailStub(user) {
    console.log(`[email:stub] registration for ${user.email} (${user.userType}) payment=${user.paymentStatus}`);
}
