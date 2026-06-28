import { createElement } from "react";

import { getGoalIcon } from "../lib/goal-calculations";

export function GoalIcon({ label, className }: { label: string; className?: string }) {
  return createElement(getGoalIcon(label), { className, "aria-hidden": true });
}
