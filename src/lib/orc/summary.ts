export const summarizeSection = (heading: string, rawOfficialText: string): string => {
  const text = rawOfficialText.replaceAll(/\s+/g, ' ').trim();
  if (!text) {
    return heading;
  }

  const sentences = text.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
  const summary = sentences.length > 320 ? `${sentences.slice(0, 317)}...` : sentences;
  return `${heading}: ${summary}`.trim();
};
