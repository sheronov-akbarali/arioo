import { describe, it, expect, vi, beforeEach } from "vitest";
import { disconnectYoutubeChannel } from "./actions";

const { dbDeleteWhere } = vi.hoisted(() => ({
  dbDeleteWhere: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/db/client", () => ({
  db: {
    delete: vi.fn().mockReturnValue({
      where: dbDeleteWhere,
    }),
  },
}));

vi.mock("@/lib/auth/dal", () => ({
  requireOrganization: vi.fn().mockResolvedValue({
    organization: { id: "org_123" },
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("disconnectYoutubeChannel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes the youtube connection for the current organization", async () => {
    await disconnectYoutubeChannel("uz");
    expect(dbDeleteWhere).toHaveBeenCalledOnce();
  });
});
