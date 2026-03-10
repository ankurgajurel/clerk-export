const esc = (code: string) => (s: string) => `\x1b[${code}m${s}\x1b[0m`;

export const c = {
  red: esc("31"),
  green: esc("32"),
  yellow: esc("33"),
  cyan: esc("36"),
  gray: esc("90"),
  bold: esc("1"),
};
