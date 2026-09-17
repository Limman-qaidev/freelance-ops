import { calculateExpenseAmounts } from '../../../src/application/expenses/expense-money';

describe('expense money calculations', () => {
  it('serializes decimal money to integer minor units without binary floating-point truth', () => {
    expect(
      calculateExpenseAmounts({
        originalAmount: '28.43',
        originalCurrency: 'EUR',
        projectCurrency: 'EUR',
        exchangeRateDecimal: null,
      }),
    ).toEqual({
      originalAmountMinor: 2843,
      originalCurrency: 'EUR',
      exchangeRateDecimal: '1',
      projectAmountMinor: 2843,
      projectCurrency: 'EUR',
    });
  });

  it('converts currencies using the persisted decimal-string rate and rounds to project minor units', () => {
    expect(
      calculateExpenseAmounts({
        originalAmount: '12.34',
        originalCurrency: 'USD',
        projectCurrency: 'EUR',
        exchangeRateDecimal: '0.9',
      }),
    ).toEqual({
      originalAmountMinor: 1234,
      originalCurrency: 'USD',
      exchangeRateDecimal: '0.9',
      projectAmountMinor: 1111,
      projectCurrency: 'EUR',
    });
  });

  it('rejects malformed money, missing FX, unsupported currencies and unsafe integer results', () => {
    expect(() =>
      calculateExpenseAmounts({
        originalAmount: '12.345',
        originalCurrency: 'EUR',
        projectCurrency: 'EUR',
        exchangeRateDecimal: null,
      }),
    ).toThrow(/minor units/i);

    expect(() =>
      calculateExpenseAmounts({
        originalAmount: '12.34',
        originalCurrency: 'USD',
        projectCurrency: 'EUR',
        exchangeRateDecimal: null,
      }),
    ).toThrow(/exchange rate/i);

    expect(() =>
      calculateExpenseAmounts({
        originalAmount: '12.34',
        originalCurrency: 'ZZZ',
        projectCurrency: 'EUR',
        exchangeRateDecimal: '1',
      }),
    ).toThrow(/not supported/i);

    expect(() =>
      calculateExpenseAmounts({
        originalAmount: '999999999999999999999',
        originalCurrency: 'EUR',
        projectCurrency: 'EUR',
        exchangeRateDecimal: null,
      }),
    ).toThrow(/safe integer/i);
  });
});
