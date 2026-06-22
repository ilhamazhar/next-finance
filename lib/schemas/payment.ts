import { z } from "zod";

export const createQrisSchema = z.object({
  amount: z.coerce.number().int().positive("Amount must be > 0"),
  description: z.string().min(1, "Required").max(255),
});

export type CreateQrisInput = z.infer<typeof createQrisSchema>;

export const PaymentStatus = ["PENDING", "PAID", "EXPIRED", "FAILED"] as const;
export type PaymentStatus = (typeof PaymentStatus)[number];

export type PaymentStatusResponse = {
  order_ref: string;
  amount: number;
  status: PaymentStatus;
  paid_at?: string | null;
  expires_at?: string | null;
  description?: string;
};

export type QrisResponse = {
  order_ref: string;
  qr_string: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  expires_at?: string | null;
  description: string;
};
