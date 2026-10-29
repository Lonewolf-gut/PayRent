type ExportRow = Record<string, unknown>;

function escapeCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function rowsToCsv(rows: ExportRow[]) {
  if (!rows.length) return "No data";
  const headers = Object.keys(rows[0]);
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(",")),
  ].join("\n");
}

export function rowsToExcel(rows: ExportRow[]) {
  const csv = rowsToCsv(rows);
  return `\uFEFF${csv}`;
}

export async function rowsToPdf(
  rows: ExportRow[],
  title: string,
  filename: string
) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default;
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(`PayForMe — ${title}`, 14, 16);
  doc.setFontSize(10);
  doc.text(`Exported ${new Date().toLocaleString()} · ${rows.length} records`, 14, 23);

  if (!rows.length) {
    doc.text("No data", 14, 32);
    doc.save(filename);
    return;
  }

  const headers = Object.keys(rows[0]);
  autoTable(doc, {
    startY: 28,
    head: [headers],
    body: rows.map((row) => headers.map((header) => String(row[header] ?? ""))),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [5, 150, 105] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(filename);
}

export function complianceExportFilename(type: string, format: "csv" | "xlsx" | "pdf") {
  const date = new Date().toISOString().slice(0, 10);
  const extension = format === "xlsx" ? "xlsx" : format;
  return `payforme-${type}-report-${date}.${extension}`;
}
