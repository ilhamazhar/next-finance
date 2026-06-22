import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(255),
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Min 6 characters"),
    password_confirm: z.string().min(6, "Min 6 characters"),
  })
  .refine((d) => d.password === d.password_confirm, {
    message: "Passwords don't match",
    path: ["password_confirm"],
  });

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    new_password: z.string().min(6, "Min 6 characters"),
    confirm_password: z.string().min(6, "Min 6 characters"),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
  });

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Required"),
    new_password: z.string().min(6, "Min 6 characters"),
    confirm_password: z.string().min(6, "Min 6 characters"),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// --- Server response shapes ---

export type RegisteredUser = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
};

/**
 * Backend returns `{ user, verification_token }` on register.
 * `verification_token` is only present in dev mode (real flow mails the link).
 */
export type RegisterResponse = {
  user: RegisteredUser;
  verification_token?: string;
};

/**
 * Backend may return `{ reset_token }` from forgot-password in dev mode so local
 * testing has a real link (real flow mails it). Null/absent otherwise.
 */
export type ForgotPasswordResponse = {
  reset_token?: string;
} | null;
