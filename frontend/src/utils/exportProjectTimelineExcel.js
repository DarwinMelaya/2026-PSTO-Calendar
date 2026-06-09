import ExcelJS from "exceljs";
import {
  ENTRY_STATUS_META,
  formatEntryDate,
  groupEntriesByMonth,
  inferEntryStatus,
  projectProgramLabel,
  summarizeMonth,
} from "./projectTimeline";

const PROGRAM_THEME = {
  SETUP: { header: "FF047857", accent: "FFD1FAE5", light: "FFECFDF5" },
  GIA: { header: "FF1D4ED8", accent: "FFDBEAFE", light: "FFEFF6FF" },
  SSCP: { header: "FF6D28D9", accent: "FFEDE9FE", light: "FFF5F3FF" },
  CEST: { header: "FFD97706", accent: "FFFEF3C7", light: "FFFFFBEB" },
};

const STATUS_FILL = {
  issue: "FFFEF3C7",
  resolved: "FFD1FAE5",
  update: "FFEFF6FF",
};

const thinBorder = {
  top: { style: "thin", color: { argb: "FFE2E8F0" } },
  left: { style: "thin", color: { argb: "FFE2E8F0" } },
  bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
  right: { style: "thin", color: { argb: "FFE2E8F0" } },
};

const fillCell = (cell, argb, options = {}) => {
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb },
  };
  if (options.font) cell.font = options.font;
  if (options.alignment) cell.alignment = options.alignment;
  if (options.border !== false) cell.border = thinBorder;
};

const mergeRow = (ws, row, fromCol, toCol) => {
  ws.mergeCells(row, fromCol, row, toCol);
};

const sanitizeFilename = (title) =>
  (title ?? "project")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 48) || "project";

export const exportProjectTimelineExcel = async ({ project, entries }) => {
  const theme = PROGRAM_THEME[project.program] ?? {
    header: "FF1E3A8A",
    accent: "FFDBEAFE",
    light: "FFF8FAFC",
  };

  const generatedAt = new Date().toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const monthGroups = groupEntriesByMonth(entries, { newestFirst: true });
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PSTO Calendar";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Timeline Report", {
    views: [{ showGridLines: false }],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75 },
    },
  });

  ws.columns = [
    { width: 6 },
    { width: 20 },
    { width: 14 },
    { width: 58 },
    { width: 28 },
  ];

  let row = 1;

  mergeRow(ws, row, 1, 5);
  const orgCell = ws.getCell(row, 1);
  orgCell.value = "DEPARTMENT OF SCIENCE AND TECHNOLOGY";
  fillCell(orgCell, theme.header, {
    font: { bold: true, size: 11, color: { argb: "FFFFFFFF" } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: false,
  });
  ws.getRow(row).height = 22;
  row += 1;

  mergeRow(ws, row, 1, 5);
  const subtitleCell = ws.getCell(row, 1);
  subtitleCell.value = "PSTO Marinduque · Project Timeline Report";
  fillCell(subtitleCell, theme.header, {
    font: { bold: true, size: 10, color: { argb: "FFE0E7FF" } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: false,
  });
  ws.getRow(row).height = 20;
  row += 1;

  mergeRow(ws, row, 1, 5);
  ws.getRow(row).height = 8;
  row += 1;

  const metaRows = [
    ["Program", projectProgramLabel(project.program)],
    ["Project Title", project.title ?? "—"],
    ["Location", project.location?.trim() || "—"],
    ["Generated", generatedAt],
    ["Total Entries", String(entries.length)],
  ];

  for (const [label, value] of metaRows) {
    const labelCell = ws.getCell(row, 1);
    labelCell.value = label;
    fillCell(labelCell, theme.light, {
      font: { bold: true, size: 10, color: { argb: "FF334155" } },
      alignment: { vertical: "middle", wrapText: true },
    });
    mergeRow(ws, row, 2, 5);
    const valueCell = ws.getCell(row, 2);
    valueCell.value = value;
    fillCell(valueCell, "FFFFFFFF", {
      font: { size: 10, color: { argb: "FF0F172A" } },
      alignment: { vertical: "middle", wrapText: true },
    });
    ws.getRow(row).height = label === "Project Title" ? 28 : 20;
    row += 1;
  }

  row += 1;

  if (monthGroups.length === 0) {
    mergeRow(ws, row, 1, 5);
    const emptyCell = ws.getCell(row, 1);
    emptyCell.value = "No timeline entries recorded for this project.";
    fillCell(emptyCell, "FFF8FAFC", {
      font: { italic: true, size: 10, color: { argb: "FF64748B" } },
      alignment: { horizontal: "center", vertical: "middle" },
    });
    ws.getRow(row).height = 24;
  } else {
    let entryNo = 1;

    for (const group of monthGroups) {
      mergeRow(ws, row, 1, 5);
      const monthCell = ws.getCell(row, 1);
      monthCell.value = `${group.label}  ·  ${summarizeMonth(group.entries)}`;
      fillCell(monthCell, theme.accent, {
        font: { bold: true, size: 11, color: { argb: "FF0F172A" } },
        alignment: { horizontal: "left", vertical: "middle", indent: 1 },
      });
      ws.getRow(row).height = 24;
      row += 1;

      const headers = ["No.", "Date", "Status", "Remarks", "Photo"];
      headers.forEach((header, index) => {
        const cell = ws.getCell(row, index + 1);
        cell.value = header;
        fillCell(cell, theme.header, {
          font: { bold: true, size: 10, color: { argb: "FFFFFFFF" } },
          alignment: {
            horizontal: index === 3 ? "left" : "center",
            vertical: "middle",
          },
        });
      });
      ws.getRow(row).height = 22;
      row += 1;

      for (const entry of group.entries) {
        const status = inferEntryStatus(entry.remarks);
        const statusLabel = ENTRY_STATUS_META[status].label;
        const remarks = entry.remarks?.trim() || "No remarks recorded.";
        const dateText = formatEntryDate(entry.entry_date);
        const hasPhoto = Boolean(entry.photo_url);

        const values = [
          entryNo,
          dateText,
          statusLabel,
          remarks,
          hasPhoto ? "View photo" : "—",
        ];

        values.forEach((value, index) => {
          const cell = ws.getCell(row, index + 1);
          cell.value = value;
          const isRemarks = index === 3;
          const rowFill =
            index === 2
              ? STATUS_FILL[status]
              : entryNo % 2 === 0
                ? "FFF8FAFC"
                : "FFFFFFFF";
          fillCell(cell, rowFill, {
              font: {
                size: 10,
                color: { argb: "FF1E293B" },
                bold: index === 2,
              },
              alignment: {
                horizontal: isRemarks ? "left" : "center",
                vertical: isRemarks ? "top" : "middle",
                wrapText: isRemarks,
                indent: isRemarks ? 1 : 0,
              },
            },
          );
        });

        if (hasPhoto) {
          const photoCell = ws.getCell(row, 5);
          photoCell.value = {
            text: "View photo",
            hyperlink: entry.photo_url,
          };
          photoCell.font = {
            size: 10,
            color: { argb: "FF1D4ED8" },
            underline: true,
          };
        }

        const lineCount = Math.max(1, Math.ceil(remarks.length / 70));
        ws.getRow(row).height = Math.min(120, Math.max(22, lineCount * 15));
        entryNo += 1;
        row += 1;
      }

      row += 1;
    }
  }

  mergeRow(ws, row, 1, 5);
  const footerCell = ws.getCell(row, 1);
  footerCell.value =
    "Department of Science and Technology · PSTO Marinduque · Project Timeline Report";
  fillCell(footerCell, "FFF1F5F9", {
    font: { size: 9, italic: true, color: { argb: "FF64748B" } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: false,
  });
  ws.getRow(row).height = 20;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = `psto-timeline-${sanitizeFilename(project.title)}-${dateStamp}.xlsx`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);

  return { filename };
};
