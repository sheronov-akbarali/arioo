/**
 * Uzbekistan Payment Gateways Provider Helpers (Payme & Click)
 */

export function getPaymeCheckoutUrl(params: {
  merchantId: string;
  amountUzs: number;
  organizationId: string;
  transactionId: string;
}): string {
  // Payme requires amount in tiyins (1 UZS = 100 tiyins)
  const amountTiyins = params.amountUzs * 100;
  const rawParams = `m=${params.merchantId};ac.org_id=${params.organizationId};ac.tx_id=${params.transactionId};a=${amountTiyins}`;
  const base64 = Buffer.from(rawParams).toString("base64");
  return `https://checkout.paycom.uz/${base64}`;
}

export function getClickCheckoutUrl(params: {
  serviceId: string;
  merchantId: string;
  amountUzs: number;
  transactionId: string;
  returnUrl?: string;
}): string {
  const url = new URL("https://my.click.uz/services/pay");
  url.searchParams.set("service_id", params.serviceId);
  url.searchParams.set("merchant_id", params.merchantId);
  url.searchParams.set("amount", String(params.amountUzs));
  url.searchParams.set("transaction_param", params.transactionId);
  if (params.returnUrl) {
    url.searchParams.set("return_url", params.returnUrl);
  }
  return url.toString();
}
