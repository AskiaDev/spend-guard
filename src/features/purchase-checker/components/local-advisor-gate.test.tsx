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
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This browser or installed PWA cannot download the on-device advisor model"
    );
    expect(screen.queryByText("checker form")).not.toBeInTheDocument();
  });

  it("keeps the checker usable when a fallback advisor provider is configured", async () => {
    render(
      <LocalAdvisorGate providerSpec="local,cloud" client={client({ available: false })}>
        <div>checker form</div>
      </LocalAdvisorGate>
    );

    expect(await screen.findByText("checker form")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("WebGPU is not available");
    expect(screen.getByRole("alert")).toHaveTextContent("fallback advisor path");
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

  it("offers local model download without blocking when a fallback is configured", async () => {
    const localClient = client();
    const user = userEvent.setup();

    render(
      <LocalAdvisorGate providerSpec="local,cloud" client={localClient}>
        <div>checker form</div>
      </LocalAdvisorGate>
    );

    expect(await screen.findByText("checker form")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download model/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /download model/i }));

    await waitFor(() => expect(screen.queryByRole("button", { name: /download model/i })).not.toBeInTheDocument());
    expect(localClient.generateText).toHaveBeenCalledOnce();
  });

  it("renders children and warms the local model in the background when it was already downloaded", async () => {
    localStorage.setItem(`spendguard:litert-ready:${DEFAULT_LITERT_MODEL_URL}`, "1");
    const localClient = client();

    render(
      <LocalAdvisorGate providerSpec="local" client={localClient}>
        <div>checker form</div>
      </LocalAdvisorGate>
    );

    expect(await screen.findByText("checker form")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /download model/i })).not.toBeInTheDocument();
    await waitFor(() => expect(localClient.generateText).toHaveBeenCalledOnce());
  });
});
