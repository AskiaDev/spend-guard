import * as React from "react";

export { Input } from "@/components/ui/input";
export { Label } from "@/components/ui/label";
export { Textarea } from "@/components/ui/textarea";

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="text-xs font-medium text-risk">{children}</p>;
}
