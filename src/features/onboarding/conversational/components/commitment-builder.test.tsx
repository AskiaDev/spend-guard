import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { expect, it } from "vitest";
import { CommitmentBuilder } from "./commitment-builder";
import { createDefaultValues } from "../lib/onboarding-form";

function Harness() {
  const { control } = useForm({ defaultValues: createDefaultValues() });
  return <CommitmentBuilder control={control} examples={["Rent", "Internet"]} />;
}

it("adds a commitment row from an example chip", async () => {
  render(<Harness />);
  await userEvent.click(screen.getByRole("button", { name: "Rent" }));
  expect(screen.getByDisplayValue("Rent")).toBeInTheDocument();
});
