/**
 * Whole-number floats (4.0, 1e3) do not survive a trip through JavaScript: JSON.parse gives the
 * number 4, JSON.stringify writes "4", and Python then sees an int. Tests care (type(4.0) is
 * float), so integral float literals in authored JSON are rewritten to {"$float": "4.0"} before
 * parsing. The Python harness turns them back into real floats.
 */
export function encodeIntegralFloats(raw: string): string {
  let out = '';
  let i = 0;
  const n = raw.length;
  const numberRe = /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
  while (i < n) {
    const ch = raw[i];
    if (ch === '"') {
      // copy the whole string literal verbatim, honouring escapes
      let j = i + 1;
      while (j < n && raw[j] !== '"') j += raw[j] === '\\' ? 2 : 1;
      out += raw.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (ch === '-' || (ch >= '0' && ch <= '9')) {
      numberRe.lastIndex = i;
      const m = numberRe.exec(raw);
      if (m) {
        const tok = m[0];
        const isFloatLiteral = /[.eE]/.test(tok);
        out += isFloatLiteral && Number.isInteger(Number(tok)) ? `{"$float":"${tok}"}` : tok;
        i += tok.length;
        continue;
      }
    }
    out += ch;
    i++;
  }
  return out;
}
