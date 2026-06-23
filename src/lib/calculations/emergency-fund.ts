const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export interface EmergencyFundInput {
  currentSavings: number;
  emergencyFundTarget: number;
}

export function calculateEmergencyFundProgress(input: EmergencyFundInput): number {
  if (input.emergencyFundTarget <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.round((input.currentSavings / input.emergencyFundTarget) * 100)
  );
}

export function calculateEmergencyBuffer(input: EmergencyFundInput): number {
  if (input.emergencyFundTarget <= 0 || input.currentSavings <= 0) {
    return 0;
  }

  return clamp(input.emergencyFundTarget * 0.2, 0, input.currentSavings);
}
