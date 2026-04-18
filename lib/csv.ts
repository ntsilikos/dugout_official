/**
 * Minimal CSV serializer — no dependencies.
 * Handles commas, quotes, and newlines via proper RFC 4180 quoting.
 */

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => unknown;
}

export function toCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const headerRow = columns.map((c) => escapeCell(c.header)).join(",");
  const dataRows = rows.map((row) =>
    columns.map((c) => escapeCell(c.value(row))).join(",")
  );
  return [headerRow, ...dataRows].join("\n");
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export function centsToUsd(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

export function isoDate(ts: string | null | undefined): string {
  if (!ts) return "";
  return new Date(ts).toISOString().split("T")[0];
}
