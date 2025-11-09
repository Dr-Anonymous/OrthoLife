export const isTelugu = (text: string): boolean => {
  // Telugu Unicode range
  const teluguRegex = /[\u0C00-\u0C7F]/;
  return teluguRegex.test(text);
};
