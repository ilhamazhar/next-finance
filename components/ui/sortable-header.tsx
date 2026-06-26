"use client";

import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortOrder = "asc" | "desc";

/**
 * A clickable table header cell that drives column sorting. Generic over the
 * caller's sort-key union (`K`) so each table keeps its own type-safe set of
 * sortable columns. Renders a direction chevron: faint up/down on inactive
 * columns, solid up/down on the active one.
 */
export function SortableHeader<K extends string>({
  label,
  sortKey,
  sort,
  order,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: K;
  /** The currently active sort column. */
  sort: K;
  order: SortOrder;
  onSort: (key: K) => void;
  align?: "left" | "right";
}) {
  const active = sort === sortKey;
  const Icon = !active ? ChevronsUpDown : order === "asc" ? ChevronUp : ChevronDown;
  return (
    <th className={cn("py-2 px-2 font-medium", align === "right" ? "text-right" : "text-left")}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        aria-label={`Sort by ${label}`}
        className={cn(
          "inline-flex items-center gap-1 hover:text-[color:var(--color-foreground)]",
          align === "right" && "flex-row-reverse"
        )}
      >
        {label}
        <Icon
          className={cn(
            "h-3.5 w-3.5",
            active
              ? "text-[color:var(--color-foreground)]"
              : "text-[color:var(--color-muted-foreground)] opacity-60"
          )}
        />
      </button>
    </th>
  );
}
