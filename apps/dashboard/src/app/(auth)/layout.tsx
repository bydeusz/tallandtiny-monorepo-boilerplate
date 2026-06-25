import Image from "next/image";
import { LanguageSwitcher } from "@repo/i18n";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full">
      <div className="hidden lg:flex lg:w-1/3 xl:w-1/2">
        <Image
          src="/img/mood-bg.jpg"
          alt=""
          width={1080}
          height={1350}
          priority
          className="h-full w-full object-cover object-center"
        />
      </div>
      <div className="bg-muted relative flex w-full items-center justify-center p-4 md:p-0 lg:w-2/3 xl:w-1/2">
        <div className="w-full max-w-sm">{children}</div>
        <div className="absolute right-6 top-4">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}
