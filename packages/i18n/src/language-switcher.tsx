"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDownIcon } from "lucide-react";

import "flag-icons/css/flag-icons.min.css";

import { locales, type Locale } from "./locales";
import { useSetLocale } from "./use-set-locale";

const FLAGS: Record<Locale, string> = { en: "gb", nl: "nl" };

export function LanguageSwitcher() {
  const t = useTranslations("navigation.language");
  const activeLocale = useLocale() as Locale;
  const setLocale = useSetLocale();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const labelFor = (locale: Locale) =>
    locale === "nl" ? t("dutch") : t("english");

  async function handleSelect(locale: Locale) {
    setIsOpen(false);
    if (locale !== activeLocale) {
      await setLocale(locale);
    }
  }

  return (
    <div className="relative text-sm" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center gap-2 rounded-md border border-input bg-background py-2 pl-3 pr-9 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <span className={`fi fi-${FLAGS[activeLocale]}`} />
        <span>{labelFor(activeLocale)}</span>
        <ChevronDownIcon
          className={`absolute right-3 top-1/2 size-4 -translate-y-1/2 transition-transform${
            isOpen ? " rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
          {locales.map((locale) => (
            <button
              key={locale}
              type="button"
              onClick={() => handleSelect(locale)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground${
                locale === activeLocale ? " bg-accent/50" : ""
              }`}
            >
              <span className={`fi fi-${FLAGS[locale]}`} />
              <span>{labelFor(locale)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
