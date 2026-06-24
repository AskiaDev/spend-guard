import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FinancialDisclaimer } from "./financial-disclaimer";

describe("FinancialDisclaimer", () => {
  it("states it is educational and not financial advice in the footer variant", () => {
    render(<FinancialDisclaimer />);

    const note = screen.getByRole("complementary", { name: "Financial disclaimer" });
    expect(note).toHaveTextContent(
      "not financial, investment, tax, or legal advice"
    );
    expect(note).toHaveTextContent("educational estimates");
  });

  it("states the deterministic engine decides and the advisor only explains", () => {
    render(<FinancialDisclaimer />);

    const note = screen.getByRole("complementary", { name: "Financial disclaimer" });
    expect(note).toHaveTextContent("rules engine makes every decision");
    expect(note).toHaveTextContent("advisor only explains");
  });

  it("renders a compact inline variant for the advisor surface", () => {
    render(<FinancialDisclaimer variant="inline" />);

    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    expect(screen.getByText("Not financial advice.")).toBeVisible();
    expect(
      screen.getByText(/based only on the numbers you entered/i)
    ).toBeVisible();
  });

  it("appends caller class names", () => {
    render(<FinancialDisclaimer className="mt-10" />);

    expect(screen.getByRole("complementary", { name: "Financial disclaimer" })).toHaveClass(
      "mt-10"
    );
  });
});
