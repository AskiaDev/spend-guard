"use client";

import { Download, RotateCw } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { InlineNotice } from "@/components/feedback/inline-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEFAULT_LITERT_MODEL_URL,
  getLocalModelClient,
} from "@/lib/ai/local-model-client";
import type { ModelClient } from "@/lib/ai/types";

const READY_KEY_PREFIX = "spendguard:litert-ready";
const WARMUP_INPUT = {
  system: "You are a local model readiness check. Reply with OK.",
  prompt: "Reply with OK.",
};

type GateStatus =
  | "checking"
  | "needs-download"
  | "downloading"
  | "ready"
  | "unsupported"
  | "failed";

export function usesLocalProvider(
  providerSpec: string | undefined = process.env.NEXT_PUBLIC_AI_PROVIDER
): boolean {
  return (providerSpec ?? "")
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .includes("local");
}

function readyKey(modelUrl: string): string {
  return `${READY_KEY_PREFIX}:${modelUrl}`;
}

function hasReadyFlag(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function setReadyFlag(key: string) {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // Private browsing or strict storage settings should not block the warmed model.
  }
}

export function LocalAdvisorGate({
  children,
  client,
  providerSpec,
}: {
  children: ReactNode;
  client?: ModelClient;
  providerSpec?: string;
}) {
  const shouldGate = usesLocalProvider(providerSpec);
  const localClient = useMemo(() => client ?? getLocalModelClient(), [client]);
  const modelUrl = process.env.NEXT_PUBLIC_LITERT_MODEL_URL ?? DEFAULT_LITERT_MODEL_URL;
  const storageKey = readyKey(modelUrl);
  const [status, setStatus] = useState<GateStatus>(shouldGate ? "checking" : "ready");
  const [probe, setProbe] = useState(0);
  const warmupRunRef = useRef(0);

  const warmModel = useCallback(async () => {
    const run = warmupRunRef.current + 1;
    warmupRunRef.current = run;
    setStatus("downloading");
    try {
      await localClient.generateText(WARMUP_INPUT);
      if (warmupRunRef.current !== run) return;
      setReadyFlag(storageKey);
      setStatus("ready");
    } catch {
      if (warmupRunRef.current !== run) return;
      setStatus("failed");
    }
  }, [localClient, storageKey]);

  useEffect(() => {
    if (!shouldGate) {
      return;
    }

    let cancelled = false;

    async function detect() {
      const available = await localClient.isAvailable();
      if (cancelled) return;

      if (!available) {
        setStatus("unsupported");
        return;
      }

      if (hasReadyFlag(storageKey)) {
        setStatus("ready");
        return;
      }

      setStatus("needs-download");
    }

    void detect();

    return () => {
      cancelled = true;
      warmupRunRef.current += 1;
    };
  }, [localClient, probe, shouldGate, storageKey]);

  if (!shouldGate || status === "ready") {
    return children;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Local advisor setup</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {status === "unsupported" ? (
          <>
            <InlineNotice tone="error" title="WebGPU is not available">
              Use a WebGPU-capable Chrome or Edge browser, then reload this page.
            </InlineNotice>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setStatus("checking");
                setProbe((value) => value + 1);
              }}
            >
              <RotateCw className="size-4" aria-hidden="true" />
              Check again
            </Button>
          </>
        ) : null}

        {status === "checking" ? (
          <InlineNotice tone="warning" title="Checking local model support">
            SpendGuard is checking whether this browser can run the on-device advisor.
          </InlineNotice>
        ) : null}

        {status === "needs-download" ? (
          <>
            <InlineNotice tone="warning" title="Download the local advisor model">
              The purchase checker is waiting for the on-device model before continuing.
            </InlineNotice>
            <Button type="button" onClick={() => void warmModel()}>
              <Download className="size-4" aria-hidden="true" />
              Download model
            </Button>
          </>
        ) : null}

        {status === "downloading" ? (
          <Button type="button" isLoading loadingText="Downloading model...">
            Download model
          </Button>
        ) : null}

        {status === "failed" ? (
          <>
            <InlineNotice tone="error" title="Local model is not ready">
              The model could not finish loading in this browser. Check WebGPU support and try again.
            </InlineNotice>
            <Button type="button" onClick={() => void warmModel()}>
              <RotateCw className="size-4" aria-hidden="true" />
              Retry download
            </Button>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
