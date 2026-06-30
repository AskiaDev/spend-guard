export function sanitizeNonNegativeNumberInput(value: string) {
  let sanitized = "";
  let sawDecimal = false;

  for (const character of value) {
    if (character >= "0" && character <= "9") {
      sanitized += character;
      continue;
    }

    if (character === "." && !sawDecimal) {
      sanitized += character;
      sawDecimal = true;
    }
  }

  return sanitized;
}

export function isBlockedNonNegativeNumberKey(key: string) {
  return key === "-" || key === "+" || key === "e" || key === "E";
}
