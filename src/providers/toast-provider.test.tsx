import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ToastProvider } from "./toast-provider";

describe("ToastProvider", () => {
  it("renders without crashing", () => {
    const { container } = render(<ToastProvider />);
    expect(container).toBeTruthy();
  });
});
