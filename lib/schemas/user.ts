import { z } from "zod";
import type { Role } from "@/lib/api/types";

export const updateUserSchema = z.object({
  name: z.string().max(255).optional(),
  email: z.string().email().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  email_verified_at?: string | null;
  created_at: string;
  updated_at: string;
};
