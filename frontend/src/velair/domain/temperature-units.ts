export function isFahrenheit(unit: string | undefined): boolean {
  return String(unit ?? "").toUpperCase().includes("F");
}

export function defaultTargetTemperature(unit: string | undefined): number {
  return isFahrenheit(unit) ? 70 : 21;
}

export function defaultMinimumDelta(unit: string | undefined): number {
  return isFahrenheit(unit) ? 1 : 0.3;
}

export function defaultRoomAssistDelta(unit: string | undefined): number {
  return isFahrenheit(unit) ? 4 : 2;
}

export function defaultRoomAssistDeadband(unit: string | undefined): number {
  return isFahrenheit(unit) ? 1 : 0.3;
}

export function defaultMinutesPerDegree(unit: string | undefined): number {
  return isFahrenheit(unit) ? 14 : 25;
}

export function temperatureDeltaMaximum(unit: string | undefined, celsiusMaximum: number): number {
  return isFahrenheit(unit) ? celsiusMaximum * 9 / 5 : celsiusMaximum;
}

export function temperatureDeltaMinimum(unit: string | undefined, celsiusMinimum: number): number {
  return isFahrenheit(unit) ? celsiusMinimum * 9 / 5 : celsiusMinimum;
}

export function minutesPerDegreeBounds(unit: string | undefined): [number, number] {
  return isFahrenheit(unit) ? [0.6, 66.7] : [1, 120];
}

export function absoluteTemperatureBounds(unit: string | undefined): [number, number] {
  return isFahrenheit(unit) ? [-58, 212] : [-50, 100];
}
