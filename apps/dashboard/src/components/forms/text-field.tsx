"use client";

import { useState, type ChangeEventHandler } from "react";
import { useTranslations } from "next-intl";
import { AlertCircleIcon } from "lucide-react";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { cn } from "@repo/ui/lib/utils";

type TextFieldProps = {
  label: string;
  name: string;
  id: string;
  type?: "text" | "email" | "url" | "tel" | "number";
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
};

export function TextField({
  label,
  name,
  id,
  type = "text",
  placeholder,
  required,
  disabled,
  value,
  onChange,
}: TextFieldProps) {
  const t = useTranslations("inputs.errors");
  const [error, setError] = useState<string | null>(null);

  function validate() {
    if (required && !value) {
      setError(t("required"));
      return;
    }
    if (type === "email" && !value.includes("@")) {
      setError(t("email"));
      return;
    }
    if (type === "url") {
      try {
        new URL(value);
      } catch {
        setError(t("url"));
        return;
      }
    }
    if (type === "tel" && !/^\+?\d{7,14}$/.test(value)) {
      setError(t("tel"));
      return;
    }
    setError(null);
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          value={value}
          onChange={onChange}
          onBlur={validate}
          aria-invalid={error ? true : undefined}
          className={cn(error && "pr-9")}
        />
        {error && (
          <AlertCircleIcon className="text-destructive pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2" />
        )}
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
