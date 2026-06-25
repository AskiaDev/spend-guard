const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export interface EmergencyFundInput {
  currentSavings: number;
  emergencyBuffer: number;
}

export function calculateEmergencyFundProgress(input: EmergencyFundInput): number {
  if (input.emergencyBuffer <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((input.currentSavings / input.emergencyBuffer) * 100));
}

export function calculateEmergencyBuffer(input: EmergencyFundInput): number {
  return clamp(input.emergencyBuffer, 0, Number.MAX_SAFE_INTEGER);
}
