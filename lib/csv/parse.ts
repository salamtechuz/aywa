/**
 * Tiny RFC-4180-friendly CSV parser. Handles:
 *   - quoted fields with embedded commas, newlines, and escaped quotes ("")
 *   - both LF and CRLF line endings
 *   - a trailing newline at EOF
 *
 * Not a full parser — doesn't handle:
 *   - BOM stripping (do it at the caller)
 *   - exotic Excel quirks (semicolons as separators, etc.)
 */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      // Handle CRLF — skip the LF after a CR.
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      // Drop entirely-empty rows.
      if (!(row.length === 1 && row[0] === "")) rows.push(row);
      row = [];
      continue;
    }
    field += ch;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (!(row.length === 1 && row[0] === "")) rows.push(row);
  }
  return rows;
}

export type ParsedCsv = {
  headers: string[];
  rows: Record<string, string>[];
};

export function parseCsvWithHeader(input: string): ParsedCsv {
  // Strip UTF-8 BOM if present.
  const cleaned = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const raw = parseCsv(cleaned);
  if (raw.length === 0) return { headers: [], rows: [] };
  const headers = raw[0].map((h) => h.trim());
  const rows = raw.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (cells[idx] ?? "").trim();
    });
    return obj;
  });
  return { headers, rows };
}
