import type { AdminUserExportRow } from "@/lib/admin/users-query";
import { usersToCsvRows } from "@/lib/admin/users-query";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadUsersCsv(csv: string, filename: string) {
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), filename);
}

export async function downloadUsersPdf(users: AdminUserExportRow[], filename: string) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default;

  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text("PayRent — User list", 14, 16);
  doc.setFontSize(10);
  doc.text(`Exported ${new Date().toLocaleString()} · ${users.length} users`, 14, 23);

  autoTable(doc, {
    startY: 28,
    head: [["Email", "Role", "Status", "Failed logins", "Joined"]],
    body: usersToCsvRows(users).slice(1),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [5, 150, 105] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(filename);
}

export function exportFilename(prefix: string, extension: string) {
  const date = new Date().toISOString().slice(0, 10);
  return `${prefix}-${date}.${extension}`;
}
