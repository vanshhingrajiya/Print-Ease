export const roundCoord = (value, precision = 6) => {
  if (typeof value !== 'number') return value;
  return Number(value.toFixed(precision));
};
