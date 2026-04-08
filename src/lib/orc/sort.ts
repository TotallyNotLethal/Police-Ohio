const tokenizeCodeNumber = (value: string): string[] => value.match(/\d+|\D+/g) ?? [value];

export const compareCodeNumbers = (a: string, b: string) => {
  const aTokens = tokenizeCodeNumber(a.trim());
  const bTokens = tokenizeCodeNumber(b.trim());
  const maxLength = Math.max(aTokens.length, bTokens.length);

  for (let index = 0; index < maxLength; index += 1) {
    const aToken = aTokens[index];
    const bToken = bTokens[index];

    if (aToken === undefined) {
      return -1;
    }

    if (bToken === undefined) {
      return 1;
    }

    const aNumber = /^\d+$/.test(aToken);
    const bNumber = /^\d+$/.test(bToken);

    if (aNumber && bNumber) {
      const numericDelta = Number(aToken) - Number(bToken);
      if (numericDelta !== 0) {
        return numericDelta;
      }

      if (aToken.length !== bToken.length) {
        return aToken.length - bToken.length;
      }

      continue;
    }

    const stringDelta = aToken.localeCompare(bToken, 'en-US', { sensitivity: 'base' });
    if (stringDelta !== 0) {
      return stringDelta;
    }
  }

  return 0;
};
