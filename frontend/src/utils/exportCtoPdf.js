import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_W    = 297; // A4 landscape mm
const PAGE_H    = 210;
const MARGIN    = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Brand palette (RGB arrays)
const TEAL    = [13,  148, 136];
const TEAL_LT = [204, 240, 238];
const NAVY    = [15,   23,  42];
const SLATE   = [71,   85, 105];
const MUTED   = [148, 163, 184];
const WHITE   = [255, 255, 255];
const ALT     = [248, 250, 252];
const GREEN   = [5,   150,  105];
const AMBER   = [180, 120,   0];
const ROSE    = [190,  18,  60];
const ROSE_LT = [255, 228, 230];
const YELLOW_LT = [254, 252, 232];
const ORANGE_LT = [255, 237, 213];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const safe = (v) => (v == null ? "" : String(v));

const fmtDate = (v) => {
  if (!v) return "-";
  const d = new Date(`${v}T00:00:00`);
  if (isNaN(d)) return "-";
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
};

const fmtDur = (h, m) => {
  const hh = Number(h) || 0;
  const mm = Number(m) || 0;
  if (!hh && !mm) return "0h";
  if (!mm) return `${hh}h`;
  if (!hh) return `${mm}m`;
  return `${hh}h ${mm}m`;
};

const totalMins = (h, m) => (Number(h) || 0) * 60 + (Number(m) || 0);

/** Returns YYYY-MM-DD string for the expiry date (entry_date + 1 year). */
const expiryDateStr = (entryDate) => {
  const d = new Date(`${entryDate}T00:00:00`);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

const daysUntilExpiry = (entryDate) => {
  const exp = new Date(`${expiryDateStr(entryDate)}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((exp - today) / 86400000);
};

const expiryLabel = (entryDate, balanceMins) => {
  if (!entryDate || balanceMins === 0) return "-";
  const days = daysUntilExpiry(entryDate);
  if (days < 0)   return `Expired ${Math.abs(days)}d ago`;
  if (days === 0)  return "Expires today";
  if (days <= 60)  return `${days}d remaining`;
  return `Exp: ${fmtDate(expiryDateStr(entryDate))}`;
};

// ─── Load DOST logo as base64 ─────────────────────────────────────────────────
const loadLogoBase64 = () =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width  = img.naturalWidth  || 128;
        canvas.height = img.naturalHeight || 128;
        canvas.getContext("2d").drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = "/Assets/dostlogo.png";
  });

// ─── jsPDF shortcut helpers ───────────────────────────────────────────────────
const rRect = (doc, x, y, w, h, r, style = "F") =>
  doc.roundedRect(x, y, w, h, r, r, style);

const setColor = (doc, method, rgb) => doc[method](rgb[0], rgb[1], rgb[2]);

// ─── Decorative cover header ──────────────────────────────────────────────────
const drawCoverHeader = (doc, logoB64, title, subtitle, metaLines) => {
  // Full-width teal banner
  setColor(doc, "setFillColor", TEAL);
  doc.rect(0, 0, PAGE_W, 44, "F");

  // Dark right panel accent (polygon via rect)
  doc.setFillColor(10, 120, 110);
  doc.rect(PAGE_W - 60, 0, 60, 44, "F");

  // Logo
  if (logoB64) {
    try { doc.addImage(logoB64, "PNG", MARGIN, 7, 26, 26); }
    catch { /* skip if corrupt */ }
  }

  // Agency text
  const textX = logoB64 ? MARGIN + 30 : MARGIN;
  doc.setFontSize(7);
  setColor(doc, "setTextColor", WHITE);
  doc.setFont("helvetica", "normal");
  doc.text("Republic of the Philippines", textX, 13);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Department of Science and Technology", textX, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Provincial Science and Technology Office", textX, 27);
  doc.setFontSize(7);
  setColor(doc, "setTextColor", TEAL_LT);
  doc.text("Compensatory Time Off Management System", textX, 34);

  // Report type label top-right
  doc.setFontSize(7);
  setColor(doc, "setTextColor", TEAL_LT);
  doc.setFont("helvetica", "normal");
  doc.text("OFFICIAL DOCUMENT", PAGE_W - MARGIN, 14, { align: "right" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  setColor(doc, "setTextColor", WHITE);
  doc.text("CTO REPORT", PAGE_W - MARGIN, 24, { align: "right" });

  // Title band below banner
  setColor(doc, "setFillColor", ALT);
  doc.rect(0, 44, PAGE_W, 24, "F");
  setColor(doc, "setFillColor", TEAL);
  doc.rect(0, 44, 4, 24, "F");

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  setColor(doc, "setTextColor", NAVY);
  doc.text(safe(title), MARGIN + 6, 54);

  if (subtitle) {
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    setColor(doc, "setTextColor", SLATE);
    doc.text(safe(subtitle), MARGIN + 6, 62);
  }

  // Meta right side
  metaLines.forEach((line, i) => {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", i === 0 ? "bold" : "normal");
    setColor(doc, "setTextColor", i === 0 ? NAVY : MUTED);
    doc.text(safe(line), PAGE_W - MARGIN, 51 + i * 5.5, { align: "right" });
  });

  // Thin divider
  setColor(doc, "setDrawColor", TEAL_LT);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 68, PAGE_W - MARGIN, 68);

  return 73;
};

// ─── Continuation header (pages 2+) ──────────────────────────────────────────
const drawContHeader = (doc, label) => {
  setColor(doc, "setFillColor", TEAL);
  doc.rect(0, 0, PAGE_W, 10, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  setColor(doc, "setTextColor", WHITE);
  doc.text(`DOST PSTO  |  CTO Report  -  ${safe(label)}`, MARGIN, 7);
  doc.setFont("helvetica", "normal");
  doc.text("(continued)", PAGE_W - MARGIN, 7, { align: "right" });
};

// ─── Stat cards ───────────────────────────────────────────────────────────────
const drawStatCards = (doc, cards, startY) => {
  const cardW = (CONTENT_W - (cards.length - 1) * 3) / cards.length;
  cards.forEach(({ label, value, accent }, i) => {
    const ac = accent || TEAL;
    const x  = MARGIN + i * (cardW + 3);

    setColor(doc, "setFillColor", ALT);
    rRect(doc, x, startY, cardW, 18, 2);
    setColor(doc, "setFillColor", ac);
    doc.rect(x, startY, 3, 18, "F");

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    setColor(doc, "setTextColor", NAVY);
    doc.text(safe(value), x + 7, startY + 11);

    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    setColor(doc, "setTextColor", MUTED);
    doc.text(label.toUpperCase(), x + 7, startY + 16);
  });
  return startY + 23;
};

// ─── Section heading strip ────────────────────────────────────────────────────
const drawSection = (doc, text, y) => {
  setColor(doc, "setFillColor", TEAL_LT);
  doc.rect(MARGIN, y, CONTENT_W, 6.5, "F");
  setColor(doc, "setFillColor", TEAL);
  doc.rect(MARGIN, y, 3, 6.5, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  setColor(doc, "setTextColor", TEAL);
  doc.text(text, MARGIN + 6, y + 4.5);
  return y + 10;
};

// ─── Page footers ────────────────────────────────────────────────────────────
const addFooters = (doc, generated) => {
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    const py = PAGE_H - 6;
    setColor(doc, "setFillColor", ALT);
    doc.rect(0, PAGE_H - 11, PAGE_W, 11, "F");
    setColor(doc, "setDrawColor", TEAL_LT);
    doc.setLineWidth(0.3);
    doc.line(0, PAGE_H - 11, PAGE_W, PAGE_H - 11);

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    setColor(doc, "setTextColor", MUTED);
    doc.text("DOST - PSTO  |  Compensatory Time Off Report", MARGIN, py);
    doc.text(`Generated: ${safe(generated)}`, PAGE_W / 2, py, { align: "center" });
    doc.text(`Page ${i} / ${n}`, PAGE_W - MARGIN, py, { align: "right" });
  }
};

// ─── Signature block ─────────────────────────────────────────────────────────
const drawSignatureBlock = (doc, y) => {
  const colW = CONTENT_W / 3;
  const sigs = [
    { role: "Prepared by:",  title: "Administrative Staff" },
    { role: "Reviewed by:",  title: "Section Chief"        },
    { role: "Noted by:",     title: "PSTO Director"        },
  ];
  sigs.forEach(({ role, title }, i) => {
    const x = MARGIN + i * colW;
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    setColor(doc, "setTextColor", MUTED);
    doc.text(role, x, y);

    setColor(doc, "setDrawColor", NAVY);
    doc.setLineWidth(0.3);
    doc.line(x, y + 10, x + colW - 10, y + 10);

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    setColor(doc, "setTextColor", NAVY);
    doc.text(title, x, y + 14);
  });
};

// ─── Mini bar chart (fixed x offset parameter) ───────────────────────────────
const drawMiniBarChart = (doc, rows, startY, startX, chartW) => {
  const BAR_H   = 5.2;
  const GAP     = 2.8;
  const LABEL_W = 36;
  const VAL_W   = 22;
  const barAreaW = chartW - LABEL_W - VAL_W - 4;
  const maxM     = Math.max(...rows.map((r) => r.totalMins), 1);

  let y = startY;
  rows.forEach((r, i) => {
    const barW = Math.max((r.totalMins / maxM) * barAreaW, 0.5);

    if (i % 2 === 0) {
      setColor(doc, "setFillColor", ALT);
      doc.rect(startX, y - 1, chartW, BAR_H + 1.5, "F");
    }

    // Name
    const nm = r.name.length > 17 ? r.name.slice(0, 16) + "." : r.name;
    doc.setFontSize(6);
    doc.setFont("helvetica", i === 0 ? "bold" : "normal");
    setColor(doc, "setTextColor", i === 0 ? TEAL : SLATE);
    doc.text(nm, startX + 1, y + BAR_H - 1.5);

    // Bar
    const bx = startX + LABEL_W;
    setColor(doc, "setFillColor", i === 0 ? TEAL : [180, 210, 220]);
    rRect(doc, bx, y + 0.5, barW, BAR_H - 1, 1);

    // Value
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "bold");
    setColor(doc, "setTextColor", NAVY);
    doc.text(fmtDur(r.balance.hours, r.balance.minutes), bx + barAreaW + 2, y + BAR_H - 1);

    y += BAR_H + GAP;
  });
  return y + 2;
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT 1: Single-person CTO ledger
// ═══════════════════════════════════════════════════════════════════════════════
export const exportPersonCtoPdf = async ({ personName, entries, balance }) => {
  const logoB64   = await loadLogoBase64();
  const generated = new Date().toLocaleString("en-PH", { dateStyle: "long", timeStyle: "short" });
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const otMins  = entries.reduce((s, e) => s + totalMins(e.overtimeHours, e.overtimeMinutes), 0);
  const offMins = entries.reduce((s, e) => s + totalMins(e.offsetHours,   e.offsetMinutes),   0);
  const balMins = totalMins(balance.hours, balance.minutes);

  let y = drawCoverHeader(
    doc, logoB64,
    "Compensatory Time Off Ledger",
    `Employee: ${personName}`,
    [
      `Date Generated: ${generated}`,
      "Reference Period: All Records",
      "Status: Official Document",
    ],
  );

  y = drawStatCards(doc, [
    { label: "Total Entries",     value: String(entries.length),                               accent: NAVY  },
    { label: "Total Overtime",    value: fmtDur(Math.floor(otMins/60),  otMins%60),            accent: TEAL  },
    { label: "Total Offset Used", value: fmtDur(Math.floor(offMins/60), offMins%60),           accent: AMBER },
    { label: "Current Balance",   value: fmtDur(balance.hours, balance.minutes),
      accent: balMins > 0 ? GREEN : MUTED },
  ], y);

  y = drawSection(doc, "DETAILED CTO ENTRIES", y);

  const tableBody = entries.map((e, i) => {
    const bMins = totalMins(e.balanceHours, e.balanceMinutes);
    return [
      String(i + 1),
      fmtDate(e.entryDate),
      safe(e.particulars?.trim() || "-"),
      fmtDur(e.overtimeHours, e.overtimeMinutes),
      fmtDate(e.offsetDate),
      fmtDur(e.offsetHours, e.offsetMinutes),
      fmtDur(e.balanceHours, e.balanceMinutes),
      expiryLabel(e.entryDate, bMins),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["No.", "Entry Date", "Particulars / Activity", "Overtime", "Offset Date", "Offset Used", "Balance", "Expiry"]],
    body: tableBody,
    styles:      { fontSize: 7.5, cellPadding: 2.8, overflow: "linebreak", textColor: NAVY },
    headStyles:  { fillColor: NAVY, textColor: WHITE, fontStyle: "bold", fontSize: 7, halign: "center" },
    alternateRowStyles: { fillColor: ALT },
    columnStyles: {
      0: { cellWidth: 8,  halign: "center" },
      1: { cellWidth: 24 },
      2: { cellWidth: 74 },
      3: { cellWidth: 18, halign: "center" },
      4: { cellWidth: 24 },
      5: { cellWidth: 18, halign: "center" },
      6: { cellWidth: 20, halign: "center", fontStyle: "bold" },
      7: { cellWidth: 29, halign: "center" },
    },
    margin: { left: MARGIN, right: MARGIN, bottom: 18 },
    didParseCell: (d) => {
      if (d.section !== "body") return;
      const e = entries[d.row.index];
      if (!e) return;
      const bMins = totalMins(e.balanceHours, e.balanceMinutes);
      if (d.column.index === 6) {
        d.cell.styles.textColor = bMins > 0 ? GREEN : MUTED;
      }
      if (d.column.index === 7 && e.entryDate && bMins > 0) {
        const days = daysUntilExpiry(e.entryDate);
        if (days < 0)        { d.cell.styles.fillColor = ROSE_LT;   d.cell.styles.textColor = ROSE;  }
        else if (days <= 7)  { d.cell.styles.fillColor = ORANGE_LT; d.cell.styles.textColor = AMBER; }
        else if (days <= 60) { d.cell.styles.fillColor = YELLOW_LT; d.cell.styles.textColor = AMBER; }
      }
    },
    didDrawPage: (d) => { if (d.pageNumber > 1) drawContHeader(doc, personName); },
  });

  // Balance summary banner
  const finalY = (doc.lastAutoTable?.finalY ?? 160) + 6;
  if (finalY + 14 < PAGE_H - 18) {
    setColor(doc, "setFillColor", TEAL);
    rRect(doc, MARGIN, finalY, CONTENT_W, 12, 2);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    setColor(doc, "setTextColor", WHITE);
    doc.text(
      `CURRENT BALANCE:  ${fmtDur(balance.hours, balance.minutes)}`,
      PAGE_W / 2, finalY + 8, { align: "center" },
    );
  }

  // Signature block
  const sigY = (doc.lastAutoTable?.finalY ?? 160) + 26;
  if (sigY + 18 < PAGE_H - 13) drawSignatureBlock(doc, sigY);

  addFooters(doc, generated);
  const slug = personName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  doc.save(`CTO-Ledger_${slug}_${new Date().toISOString().slice(0, 10)}.pdf`);
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT 2: All-profiles summary
// ═══════════════════════════════════════════════════════════════════════════════
export const exportAllCtoPdf = async ({ profiles, allBalances }) => {
  const logoB64   = await loadLogoBase64();
  const generated = new Date().toLocaleString("en-PH", { dateStyle: "long", timeStyle: "short" });
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const pLabel = (p) =>
    safe(p?.code_name?.trim() || p?.name?.trim() || p?.email?.trim() || `User #${p.id}`);

  const rows = profiles.map((p) => {
    const b = allBalances[String(p.id)] ?? { hours: 0, minutes: 0 };
    return { name: pLabel(p), email: safe(p.email || "-"), balance: b, totalMins: b.hours * 60 + b.minutes };
  }).sort((a, b) => b.totalMins - a.totalMins);

  const totalTeamMins = rows.reduce((s, r) => s + r.totalMins, 0);
  const nonZero       = rows.filter((r) => r.totalMins > 0).length;
  const avgMins       = rows.length ? Math.round(totalTeamMins / rows.length) : 0;
  const highest       = rows[0];

  let y = drawCoverHeader(
    doc, logoB64,
    "CTO Balance Summary - All Team Members",
    `Covering ${profiles.length} personnel  |  Sorted by balance (highest first)`,
    [
      `Date Generated: ${generated}`,
      `Total Team CTO: ${fmtDur(Math.floor(totalTeamMins/60), totalTeamMins%60)}`,
    ],
  );

  y = drawStatCards(doc, [
    { label: "Team Members",    value: String(profiles.length),                                        accent: NAVY  },
    { label: "With Balance",    value: String(nonZero),                                                accent: TEAL  },
    { label: "Total Team CTO",  value: fmtDur(Math.floor(totalTeamMins/60), totalTeamMins%60),        accent: GREEN },
    { label: "Average Balance", value: fmtDur(Math.floor(avgMins/60), avgMins%60),                    accent: AMBER },
    { label: "Highest Balance", value: highest ? fmtDur(highest.balance.hours, highest.balance.minutes) : "0h", accent: TEAL },
  ], y);

  // Split: table left (~60%), bar chart right (~40%)
  const TABLE_W = Math.floor(CONTENT_W * 0.60);
  const CHART_W = CONTENT_W - TABLE_W - 5;
  const chartX  = MARGIN + TABLE_W + 5;

  y = drawSection(doc, "PERSONNEL CTO BALANCE REGISTER", y);
  const tableStartY = y;

  autoTable(doc, {
    startY: y,
    tableWidth: TABLE_W,
    head: [["#", "Name / Code Name", "Email", "Hrs", "Balance", "Status"]],
    body: rows.map((r, i) => [
      String(i + 1),
      r.name,
      r.email,
      (r.totalMins / 60).toFixed(2),
      fmtDur(r.balance.hours, r.balance.minutes),
      r.totalMins > 480 ? "High" : r.totalMins > 0 ? "Active" : "None",
    ]),
    styles:      { fontSize: 7.5, cellPadding: 2.5, overflow: "linebreak", textColor: NAVY },
    headStyles:  { fillColor: NAVY, textColor: WHITE, fontStyle: "bold", fontSize: 7 },
    alternateRowStyles: { fillColor: ALT },
    columnStyles: {
      0: { cellWidth: 8,  halign: "center" },
      1: { cellWidth: 46 },
      2: { cellWidth: 52 },
      3: { cellWidth: 16, halign: "right" },
      4: { cellWidth: 20, halign: "right", fontStyle: "bold" },
      5: { cellWidth: 16, halign: "center" },
    },
    margin: { left: MARGIN, right: MARGIN + CHART_W + 5, bottom: 18 },
    didParseCell: (d) => {
      if (d.section !== "body") return;
      const r = rows[d.row.index];
      if (!r) return;
      if (d.column.index === 4) d.cell.styles.textColor = r.totalMins > 0 ? GREEN : MUTED;
      if (d.column.index === 5) {
        if      (r.totalMins > 480) { d.cell.styles.fillColor = ROSE_LT;       d.cell.styles.textColor = ROSE;  }
        else if (r.totalMins > 0)   { d.cell.styles.fillColor = [209,250,229]; d.cell.styles.textColor = GREEN; }
        else                        { d.cell.styles.textColor = MUTED; }
      }
    },
    didDrawPage: (d) => { if (d.pageNumber > 1) drawContHeader(doc, "All Team Members"); },
  });

  const tableEndY = doc.lastAutoTable?.finalY ?? 160;

  // Bar chart panel (right side, page 1 only)
  const chartH = tableEndY - tableStartY + 2;
  setColor(doc, "setFillColor", ALT);
  rRect(doc, chartX - 2, tableStartY - 4, CHART_W + 4, Math.max(chartH + 4, 50), 2);

  // Chart heading
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  setColor(doc, "setTextColor", TEAL);
  doc.text("BALANCE DISTRIBUTION", chartX + 2, tableStartY + 2);

  setColor(doc, "setDrawColor", TEAL_LT);
  doc.setLineWidth(0.2);
  doc.line(chartX - 1, tableStartY + 5, chartX + CHART_W - 1, tableStartY + 5);

  const chartRows = rows.slice(0, 18);
  drawMiniBarChart(doc, chartRows, tableStartY + 8, chartX + 1, CHART_W - 3);

  // Signature block
  const sigY = tableEndY + 10;
  if (sigY + 18 < PAGE_H - 13) drawSignatureBlock(doc, sigY);

  addFooters(doc, generated);
  doc.save(`CTO-Summary_All-Staff_${new Date().toISOString().slice(0, 10)}.pdf`);
};
