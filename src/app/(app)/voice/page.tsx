import { redirect } from "next/navigation";

export default function VoicePurchaseCheckerPage() {
  redirect("/checker?mode=speak");
}
