import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const noticePresentation = {
  warning: {
    Icon: TriangleAlert,
    className: "border-caution/25 bg-caution/10 text-caution",
  },
  error: {
    Icon: CircleAlert,
    className: "border-risk/25 bg-risk/10 text-risk",
  },
  success: {
    Icon: CircleCheck,
    className: "border-safe/25 bg-safe/10 text-safe",
  },
} as const;

export interface InlineNoticeProps {
  tone: keyof typeof noticePresentation;
  children: ReactNode;
  title?: string;
  className?: string;
}

export function InlineNotice({ tone, children, title, className }: InlineNoticeProps) {
  const { Icon, className: toneClassName } = noticePresentation[tone];
  const isError = tone === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? undefined : "polite"}
      className={cn(
        "flex items-start gap-3 rounded-control border px-4 py-3 text-sm",
        toneClassName,
        className
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 text-foreground">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className={cn("leading-5", title && "mt-1")}>{children}</div>
      </div>
    </div>
  );
}
