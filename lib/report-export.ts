import ExcelJS from 'exceljs'
import {
  ABSENCE_TYPE_LABELS,
  REPORT_SLUGS,
  REPORT_TITLES,
  type AbsenceReportRow,
  type InventoryReportRow,
  type PointsReport,
  type ReportType,
  type ShiftReport,
  type UserReportRow,
} from './reports'
import { ROLE_LABELS, isValidRole } from './permissions'

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0')

/** ISO timestamp → "DD.MM.YYYY HH:MM" (UTC-based, stable for exports). */
function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

/** "YYYY-MM-DD" → "DD.MM.YYYY". */
function fmtDate(ymd: string): string {
  if (!ymd) return ''
  const [y, m, d] = ymd.split('-')
  if (!y || !m || !d) return ymd
  return `${d}.${m}.${y}`
}

function roleLabel(role: string): string {
  return isValidRole(role) ? ROLE_LABELS[role] : role
}

const MOVEMENT_LABELS: Record<string, string> = {
  purchase: 'Nákup',
  usage: 'Spotreba',
  adjustment: 'Úprava',
  waste: 'Odpis',
  transfer: 'Presun',
}

const INVENTORY_KIND_LABELS: Record<string, string> = {
  operating: 'Prevádzkový',
  asset: 'Majetok',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Návrh',
  published: 'Publikované',
  cancelled: 'Zrušené',
  active: 'Aktívne',
  reversed: 'Vrátené',
}

const SOURCE_LABELS: Record<string, string> = {
  manual: 'Manuálne',
  pos: 'Pokladňa',
  adjustment: 'Úprava',
  team_bonus: 'Tímový bonus',
  correction: 'Korekcia',
}

function statusLabel(s: string): string {
  return STATUS_LABELS[s] ?? s
}

// ---------------------------------------------------------------------------
// Generic sheet construction
// ---------------------------------------------------------------------------

interface ColumnDef {
  header: string
  width?: number
  /** Numeric Excel format (e.g. '0.00', '#,##0.00'). */
  numFmt?: string
}

const BRAND = 'FFE09E14'
const HEADER_BG = 'FF3A251A'
const HEADER_FG = 'FFF5E3C2'

function buildSheet(
  wb: ExcelJS.Workbook,
  sheetName: string,
  title: string,
  rangeLabel: string,
  columns: ColumnDef[],
  rows: (string | number | null)[][],
): void {
  const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 4 }] })
  const lastCol = columns.length

  // Title row
  ws.mergeCells(1, 1, 1, lastCol)
  const titleCell = ws.getCell(1, 1)
  titleCell.value = `Golden Lama — ${title}`
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF28170F' } }

  // Metadata row
  ws.mergeCells(2, 1, 2, lastCol)
  const metaCell = ws.getCell(2, 1)
  const generated = fmtDateTime(new Date().toISOString())
  metaCell.value = `Vygenerované: ${generated}${rangeLabel ? `   |   Obdobie: ${rangeLabel}` : ''}   |   Počet záznamov: ${rows.length}`
  metaCell.font = { size: 10, color: { argb: 'FF8C6F4E' } }

  // Header row (row 4)
  const headerRowIdx = 4
  const headerRow = ws.getRow(headerRowIdx)
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = col.header
    cell.font = { bold: true, color: { argb: HEADER_FG } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } }
    cell.alignment = { vertical: 'middle', horizontal: 'left' }
    cell.border = { bottom: { style: 'thin', color: { argb: BRAND } } }
  })
  headerRow.height = 18

  // Data rows
  rows.forEach((r) => {
    const added = ws.addRow(r)
    columns.forEach((col, i) => {
      if (col.numFmt) added.getCell(i + 1).numFmt = col.numFmt
    })
  })

  // Column widths
  columns.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.width ?? 18
  })

  // Auto-filter over the header + data
  ws.autoFilter = {
    from: { row: headerRowIdx, column: 1 },
    to: { row: headerRowIdx + rows.length, column: lastCol },
  }
}

// ---------------------------------------------------------------------------
// CSV construction
// ---------------------------------------------------------------------------

function csvEscape(value: string | number | null): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (/[";\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const lines = [headers.map(csvEscape).join(';')]
  for (const r of rows) lines.push(r.map(csvEscape).join(';'))
  // Prepend UTF-8 BOM so Excel opens diacritics correctly.
  return '\uFEFF' + lines.join('\r\n')
}

// ---------------------------------------------------------------------------
// Per-report table definitions
// ---------------------------------------------------------------------------

interface TableDef {
  sheetName: string
  columns: ColumnDef[]
  rows: (string | number | null)[][]
}

function shiftTables(data: ShiftReport): TableDef[] {
  const detail: TableDef = {
    sheetName: 'Zmeny',
    columns: [
      { header: 'Zamestnanec', width: 24 },
      { header: 'E-mail', width: 28 },
      { header: 'Dátum', width: 14 },
      { header: 'Začiatok', width: 12 },
      { header: 'Koniec', width: 12 },
      { header: 'Odpracované hodiny', width: 18, numFmt: '0.00' },
      { header: 'Lokalita', width: 20 },
      { header: 'Pozícia', width: 18 },
      { header: 'Stav', width: 14 },
      { header: 'Poznámka', width: 30 },
      { header: 'Vytvorené', width: 18 },
      { header: 'Upravené', width: 18 },
    ],
    rows: data.rows.map((r) => [
      r.employeeName,
      r.employeeEmail,
      fmtDate(r.date),
      r.startTime ?? '',
      r.endTime ?? '',
      r.hoursWorked ?? 0,
      r.location,
      r.position,
      statusLabel(r.status),
      r.note,
      fmtDateTime(r.createdAt),
      fmtDateTime(r.updatedAt),
    ]),
  }
  const summary: TableDef = {
    sheetName: 'Súhrn',
    columns: [
      { header: 'Zamestnanec', width: 24 },
      { header: 'E-mail', width: 28 },
      { header: 'Počet zmien', width: 14, numFmt: '0' },
      { header: 'Spolu hodín', width: 14, numFmt: '0.00' },
      { header: 'Zrušené zmeny', width: 14, numFmt: '0' },
    ],
    rows: data.summary.map((s) => [
      s.employeeName,
      s.employeeEmail,
      s.totalShifts,
      s.totalHours,
      s.cancelledShifts,
    ]),
  }
  return [detail, summary]
}

function absenceTables(rows: AbsenceReportRow[]): TableDef[] {
  return [
    {
      sheetName: 'Neprítomnosti',
      columns: [
        { header: 'Zamestnanec', width: 24 },
        { header: 'E-mail', width: 28 },
        { header: 'Typ neprítomnosti', width: 18 },
        { header: 'Od', width: 14 },
        { header: 'Do', width: 14 },
        { header: 'Počet dní', width: 12, numFmt: '0' },
        { header: 'Celý deň', width: 12 },
        { header: 'Stav', width: 14 },
        { header: 'Poznámka', width: 30 },
        { header: 'Vytvorené', width: 18 },
        { header: 'Upravené', width: 18 },
      ],
      rows: rows.map((r) => [
        r.employeeName,
        r.employeeEmail,
        ABSENCE_TYPE_LABELS[r.absenceType] ?? r.absenceType,
        fmtDate(r.dateFrom),
        fmtDate(r.dateTo),
        r.daysCount,
        r.allDay ? 'Áno' : 'Nie',
        statusLabel(r.status),
        r.note,
        fmtDateTime(r.createdAt),
        fmtDateTime(r.updatedAt),
      ]),
    },
  ]
}

function pointTables(data: PointsReport): TableDef[] {
  const detail: TableDef = {
    sheetName: 'Zlaté body',
    columns: [
      { header: 'Zamestnanec', width: 24 },
      { header: 'E-mail', width: 28 },
      { header: 'Dátum a čas', width: 18 },
      { header: 'Kategória', width: 20 },
      { header: 'Zdroj', width: 16 },
      { header: 'Pravidlo / produkt', width: 24 },
      { header: 'Množstvo', width: 12, numFmt: '0.##' },
      { header: 'Body za jednotku', width: 16, numFmt: '0.##' },
      { header: 'Body spolu', width: 14, numFmt: '0.##' },
      { header: 'Stav', width: 14 },
      { header: 'Poznámka', width: 30 },
      { header: 'Vytvoril', width: 20 },
      { header: 'Vytvorené', width: 18 },
    ],
    rows: data.rows.map((r) => [
      r.employeeName,
      r.employeeEmail,
      fmtDateTime(r.happenedAt),
      r.categoryLabel,
      SOURCE_LABELS[r.source] ?? r.source,
      r.ruleOrProduct,
      r.quantity,
      r.pointsPerUnit,
      r.totalPoints,
      statusLabel(r.status),
      r.note,
      r.createdByName,
      fmtDateTime(r.createdAt),
    ]),
  }
  const summary: TableDef = {
    sheetName: 'Súhrn',
    columns: [
      { header: 'Zamestnanec', width: 24 },
      { header: 'E-mail', width: 28 },
      { header: 'Body spolu (aktívne)', width: 18, numFmt: '0.##' },
      { header: 'Počet udalostí', width: 14, numFmt: '0' },
    ],
    rows: data.summary.map((s) => [s.employeeName, s.employeeEmail, s.totalPoints, s.events]),
  }
  return [detail, summary]
}

function inventoryTables(rows: InventoryReportRow[]): TableDef[] {
  return [
    {
      sheetName: 'Skladové pohyby',
      columns: [
        { header: 'Dátum a čas', width: 18 },
        { header: 'Kód položky', width: 14 },
        { header: 'Názov položky', width: 28 },
        { header: 'Druh skladu', width: 14 },
        { header: 'Typ pohybu', width: 14 },
        { header: 'Zmena množstva', width: 14, numFmt: '0.###' },
        { header: 'Cena bez DPH', width: 14, numFmt: '#,##0.00' },
        { header: 'DPH %', width: 10, numFmt: '0.##' },
        { header: 'Cena s DPH', width: 14, numFmt: '#,##0.00' },
        { header: 'Poznámka', width: 30 },
        { header: 'Vytvoril', width: 20 },
      ],
      rows: rows.map((r) => [
        fmtDateTime(r.happenedAt),
        r.itemCode,
        r.itemName,
        INVENTORY_KIND_LABELS[r.inventoryKind] ?? r.inventoryKind,
        MOVEMENT_LABELS[r.movementType] ?? r.movementType,
        r.quantityChange,
        r.unitPriceWithoutVat,
        r.vatRate,
        r.unitPriceWithVat,
        r.note,
        r.createdByName,
      ]),
    },
  ]
}

function userTables(rows: UserReportRow[]): TableDef[] {
  return [
    {
      sheetName: 'Používatelia',
      columns: [
        { header: 'Meno', width: 24 },
        { header: 'E-mail', width: 28 },
        { header: 'Rola', width: 18 },
        { header: 'Aktívny', width: 12 },
        { header: 'Vytvorené', width: 18 },
        { header: 'Posledné prihlásenie', width: 20 },
      ],
      rows: rows.map((r) => [
        r.name,
        r.email,
        roleLabel(r.role),
        r.active ? 'Áno' : 'Nie',
        fmtDateTime(r.createdAt),
        r.lastLoginAt ? fmtDateTime(r.lastLoginAt) : '—',
      ]),
    },
  ]
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type ReportData =
  | { type: 'shifts'; data: ShiftReport }
  | { type: 'absences'; data: AbsenceReportRow[] }
  | { type: 'points'; data: PointsReport }
  | { type: 'inventory'; data: InventoryReportRow[] }
  | { type: 'users'; data: UserReportRow[] }

function tablesFor(report: ReportData): TableDef[] {
  switch (report.type) {
    case 'shifts':
      return shiftTables(report.data)
    case 'absences':
      return absenceTables(report.data)
    case 'points':
      return pointTables(report.data)
    case 'inventory':
      return inventoryTables(report.data)
    case 'users':
      return userTables(report.data)
  }
}

export async function buildXlsx(report: ReportData, rangeLabel: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Golden Lama Admin'
  wb.created = new Date()
  const title = REPORT_TITLES[report.type]
  for (const t of tablesFor(report)) {
    buildSheet(wb, t.sheetName, title, rangeLabel, t.columns, t.rows)
  }
  const out = await wb.xlsx.writeBuffer()
  return Buffer.from(out)
}

export function buildCsv(report: ReportData): string {
  // CSV exports the primary (first) table only.
  const [primary] = tablesFor(report)
  return toCsv(
    primary.columns.map((c) => c.header),
    primary.rows,
  )
}

/** Builds a filename like "golden-lama-zmeny-2026-06.xlsx" (or a date range). */
export function reportFilename(type: ReportType, ext: 'xlsx' | 'csv', from?: string, to?: string): string {
  const slug = REPORT_SLUGS[type]
  let stamp: string
  if (from && to) {
    const fromMonth = from.slice(0, 7)
    const toMonth = to.slice(0, 7)
    stamp = fromMonth === toMonth ? fromMonth : `${from}_${to}`
  } else if (from) {
    stamp = from.slice(0, 7)
  } else {
    const now = new Date()
    stamp = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}`
  }
  return `golden-lama-${slug}-${stamp}.${ext}`
}
