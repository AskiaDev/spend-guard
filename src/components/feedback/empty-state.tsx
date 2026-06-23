import type { ReactElement, ReactNode } from "react";
import Image from "next/image";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmptyStateIllustration {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface EmptyStateProps {
  title: string;
  description: string;
  action: ReactElement;
  icon?: ReactNode;
  illustration?: EmptyStateIllustration;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  illustration,
  className,
}: EmptyStateProps) {
  return (
    <Card
      aria-label={title}
      className={cn("flex min-h-64 flex-col items-center justify-center p-6 text-center", className)}
    >
      {illustration ? (
        <Image
          src={illustration.src}
          alt={illustration.alt}
          width={illustration.width}
          height={illustration.height}
          loading="eager"
          className="mb-4 h-auto max-h-36 w-auto"
        />
      ) : null}
      {!illustration && icon ? (
        <div
          aria-hidden="true"
          className="mb-4 grid size-12 place-items-center rounded-full bg-advisor text-primary"
        >
          {icon}
        </div>
      ) : null}
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>
      <div className="mt-5">{action}</div>
    </Card>
  );
}
