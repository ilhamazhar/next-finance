import { z } from "zod";

/**
 * Apply for a Murabahah (cost-plus) financing. Mirrors the Go
 * `CreateMurabahahRequest` validate tags:
 *   asset_name    required,max=255
 *   cost_price    required,gt=0
 *   down_payment  gte=0
 *   tenor         required,gt=0,lte=360
 *   first_due_date optional (defaults server-side to ~one month out)
 *
 * The margin is NOT set here: the institution's profit is set by staff/admin at
 * approval, not by the applicant. The schedule is generated then, too.
 */
export const createMurabahahSchema = z
  .object({
    asset_name: z.string().min(1, "Required").max(255),
    cost_price: z.coerce.number().int().positive("Must be > 0"),
    down_payment: z.coerce.number().int().gte(0, "Cannot be negative"),
    tenor: z.coerce.number().int().positive("Must be ≥ 1").max(360, "Max 360 months"),
    first_due_date: z.string().optional(),
  })
  .refine((d) => d.down_payment < d.cost_price, {
    message: "Down payment must be less than the cost price",
    path: ["down_payment"],
  });

export type CreateMurabahahInput = z.infer<typeof createMurabahahSchema>;

/**
 * Approve an APPLIED financing: staff/admin confirm (and may correct) the
 * financial figures and set the margin. Mirrors the Go `ApproveFinancingRequest`.
 *
 * Syariah invariant: total_price = cost_price + margin_amount, locked at akad.
 */
export const approveFinancingSchema = z
  .object({
    cost_price: z.coerce.number().int().positive("Must be > 0"),
    margin_amount: z.coerce.number().int().gte(0, "Cannot be negative"),
    down_payment: z.coerce.number().int().gte(0, "Cannot be negative"),
    tenor: z.coerce.number().int().positive("Must be ≥ 1").max(360, "Max 360 months"),
    first_due_date: z.string().optional(),
  })
  .refine((d) => d.down_payment < d.cost_price + d.margin_amount, {
    message: "Down payment must be less than the total price",
    path: ["down_payment"],
  });

export type ApproveFinancingInput = z.infer<typeof approveFinancingSchema>;

export const AkadType = ["MURABAHAH"] as const;
export type AkadType = (typeof AkadType)[number];

export const FinancingStatus = ["APPLIED", "APPROVED", "ACTIVE", "SETTLED", "WRITTEN_OFF"] as const;
export type FinancingStatus = (typeof FinancingStatus)[number];

export const InstallmentStatus = ["UNPAID", "PAID", "LATE"] as const;
export type InstallmentStatus = (typeof InstallmentStatus)[number];

export type InstallmentResponse = {
  installment_no: number;
  due_date: string;
  principal_part: number;
  margin_part: number;
  amount: number;
  status: InstallmentStatus;
  paid_at?: string | null;
};

export type FinancingResponse = {
  id: number;
  user_id: string;
  // Owner's display name. Preloaded on list + detail endpoints; absent on
  // create. Mainly useful to admins, whose list spans every user.
  user_name?: string;
  akad_type: AkadType | string;
  asset_name: string;
  cost_price: number;
  margin_amount: number;
  total_price: number;
  down_payment: number;
  tenor: number;
  currency: string;
  status: FinancingStatus;
  akad_signed_at?: string | null;
  // Requested due date of installment #1, captured at application; prefills the
  // approval form. Null until the applicant supplies one.
  first_due_date?: string | null;
  // Approver attribution, set at approval (always a staff/admin). approver_name
  // is preloaded on the detail endpoint only. Null while still APPLIED.
  approved_by?: string | null;
  approver_name?: string;
  approved_at?: string | null;
  // Preloaded on create + detail; omitted from the list endpoint.
  installments?: InstallmentResponse[];
  created_at: string;
};
