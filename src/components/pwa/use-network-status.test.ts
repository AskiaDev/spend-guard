import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useNetworkStatus } from "./use-network-status";

describe("useNetworkStatus", () => {
  it("tracks browser online and offline events", () => {
    const onlineSpy = vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current).toBe(true);

    onlineSpy.mockReturnValue(false);
    act(() => window.dispatchEvent(new Event("offline")));
    expect(result.current).toBe(false);

    onlineSpy.mockReturnValue(true);
    act(() => window.dispatchEvent(new Event("online")));
    expect(result.current).toBe(true);

    onlineSpy.mockRestore();
  });
});
