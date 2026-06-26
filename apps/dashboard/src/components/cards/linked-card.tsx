import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/molecules";
import { Badge } from "@repo/ui/atoms";

type LinkedCardProps = {
  title: string;
  description: string;
  badge: string;
  button: string;
  href: string;
};

export function LinkedCard({
  title,
  description,
  badge,
  button,
  href,
}: LinkedCardProps) {
  return (
    <Link href={href}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{title}</span>
            <Badge variant="secondary">{badge}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>{description}</CardContent>
        <CardFooter>
          <div className="text-primary flex items-center gap-1 font-semibold">
            <span>{button}</span>
            <ChevronRightIcon className="size-4" />
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
