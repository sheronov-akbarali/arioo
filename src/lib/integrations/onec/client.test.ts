import { describe, it, expect } from "vitest";
import { OneCClient } from "./client";

describe("1C:Enterprise Client", () => {
  it("fetches products list and checks stock accurately", async () => {
    const client = new OneCClient({
      endpoint: "http://1c.example.uz",
      username: "admin",
      password: "password123",
    });

    const products = await client.getProducts();
    expect(products.length).toBeGreaterThan(0);

    const stockCheck = await client.checkStock("Krossovka");
    expect(stockCheck.inStock).toBe(true);
    expect(stockCheck.price).toBeGreaterThan(0);
  });

  it("submits order payload and returns order number", async () => {
    const client = new OneCClient({
      endpoint: "http://1c.example.uz",
    });

    const result = await client.createOrder({
      customerName: "Alisher",
      customerPhone: "+998901234567",
      items: [{ productId: "1c_prod_1", quantity: 1, price: 350000 }],
      totalAmount: 350000,
    });

    expect(result.success).toBe(true);
    expect(result.orderNumber).toContain("1C-");
  });
});
