const SYNONYM_GROUPS = [
  ['ovi', 'dui', 'operating vehicle under the influence', 'driving under the influence'],
  ['ccw', 'concealed carry', 'carrying concealed weapons', 'concealed handgun'],
  ['paraphernalia', 'drug paraphernalia', 'drug abuse instruments'],
  ['trespass', 'criminal trespass', 'trespassing', 'aggravated trespass'],
  ['domestic violence', 'family violence', 'dv'],
  ['protection order', 'restraining order', 'tpo', 'cpo'],
  ['assault', 'felonious assault', 'simple assault'],
  ['theft', 'stealing', 'larceny'],
] as const;

const termToSynonyms = new Map<string, string[]>();
for (const group of SYNONYM_GROUPS) {
  for (const term of group) {
    termToSynonyms.set(term, [...group]);
  }
}

export const expandSynonyms = (term: string): string[] => {
  const normalized = term.trim().toLowerCase();
  return termToSynonyms.get(normalized) ?? [normalized];
};
