/** Separate display rows without breaking fractions, grouped expressions or LaTeX environments. */
export function splitEquationRows(tex: string): string[] {
  const rows: string[] = [];
  let braces = 0;
  let environments = 0;
  let delimiters = 0;
  let start = 0;

  const addRow = (end: number) => {
    const row = tex.slice(start, end).trim();
    if (row) rows.push(row);
  };

  for (let i = 0; i < tex.length; i++) {
    if (tex[i] === "\\") {
      const environment = tex.slice(i).match(/^\\(begin|end)\s*\{[^}]+\}/);
      if (environment) {
        environments = Math.max(0, environments + (environment[1] === "begin" ? 1 : -1));
        i += environment[0].length - 1;
        continue;
      }
      const delimiter = tex.slice(i).match(/^\\(left|right)\b/);
      if (delimiter) {
        delimiters = Math.max(0, delimiters + (delimiter[1] === "left" ? 1 : -1));
        i += delimiter[0].length - 1;
        continue;
      }
      if (tex[i + 1] === "\\" && braces === 0 && environments === 0 && delimiters === 0) {
        addRow(i);
        i++;
        const spacing = tex.slice(i + 1).match(/^[ \t]*\[[^\]]*\]/);
        if (spacing) i += spacing[0].length;
        start = i + 1;
      } else {
        // Escaped braces and row separators inside environments are not outer delimiters.
        i++;
      }
    } else if (tex[i] === "{") {
      braces++;
    } else if (tex[i] === "}") {
      braces = Math.max(0, braces - 1);
    } else if (tex[i] === "\n" && braces === 0 && environments === 0 && delimiters === 0) {
      const blankLine = tex.slice(i).match(/^\n[ \t]*\n/);
      if (blankLine) {
        addRow(i);
        i += blankLine[0].length - 1;
        start = i + 1;
      }
    }
  }
  addRow(tex.length);
  return rows;
}
