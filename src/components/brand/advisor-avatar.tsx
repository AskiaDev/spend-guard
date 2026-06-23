import { cn } from "@/lib/utils";

export function AdvisorAvatar({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-label="SpendGuard advisor"
      viewBox="0 0 48 48"
      className={cn("size-11 shrink-0", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="48" height="48" rx="18" fill="#EAF2FF" />
      <circle cx="24" cy="20" r="8" fill="#155EEF" />
      <path
        d="M12.5 40.5C14.2 33.95 18.45 30.5 24 30.5C29.55 30.5 33.8 33.95 35.5 40.5"
        fill="#15803D"
      />
      <path
        d="M19.8 19.4C21.9 21.25 26.05 21.25 28.2 19.4"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="21" cy="17.5" r="1.2" fill="white" />
      <circle cx="27" cy="17.5" r="1.2" fill="white" />
    </svg>
  );
}
