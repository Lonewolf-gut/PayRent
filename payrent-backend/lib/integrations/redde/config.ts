export function getReddeAppId() {
  return process.env.REDDE_APP_ID?.trim() ?? "";
}

export function getReddeApiKey() {
  return process.env.REDDE_API_KEY?.trim() ?? "";
}

export function getReddeReceiveUrl() {
  return (
    process.env.REDDE_RECEIVE_URL?.trim() ?? "https://api.reddeonline.com/v1/receive/"
  );
}

export function getReddeCashoutUrl() {
  return process.env.REDDE_CASHOUT_URL?.trim() ?? "https://api.reddeonline.com/v1/cashout";
}

export function getReddeMerchantNickname() {
  return process.env.REDDE_MERCHANT_NICKNAME?.trim() ?? "PayForMe";
}

/** Optional shared secret for callback verification (if configured in Redde portal). */
export function getReddeCallbackSecret() {
  return process.env.REDDE_CALLBACK_SECRET?.trim() ?? "";
}

export function isReddeConfigured() {
  return Boolean(getReddeAppId() && getReddeApiKey());
}
