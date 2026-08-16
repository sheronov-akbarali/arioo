import { describe, it, expect } from "vitest";
import { MoySkladClient } from "./client";

describe("MoySklad Client", () => {
  it("fetches assortment and checks product stock", async () => {
    const client = new MoySkladClient("test_token_123");
    const items = await client.getAssortment();

    expect(items.length).toBeGreaterThan(0);

    const stock = await client.checkStock("Quloqchin");
    expect(stock.inStock).toBe(true);
    expect(stock.price).toBeGreaterThan(0);
  });

  it("creates customer order in MoySklad and returns order ID", async () => {
    const client = new MoySkladClient("test_token_123");
    const result = await client.createCustomerOrder({
      customerName: "Bekzod",
      customerPhone: "+998931112233",
      items: [{ productId: "ms_1", quantity: 2, price: 280000 }],
      totalAmount: 560000,
    });

    expect(result.success).toBe(true);
    expect(result.orderName).toContain("MS-");
  });
});
