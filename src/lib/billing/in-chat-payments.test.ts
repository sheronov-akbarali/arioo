import { describe, it, expect, vi } from "vitest";
import { getClickCheckoutUrl, getPaymeCheckoutUrl } from "./payment-providers";

describe("In-Chat Payments & Gateways", () => {
  it("generates correct Click checkout URL with transaction_param", () => {
    const url = getClickCheckoutUrl({
      serviceId: "33445",
      merchantId: "22110",
      amountUzs: 150000,
      transactionId: "deal_123_org_456",
    });

    expect(url).toContain("https://my.click.uz/services/pay");
    expect(url).toContain("service_id=33445");
    expect(url).toContain("merchant_id=22110");
    expect(url).toContain("amount=150000");
    expect(url).toContain("transaction_param=deal_123_org_456");
  });

  it("generates correct Payme base64 encoded URL", () => {
    const url = getPaymeCheckoutUrl({
      merchantId: "640102030405",
      amountUzs: 200000,
      organizationId: "org_test",
      transactionId: "tx_999",
    });

    expect(url).toContain("https://checkout.paycom.uz/");
    const base64Part = url.replace("https://checkout.paycom.uz/", "");
    const decoded = Buffer.from(base64Part, "base64").toString("utf-8");

    expect(decoded).toContain("m=640102030405");
    expect(decoded).toContain("ac.org_id=org_test");
    expect(decoded).toContain("a=20000000"); // 200 000 * 100 tiyins
  });
});
