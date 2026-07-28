function appUrl() {
  return (process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}

export function getPaystackConfig() {
  return {
    secretKey: process.env.PAYSTACK_SECRET_KEY?.trim() ?? "",
    publicKey: process.env.PAYSTACK_PUBLIC_KEY?.trim() ?? "",
    webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET?.trim() ?? "",
    baseUrl: process.env.PAYSTACK_BASE_URL?.trim() || "https://api.paystack.co",
    callbackUrl:
      process.env.PAYSTACK_CALLBACK_URL?.trim() ||
      `${appUrl()}/api/webhooks/payments/paystack`,
    returnUrl: `${appUrl()}/payment/paystack/return`,
    currency: "GHS" as const,
  };
}

export function isPaystackConfigured() {
  const { secretKey } = getPaystackConfig();
  return Boolean(secretKey && secretKey.startsWith("sk_"));
}
