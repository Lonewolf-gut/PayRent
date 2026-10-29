type LoginExportRow = {
  user?: { email?: string | null } | null;
  email?: string | null;
  userId?: string | null;
  success: boolean;
  ipAddress?: string | null;
  createdAt: string;
};

function getLoginEmail(log: LoginExportRow) {
  return log.user?.email ?? log.email ?? log.userId ?? "—";
}

export function loginLogsToCsv(logs: LoginExportRow[]) {
  const header = ["User", "Result", "IP", "Time"];
  const rows = logs.map((log) => [
    getLoginEmail(log),
    log.success ? "Success" : "Failed",
    log.ipAddress ?? "—",
    new Date(log.createdAt).toLocaleString(),
  ]);
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export function downloadLoginCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadLoginPdf(logs: LoginExportRow[], filename: string) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default;
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text("PayForMe — Login activity", 14, 16);
  doc.setFontSize(10);
  doc.text(`Exported ${new Date().toLocaleString()} · ${logs.length} records`, 14, 23);

  autoTable(doc, {
    startY: 28,
    head: [["User", "Result", "IP", "Time"]],
    body: logs.map((log) => [
      getLoginEmail(log),
      log.success ? "Success" : "Failed",
      log.ipAddress ?? "—",
      new Date(log.createdAt).toLocaleString(),
    ]),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [5, 150, 105] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(filename);
}

export function loginExportFilename(extension: string) {
  const date = new Date().toISOString().slice(0, 10);
  return `payrent-login-activity-${date}.${extension}`;
}
