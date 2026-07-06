export function csvField(value: unknown): string {
  let s = String(value ?? "");
  // Neutralize CSV formula injection: a value like "=HYPERLINK(...)" would
  // otherwise execute as a formula when this file is opened in Excel/Sheets.
  // Prefixing with a quote forces literal text.
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header.map(csvField).join(",")];
  for (const row of rows) lines.push(row.map(csvField).join(","));
  return lines.join("\n");
}
