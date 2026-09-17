function assertSafeMinorUnits(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error('Amount exceeds the supported minor-unit range.');
  }
  return Number(value);
}

function normalizeDecimalInput(value: string, label: string): string {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    throw new Error(`${label} must be a positive decimal value.`);
  }
  return normalized;
}

export function parseAmountToMinorUnits(value: string): number {
  const normalized = normalizeDecimalInput(value, 'Amount');
  const [whole, fraction = ''] = normalized.split('.');
  if (fraction.length > 2) {
    throw new Error('Amount cannot contain more than two minor-unit decimals.');
  }

  const minor = BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2));
  return assertSafeMinorUnits(minor);
}

export function normalizeDecimalRate(value: string): string {
  const normalized = normalizeDecimalInput(value, 'FX rate');
  const [rawWhole, rawFraction = ''] = normalized.split('.');
  const whole = rawWhole.replace(/^0+(?=\d)/, '') || '0';
  const fraction = rawFraction.replace(/0+$/, '');
  const result = fraction ? `${whole}.${fraction}` : whole;

  if (/^0(?:\.0*)?$/.test(result)) {
    throw new Error('FX rate must be greater than zero.');
  }
  return result;
}

export function convertMinorUnitsByDecimalRate(
  amountMinor: number,
  rateDecimal: string,
): number {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new Error('Amount must be a non-negative safe integer in minor units.');
  }

  const normalized = normalizeDecimalRate(rateDecimal);
  const [whole, fraction = ''] = normalized.split('.');
  const denominator = 10n ** BigInt(fraction.length);
  const numerator = BigInt(`${whole}${fraction}`);
  const product = BigInt(amountMinor) * numerator;
  const quotient = product / denominator;
  const remainder = product % denominator;
  const rounded = remainder * 2n >= denominator ? quotient + 1n : quotient;

  return assertSafeMinorUnits(rounded);
}

export function formatMinorUnits(amountMinor: number): string {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new Error('Amount must be a non-negative safe integer in minor units.');
  }
  const value = BigInt(amountMinor);
  const whole = value / 100n;
  const fraction = (value % 100n).toString().padStart(2, '0');
  return `${whole}.${fraction}`;
}
