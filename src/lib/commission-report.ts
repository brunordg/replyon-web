import ExcelJS from "exceljs";

export interface CommissionReportRow {
  date: string;
  customerName: string;
  serviceName: string;
  amountCharged: number;
  commissionPercentage: number | null;
  commissionAmount: number;
}

export interface CommissionReportStaff {
  staffId: number;
  staffName: string;
  rows: CommissionReportRow[];
  total: number;
}

const CURRENCY_FORMAT = '"R$" #,##0.00';
const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFE2E8F0" },
};

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.fill = HEADER_FILL;
}

/** Monta o workbook do relatório de comissões: aba Resumo + uma aba por profissional. */
export async function buildCommissionReportWorkbook(
  staffReports: CommissionReportStaff[],
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();

  const resumo = workbook.addWorksheet("Resumo");
  resumo.columns = [
    { header: "Profissional", key: "staffName", width: 32 },
    { header: "Total a pagar", key: "total", width: 18 },
  ];
  styleHeaderRow(resumo.getRow(1));
  for (const staff of staffReports) {
    resumo.addRow({ staffName: staff.staffName, total: staff.total });
  }
  resumo.getColumn("total").numFmt = CURRENCY_FORMAT;

  for (const staff of staffReports) {
    // Nomes de aba não podem repetir nem ultrapassar 31 caracteres (limite do Excel).
    const sheet = workbook.addWorksheet(uniqueSheetName(workbook, staff.staffName));
    sheet.columns = [
      { header: "Data", key: "date", width: 12 },
      { header: "Cliente", key: "customerName", width: 26 },
      { header: "Serviço", key: "serviceName", width: 24 },
      { header: "Valor Cobrado", key: "amountCharged", width: 16 },
      { header: "% Comissão", key: "commissionPercentage", width: 14 },
      { header: "Valor Comissão", key: "commissionAmount", width: 16 },
    ];
    styleHeaderRow(sheet.getRow(1));
    for (const row of staff.rows) {
      sheet.addRow({
        date: row.date,
        customerName: row.customerName,
        serviceName: row.serviceName,
        amountCharged: row.amountCharged,
        commissionPercentage: row.commissionPercentage,
        commissionAmount: row.commissionAmount,
      });
    }
    sheet.getColumn("amountCharged").numFmt = CURRENCY_FORMAT;
    sheet.getColumn("commissionAmount").numFmt = CURRENCY_FORMAT;

    const totalRow = sheet.addRow({
      customerName: "",
      serviceName: "",
      amountCharged: "",
      commissionPercentage: "Total a pagar",
      commissionAmount: staff.total,
    });
    totalRow.font = { bold: true };
    totalRow.getCell("commissionAmount").numFmt = CURRENCY_FORMAT;
  }

  return workbook;
}

function uniqueSheetName(workbook: ExcelJS.Workbook, name: string): string {
  const base = name.replace(/[[\]*?/\\:]/g, "").slice(0, 31) || "Profissional";
  if (!workbook.getWorksheet(base)) return base;
  for (let i = 2; i < 100; i++) {
    const candidate = `${base.slice(0, 28)} (${i})`;
    if (!workbook.getWorksheet(candidate)) return candidate;
  }
  return base;
}

export function downloadWorkbook(workbook: ExcelJS.Workbook, fileName: string) {
  workbook.xlsx.writeBuffer().then((buffer) => {
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  });
}
