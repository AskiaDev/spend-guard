"use client";

import { Keyboard, Mic } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VoicePurchaseChecker } from "@/features/voice";
import type { PurchaseInput, VoicePurchaseDraft } from "@/types/finance";
import { PurchaseCheckerWizard } from "./purchase-checker-wizard";

type CheckerMode = "type" | "speak";

interface CheckerSurfaceProps {
  onRunCheck: (purchase: PurchaseInput) => Promise<unknown>;
  onSaveVoiceSession?: (draft: VoicePurchaseDraft) => Promise<void>;
}

function toMode(value: string | null | undefined): CheckerMode {
  return value === "speak" ? "speak" : "type";
}

export function CheckerSurface({ onRunCheck, onSaveVoiceSession }: CheckerSurfaceProps) {
  const router = useRouter();
  // searchParams can be null during streaming or when rendered without a provider.
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<CheckerMode>(() => toMode(searchParams?.get("mode")));

  function handleModeChange(next: string) {
    const selected = toMode(next);
    setMode(selected);

    // Keep ?mode shareable, but the tab is driven by local state so switching never
    // depends on a server round-trip resolving first.
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("mode", selected);
    router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <Tabs value={mode} onValueChange={handleModeChange} className="gap-6">
      <TabsList className="h-11 w-full max-w-md p-1">
        <TabsTrigger value="type" className="gap-2">
          <Keyboard aria-hidden="true" />
          Type
        </TabsTrigger>
        <TabsTrigger value="speak" className="gap-2">
          <Mic aria-hidden="true" />
          Speak
        </TabsTrigger>
      </TabsList>

      <TabsContent value="type">
        <PurchaseCheckerWizard onRunCheck={onRunCheck} />
      </TabsContent>

      <TabsContent value="speak">
        <VoicePurchaseChecker onRunCheck={onRunCheck} onSaveVoiceSession={onSaveVoiceSession} />
      </TabsContent>
    </Tabs>
  );
}
