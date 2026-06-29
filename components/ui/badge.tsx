import { cn } from "@/lib/utils";
import type { PaymentStatus } from "@/lib/schemas/payment";

export function StatusBadge({ status }: { status: PaymentStatus | string }) {
  const tone =
    status === "PAID"
      ? "bg-green-100 text-green-800"
      : status === "PENDING"
      ? "bg-amber-100 text-amber-800"
      : status === "EXPIRED"
      ? "bg-zinc-200 text-zinc-700"
      : "bg-red-100 text-red-800";

  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tone)}>
      {status}
    </span>
  );
}

export function FinancingStatusBadge({ status }: { status: string }) {
  const tone =
    status === "ACTIVE"
      ? "bg-blue-100 text-blue-800"
      : status === "SETTLED"
      ? "bg-green-100 text-green-800"
      : status === "APPLIED"
      ? "bg-amber-100 text-amber-800"
      : status === "APPROVED"
      ? "bg-indigo-100 text-indigo-800"
      : "bg-red-100 text-red-800"; // WRITTEN_OFF / unknown

  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tone)}>
      {status}
    </span>
  );
}

export function InstallmentStatusBadge({ status }: { status: string }) {
  const tone =
    status === "PAID"
      ? "bg-green-100 text-green-800"
      : status === "LATE"
      ? "bg-red-100 text-red-800"
      : "bg-amber-100 text-amber-800"; // UNPAID

  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tone)}>
      {status}
    </span>
  );
}

export function VerifiedBadge({ verifiedAt }: { verifiedAt?: string | null }) {
  const verified = !!verifiedAt;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        verified ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
      )}
    >
      {verified ? "Verified" : "Unverified"}
    </span>
  );
}
