"use client";

import { useState, type ChangeEventHandler } from "react";
import { useTranslations } from "next-intl";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Input, Label } from "@repo/ui/atoms";

type PasswordFieldProps = {
  label: string;
  name: string;
  id: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
};

export function PasswordField({
  label,
  name,
  id,
  placeholder,
  required,
  disabled,
  value,
  onChange,
}: PasswordFieldProps) {
  const t = useTranslations("inputs.errors");
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  function validate() {
    setError(required && !value ? t("required") : null);
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
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          disabled={disabled}
          value={value}
          onChange={onChange}
          onBlur={validate}
          aria-invalid={error ? true : undefined}
          className="pr-9"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
        >
          {visible ? (
            <EyeOffIcon className="size-4" />
          ) : (
            <EyeIcon className="size-4" />
          )}
        </button>
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
