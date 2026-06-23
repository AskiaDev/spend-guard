export const referenceGoals: Record<string, { helperText: string }> = {
  goal_emergency: {
    helperText: "Protect the next few months before taking on flexible wants.",
  },
};

export const referencePurchases: Record<
  string,
  {
    category: string;
    vendorStyle: string;
  }
> = {
  check_work_bag: {
    category: "Work essentials",
    vendorStyle: "Retail purchase",
  },
  check_weekend_trip: {
    category: "Lifestyle",
    vendorStyle: "Travel booking",
  },
};

export const exampleOnlyPurchaseReferences = [
  "Grocery restock from a supermarket",
  "Replacement tech from an electronics store",
];

export const advisorInsight = {
  title: "Keep the guardrail active",
  body: "Your plan is healthiest when free cash flow stays positive, savings keep moving toward the emergency target, and wants do not become revolving debt.",
};
