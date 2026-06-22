import { z } from "zod";

export const updateUserSchema = z.object({
  name: z.string().max(255).optional(),
  email: z.string().email().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export type User = {
  id: string;
  name: string;
  email: string;
  email_verified_at?: string | null;
  created_at: string;
  updated_at: string;
};
