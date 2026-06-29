"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";

/** Group a run of digits with "." every three, matching id-ID currency display. */
function groupDigits(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

type NumberInputProps = {
  value: number | undefined;
  onChange: (value: number) => void;
  onBlur?: () => void;
  id?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

/**
 * A whole-number input that shows thousand separators (e.g. 15.000.000) while
 * keeping the form value a plain number. Intended for IDR amounts. Non-digits
 * are stripped on input, so paste/typing of "Rp" or separators is tolerated.
 */
export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  function NumberInput({ value, onChange, ...rest }, ref) {
    const display =
      value === undefined || Number.isNaN(value) ? "" : groupDigits(String(Math.trunc(value)));
    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          onChange(digits === "" ? 0 : parseInt(digits, 10));
        }}
        {...rest}
      />
    );
  }
);
