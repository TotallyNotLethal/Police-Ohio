import { createHash } from 'node:crypto';

export type ChangeResult = {
  hash: string;
  changed: boolean;
};

export const computeSourceHash = (input: string): string =>
  createHash('sha256').update(input).digest('hex');

export const detectChange = (previousHash: string | null | undefined, nextBody: string): ChangeResult => {
  const hash = computeSourceHash(nextBody);
  return {
    hash,
    changed: !previousHash || previousHash !== hash,
  };
};
