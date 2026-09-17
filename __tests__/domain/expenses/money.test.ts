import {
  convertMinorUnitsByDecimalRate,
  parseAmountToMinorUnits,
} from '@/domain/expenses/money';

describe('expense money helpers', () => {
  it('serializes decimal amounts to integer minor units without binary float storage', () => {
    expect(parseAmountToMinorUnits('28.43')).toBe(2843);
    expect(parseAmountToMinorUnits('28,4')).toBe(2840);
    expect(parseAmountToMinorUnits('0.01')).toBe(1);
  });

  it('rejects amounts that cannot be represented with two minor-unit decimals', () => {
    expect(() => parseAmountToMinorUnits('12.345')).toThrow(/minor units/i);
    expect(() => parseAmountToMinorUnits('-1')).toThrow(/amount/i);
  });

  it('applies a decimal-string FX rate using exact integer arithmetic and half-up rounding', () => {
    expect(convertMinorUnitsByDecimalRate(150000, '0.0205')).toBe(3075);
    expect(convertMinorUnitsByDecimalRate(101, '1.005')).toBe(102);
  });
});
