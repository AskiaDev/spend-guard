import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_LITERT_MODEL_URL } from "@/lib/ai/local-model-client";
import type { ModelClient } from "@/lib/ai/types";
import { LocalAdvisorGate } from "./local-advisor-gate";

function client({
  available = true,
  text = "ok",
}: {
  available?: boolean;
  text?: string;
} = {}): ModelClient {
  return {
    id: "local",
    isAvailable: vi.fn(async () => available),
    generateText: vi.fn(async () => text),
  };
}

describe("LocalAdvisorGate", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders children when the local model is not configured", () => {
    render(
      <LocalAdvisorGate providerSpec="cloud" client={client()}>
        <div>checker form</div>
      </LocalAdvisorGate>
    );

    expect(screen.getByText("checker form")).toBeInTheDocument();
  });

  it("blocks the checker when WebGPU is unavailable", async () => {
    render(
      <LocalAdvisorGate providerSpec="local" client={client({ available: false })}>
        <div>checker form</div>
      </LocalAdvisorGate>
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("WebGPU is not available");
    expect(screen.queryByText("checker form")).not.toBeInTheDocument();
  });

  it("asks the user to download the model before showing the checker", async () => {
    const localClient = client();
    const user = userEvent.setup();

    render(
      <LocalAdvisorGate providerSpec="local" client={localClient}>
        <div>checker form</div>
      </LocalAdvisorGate>
    );

    expect(await screen.findByRole("button", { name: /download model/i })).toBeInTheDocument();
    expect(screen.queryByText("checker form")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /download model/i }));

    await waitFor(() => expect(screen.getByText("checker form")).toBeInTheDocument());
    expect(localClient.generateText).toHaveBeenCalledOnce();
  });

  it("does not warm the model again after this browser has already downloaded it", async () => {
    localStorage.setItem(`spendguard:litert-ready:${DEFAULT_LITERT_MODEL_URL}`, "1");
    const localClient = client();

    render(
      <LocalAdvisorGate providerSpec="local" client={localClient}>
        <div>checker form</div>
      </LocalAdvisorGate>
    );

    expect(await screen.findByText("checker form")).toBeInTheDocument();
    expect(localClient.generateText).not.toHaveBeenCalled();
  });
});
