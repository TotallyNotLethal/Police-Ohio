const collator = new Intl.Collator('en-US', { numeric: true, sensitivity: 'base' });

export const compareCodeNumbers = (a: string, b: string) => collator.compare(a, b);
