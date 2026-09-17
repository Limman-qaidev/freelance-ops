export type ExpenseAmountInput = {
  originalAmount: string;
  originalCurrency: string;
  projectCurrency: string;
  exchangeRateDecimal: string | null;
};

export type ExpenseAmounts = {
  originalAmountMinor: number;
  originalCurrency: string;
  exchangeRateDecimal: string;
  projectAmountMinor: number;
  projectCurrency: string;
};

type ParsedDecimal = {
  numerator: bigint;
  scale: bigint;
  normalized: string;
};

export function calculateExpenseAmounts(input: ExpenseAmountInput): ExpenseAmounts {
  const originalCurrency = normalizeCurrency(input.originalCurrency);
  const projectCurrency = normalizeCurrency(input.projectCurrency);
  const originalMinorDigits = currencyMinorDigits(originalCurrency);
  const projectMinorDigits = currencyMinorDigits(projectCurrency);
  const originalAmountMinor = parseAmountToMinor(
    input.originalAmount,
    originalCurrency,
    originalMinorDigits,
  );

  if (originalCurrency === projectCurrency) {
    return {
      originalAmountMinor,
      originalCurrency,
      exchangeRateDecimal: '1',
      projectAmountMinor: originalAmountMinor,
      projectCurrency,
    };
  }

  if (!input.exchangeRateDecimal?.trim()) {
    throw new Error('An exchange rate is required when expense and project currencies differ.');
  }

  const rate = parsePositiveDecimal(input.exchangeRateDecimal, 'Exchange rate');
  const originalScale = pow10(originalMinorDigits);
  const projectScale = pow10(projectMinorDigits);
  const numerator = BigInt(originalAmountMinor) * rate.numerator * projectScale;
  const denominator = rate.scale * originalScale;
  const projectAmountMinor = safeBigIntToNumber(roundHalfUp(numerator, denominator));

  return {
    originalAmountMinor,
    originalCurrency,
    exchangeRateDecimal: rate.normalized,
    projectAmountMinor,
    projectCurrency,
  };
}

function parseAmountToMinor(value: string, currency: string, minorDigits: number): number {
  const trimmed = value.trim();
  const match = /^(\d+)(?:\.(\d+))?$/.exec(trimmed);
  if (!match) {
    throw new Error('Expense amount must be a non-negative decimal number.');
  }

  const fraction = match[2] ?? '';
  if (fraction.length > minorDigits) {
    throw new Error(
      `${currency} supports ${minorDigits} minor units; the amount has too many decimal places.`,
    );
  }

  const scale = pow10(minorDigits);
  const whole = BigInt(match[1]);
  const fractional = BigInt((fraction + '0'.repeat(minorDigits)).slice(0, minorDigits) || '0');
  return safeBigIntToNumber(whole * scale + fractional);
}

function parsePositiveDecimal(value: string, label: string): ParsedDecimal {
  const trimmed = value.trim();
  const match = /^(\d+)(?:\.(\d+))?$/.exec(trimmed);
  if (!match) {
    throw new Error(`${label} must be a positive decimal number.`);
  }

  const wholeRaw = match[1];
  const fractionRaw = match[2] ?? '';
  const digits = `${wholeRaw}${fractionRaw}`;
  const numerator = BigInt(digits);
  if (numerator <= 0n) {
    throw new Error(`${label} must be greater than zero.`);
  }

  const scale = pow10(fractionRaw.length);
  return {
    numerator,
    scale,
    normalized: normalizeDecimalText(wholeRaw, fractionRaw),
  };
}

function normalizeDecimalText(wholeRaw: string, fractionRaw: string): string {
  const whole = wholeRaw.replace(/^0+(?=\d)/, '') || '0';
  const fraction = fractionRaw.replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole;
}

function roundHalfUp(numerator: bigint, denominator: bigint): bigint {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  return remainder * 2n >= denominator ? quotient + 1n : quotient;
}

function normalizeCurrency(value: string): string {
  const currency = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error('Currency must be a three-letter ISO 4217 code.');
  }
  currencyMinorDigits(currency);
  return currency;
}

function currencyMinorDigits(currency: string): number {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).resolvedOptions().maximumFractionDigits;
  } catch {
    throw new Error(`Currency ${currency} is not supported.`);
  }
}

function pow10(exponent: number): bigint {
  return 10n ** BigInt(exponent);
}

function safeBigIntToNumber(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error('Expense amount exceeds the JavaScript safe integer range.');
  }
  return Number(value);
}
