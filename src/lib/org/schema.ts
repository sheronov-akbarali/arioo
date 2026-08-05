import { z } from "zod";

export const INDUSTRIES = ["retail", "restaurant", "education", "real_estate", "other"] as const;

const organizationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  industry: z.enum(INDUSTRIES),
});

export type OrganizationInput = z.infer<typeof organizationSchema>;

export function parseOrganizationInput(
  input: unknown,
): { success: true; data: OrganizationInput } | { success: false; error: string } {
  const result = organizationSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message ?? "Invalid input" };
  }
  return { success: true, data: result.data };
}
