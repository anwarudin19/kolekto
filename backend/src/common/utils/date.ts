export const startOfMonthUtc = (value = new Date()): Date =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));

export const addDaysUtc = (value: Date, days: number): Date => {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

export const addMonthsUtc = (value: Date, months: number): Date => {
  const result = new Date(value);
  const targetMonth = result.getUTCMonth() + months;
  result.setUTCMonth(targetMonth);
  return result;
};

export const addYearsUtc = (value: Date, years: number): Date => {
  const result = new Date(value);
  result.setUTCFullYear(result.getUTCFullYear() + years);
  return result;
};

export const subDaysUtc = (value: Date, days: number): Date => addDaysUtc(value, -days);

export const createUtcDate = (year: number, month: number, day: number): Date =>
  new Date(Date.UTC(year, month, day));

export const getDaysInMonthUtc = (year: number, month: number): number =>
  new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

export const diffDaysUtc = (from: Date, to: Date): number => {
  const ms = 24 * 60 * 60 * 1000;
  return Math.floor((startOfDayUtc(to).getTime() - startOfDayUtc(from).getTime()) / ms);
};

export const startOfDayUtc = (value: Date): Date =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));

export const isSameUtcDate = (left: Date, right: Date): boolean =>
  startOfDayUtc(left).getTime() === startOfDayUtc(right).getTime();
