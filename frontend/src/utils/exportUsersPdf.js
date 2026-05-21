import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const formatJoined = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const exportUsersToPdf = ({ users, stats }) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const generatedAt = new Date().toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text("PSTO Calendar — User Directory", 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated ${generatedAt}`, 14, 28);
  doc.text(
    `Total: ${stats.total} · Administrators: ${stats.admins} · Standard accounts: ${stats.staff}`,
    14,
    34,
  );

  doc.setTextColor(15, 23, 42);

  autoTable(doc, {
    startY: 42,
    head: [["Name", "Email", "Code name", "Role", "Joined"]],
    body: users.map((user) => [
      user.name?.trim() || "—",
      user.email ?? "—",
      user.code_name?.trim() || "—",
      user.role ?? "—",
      formatJoined(user.created_at),
    ]),
    styles: { fontSize: 9, cellPadding: 2.5, overflow: "linebreak" },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 58 },
      2: { cellWidth: 32 },
      3: { cellWidth: 24 },
      4: { cellWidth: 28 },
    },
    margin: { left: 14, right: 14 },
  });

  const dateStamp = new Date().toISOString().slice(0, 10);
  doc.save(`psto-users-${dateStamp}.pdf`);
};
