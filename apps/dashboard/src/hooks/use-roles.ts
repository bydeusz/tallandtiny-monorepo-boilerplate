import { useTranslations } from "next-intl";

export function useRoles() {
  const t = useTranslations("common.data.roles");

  return [
    { label: " ", value: " " },
    { label: t("designer"), value: "Designer" },
    { label: t("sales"), value: "Sales" },
    { label: t("softwareEngineer"), value: "Software Engineer" },
    { label: t("manager"), value: "Manager" },
    { label: t("seoSpecialist"), value: "SEO Specialist" },
    { label: t("contentCreator"), value: "Content Creator" },
  ];
}
