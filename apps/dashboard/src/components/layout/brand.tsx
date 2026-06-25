import Link from "next/link";
import Image from "next/image";

type BrandProps = { href: string; className?: string; text?: string };

export function Brand({ href, className, text }: BrandProps) {
  return (
    <Link
      href={href}
      title="Home"
      aria-label="Home"
      className={`flex items-center gap-2.5 ${className ?? ""}`}
    >
      <Image
        src="/img/logo.jpg"
        className="rounded-md"
        alt="Logo"
        width={35}
        height={35}
      />
      {text && <span className="text-sm font-semibold">{text}</span>}
    </Link>
  );
}
