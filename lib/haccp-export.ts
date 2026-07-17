import ExcelJS from 'exceljs'
import {
  getDailyChecks,
  getTemperatureRecords,
  getSanitationRecords,
  getWaterRecords,
  getReceivingRecords,
  getDiscardRecords,
  getNonConformities,
  getPestControlRecords,
  getMaintenanceRecords,
  getTrainingRecords,
  getSuppliers,
  getAllergenMatrix,
  getManualVersions,
  EU_ALLERGENS,
} from './haccp'

const BRAND_DARK = 'FF28170F'
const BRAND_GOLD = 'FFE09E14'
const BRAND_CREAM = 'FFF5E3C2'
const HEADER_BG = 'FF3A251A'

type Row = Record<string, string | number | boolean | null | undefined>

function applyHeader(ws: ExcelJS.Worksheet, columns: string[], title: string, range: string) {
  ws.mergeCells(`A1:${String.fromCharCode(64 + columns.length)}1`)
  const titleCell = ws.getCell('A1')
  titleCell.value = title
  titleCell.font = { bold: true, size: 13, color: { argb: BRAND_CREAM } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_DARK } }
  titleCell.alignment = { horizontal: 'center' }

  if (range) {
    ws.mergeCells(`A2:${String.fromCharCode(64 + columns.length)}2`)
    const rangeCell = ws.getCell('A2')
    rangeCell.value = range
    rangeCell.font = { size: 10, color: { argb: BRAND_CREAM } }
    rangeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } }
    rangeCell.alignment = { horizontal: 'center' }
  }

  const headerRow = ws.getRow(range ? 3 : 2)
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = col
    cell.font = { bold: true, color: { argb: BRAND_DARK } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_GOLD } }
    cell.border = { bottom: { style: 'thin' } }
  })
  return range ? 4 : 3
}

function addRows(ws: ExcelJS.Worksheet, startRow: number, rows: Row[], keys: string[]) {
  rows.forEach((row, ri) => {
    const r = ws.getRow(startRow + ri)
    keys.forEach((key, ci) => {
      const val = row[key]
      r.getCell(ci + 1).value = val === null || val === undefined ? '' : (typeof val === 'object' && (val as object) instanceof Date) ? (val as Date) : String(val)
    })
    if (ri % 2 === 1) {
      r.eachCell(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF6EC' } }
      })
    }
  })
}

function autoWidth(ws: ExcelJS.Worksheet) {
  ws.columns.forEach(col => {
    let max = 12
    col.eachCell?.({ includeEmpty: false }, cell => {
      const len = cell.value ? String(cell.value).length : 0
      if (len > max) max = len
    })
    col.width = Math.min(max + 2, 50)
  })
}

function fmt(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'boolean') return v ? 'Áno' : 'Nie'
  return String(v)
}

function fmtDate(v: unknown): string {
  if (!v) return ''
  const d = new Date(v as string)
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('sk-SK')
}

function fmtDateTime(v: unknown): string {
  if (!v) return ''
  const d = new Date(v as string)
  return isNaN(d.getTime()) ? String(v) : d.toLocaleString('sk-SK')
}

// ─── Individual sheet builders ─────────────────────────────────────────────────

export function addDailyChecksSheet(wb: ExcelJS.Workbook, checks: Row[], range: string) {
  const ws = wb.addWorksheet('Denné kontroly')
  const cols = ['Dátum','Typ','Lokalita','Hlavný pracovník','Status','Dokončené o','Poznámky']
  const keys = ['check_date','check_type','location','main_worker_name','status','completed_at','notes']
  const start = applyHeader(ws, cols, 'Denné HACCP kontroly', range)
  addRows(ws, start, checks.map(r => ({
    ...r,
    check_date: fmtDate(r.check_date),
    check_type: r.check_type === 'opening' ? 'Otváracie' : 'Záveracie',
    completed_at: fmtDateTime(r.completed_at),
  })), keys)
  autoWidth(ws)
}

export function addTemperaturesSheet(wb: ExcelJS.Workbook, records: Row[], range: string) {
  const ws = wb.addWorksheet('Teploty')
  const cols = ['Dátum','Čas','Zariadenie','Teplota (°C)','Min.','Max.','Výsledok','Zamestnanec','Nápravné opatrenie','Poznámky']
  const keys = ['record_date','record_time','equipment_name','measured_temp','temp_min','temp_max','result','employee_name','corrective_action','notes']
  const start = applyHeader(ws, cols, 'Záznamy o teplotách', range)
  addRows(ws, start, records.map(r => ({
    ...r,
    record_date: fmtDate(r.record_date),
    result: r.result === 'ok' ? 'Vyhovuje' : r.result === 'above_limit' ? 'Nad limitom' : r.result === 'below_limit' ? 'Pod limitom' : 'Nekonfigurované',
  })), keys)
  // highlight out-of-range rows
  records.forEach((r, i) => {
    if (r.result === 'above_limit' || r.result === 'below_limit') {
      ws.getRow(start + i).eachCell(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEEEE' } }
        c.font = { color: { argb: 'FFCC0000' } }
      })
    }
  })
  autoWidth(ws)
}

export function addSanitationSheet(wb: ExcelJS.Workbook, records: Row[], range: string) {
  const ws = wb.addWorksheet('Sanitácia')
  const cols = ['Dátum','Čas','Oblasť','Postup čistenia','Prípravok','Koncentrácia','Zamestnanec','Výsledok','Poznámky']
  const keys = ['record_date','record_time','area','cleaning_action','product_used','concentration','employee_name','result','notes']
  const start = applyHeader(ws, cols, 'Záznamy o sanitácii', range)
  addRows(ws, start, records.map(r => ({
    ...r,
    record_date: fmtDate(r.record_date),
    result: r.result === 'ok' ? 'Vyhovuje' : r.result === 'nok' ? 'Nevyhovuje' : 'Čiastočne',
  })), keys)
  autoWidth(ws)
}

export function addWaterSheet(wb: ExcelJS.Workbook, records: Row[], range: string) {
  const ws = wb.addWorksheet('Voda')
  const cols = ['Dátum','Lokalita','Zdroj vody','Doplnené (l)','Zásobník pitnej vody','Zásobník sanitovaný','Zásobník odpadovej vody','Odpadová voda vypustená','Miesto vypustenia','Zamestnanec','Poznámky']
  const keys = ['record_date','location','water_source','amount_filled_l','clean_tank_checked','clean_tank_sanitized','waste_tank_checked','waste_disposed','disposal_location','employee_name','notes']
  const start = applyHeader(ws, cols, 'Záznamy o vode', range)
  addRows(ws, start, records.map(r => ({
    ...r,
    record_date: fmtDate(r.record_date),
    clean_tank_checked: fmt(r.clean_tank_checked),
    clean_tank_sanitized: fmt(r.clean_tank_sanitized),
    waste_tank_checked: fmt(r.waste_tank_checked),
    waste_disposed: fmt(r.waste_disposed),
  })), keys)
  autoWidth(ws)
}

export function addReceivingSheet(wb: ExcelJS.Workbook, records: Row[], range: string) {
  const ws = wb.addWorksheet('Príjem surovín')
  const cols = ['Dátum a čas','Dodávateľ','Produkt','Množstvo','Šarža','Dátum expirácie','Teplota (°C)','Stav obalu','Akceptované','Dôvod zamietnutia','Prijal/a','Ref. faktúry','Poznámky']
  const keys = ['received_at','supplier_name','product','quantity','lot_batch','expiry_date','temperature','package_condition','accepted','rejection_reason','received_by_name','invoice_ref','notes']
  const start = applyHeader(ws, cols, 'Záznamy o príjme surovín', range)
  addRows(ws, start, records.map(r => ({
    ...r,
    received_at: fmtDateTime(r.received_at),
    expiry_date: fmtDate(r.expiry_date),
    accepted: fmt(r.accepted),
    package_condition: r.package_condition === 'ok' ? 'V poriadku' : r.package_condition === 'damaged' ? 'Poškodený' : 'Zamietnutý',
  })), keys)
  autoWidth(ws)
}

export function addDiscardsSheet(wb: ExcelJS.Workbook, records: Row[], range: string) {
  const ws = wb.addWorksheet('Vyradené výrobky')
  const cols = ['Dátum','Produkt','Množstvo','Dôvod','Dátum expirácie','Spôsob likvidácie','Zamestnanec','Poznámky']
  const keys = ['record_date','product','quantity','reason','expiry_date','disposal_method','employee_name','notes']
  const start = applyHeader(ws, cols, 'Záznamy o vyradených výrobkoch', range)
  addRows(ws, start, records.map(r => ({
    ...r,
    record_date: fmtDate(r.record_date),
    expiry_date: fmtDate(r.expiry_date),
  })), keys)
  autoWidth(ws)
}

export function addNonConformitiesSheet(wb: ExcelJS.Workbook, records: Row[], range: string) {
  const ws = wb.addWorksheet('Nezhody')
  const cols = ['Dátum','Kategória','Popis','Produkt','Šarža','Závažnosť','Okamžité opatrenie','Nápravné opatrenie','Zodpovedný','Status','Uzavreté','Poznámky']
  const keys = ['discovered_at','category','description','affected_product','lot_batch','severity','immediate_action','corrective_action','responsible_name','status','closed_at','closure_note']
  const start = applyHeader(ws, cols, 'Nezhody a nápravné opatrenia', range)
  addRows(ws, start, records.map(r => ({
    ...r,
    discovered_at: fmtDateTime(r.discovered_at),
    closed_at: fmtDateTime(r.closed_at),
    severity: r.severity === 'critical' ? 'Kritická' : r.severity === 'high' ? 'Vysoká' : r.severity === 'medium' ? 'Stredná' : 'Nízka',
    status: r.status === 'open' ? 'Otvorená' : r.status === 'in_progress' ? 'Rieši sa' : r.status === 'closed' ? 'Uzavretá' : 'Archivovaná',
  })), keys)
  autoWidth(ws)
}

export function addPestControlSheet(wb: ExcelJS.Workbook, records: Row[], range: string) {
  const ws = wb.addWorksheet('Škodcovia')
  const cols = ['Dátum','Oblasť','Nález','Dôkazy','Opatrenie','Zodpovedný','Status','Poznámky']
  const keys = ['record_date','area','finding','evidence_found','action_taken','responsible_name','status','notes']
  const start = applyHeader(ws, cols, 'Záznamy o škodcoch', range)
  addRows(ws, start, records.map(r => ({
    ...r,
    record_date: fmtDate(r.record_date),
    evidence_found: fmt(r.evidence_found),
    status: r.status === 'inspected' ? 'Skontrolované' : r.status === 'action_required' ? 'Vyžaduje opatrenie' : 'Uzavreté',
  })), keys)
  autoWidth(ws)
}

export function addMaintenanceSheet(wb: ExcelJS.Workbook, records: Row[], range: string) {
  const ws = wb.addWorksheet('Údržba')
  const cols = ['Dátum','Zariadenie','Popis','Vykonal','Výsledok','Ďalší servis','Poznámky']
  const keys = ['record_date','equipment','description','performed_by','result','next_service_date','notes']
  const start = applyHeader(ws, cols, 'Záznamy o údržbe zariadení', range)
  addRows(ws, start, records.map(r => ({
    ...r,
    record_date: fmtDate(r.record_date),
    next_service_date: fmtDate(r.next_service_date),
  })), keys)
  autoWidth(ws)
}

export function addSuppliersSheet(wb: ExcelJS.Workbook, records: Row[]) {
  const ws = wb.addWorksheet('Dodávatelia')
  const cols = ['Názov','Právny názov','IČO','Adresa','Kontaktná osoba','E-mail','Telefón','Kategórie','Schválený','Aktívny','Poznámky']
  const keys = ['name','legal_name','ico','address','contact_person','email','phone','categories_str','approved','active','notes']
  const start = applyHeader(ws, cols, 'Dodávatelia', '')
  addRows(ws, start, records.map(r => ({
    ...r,
    categories_str: Array.isArray(r.categories) ? (r.categories as string[]).join(', ') : '',
    approved: fmt(r.approved),
    active: fmt(r.active),
  })), keys)
  autoWidth(ws)
}

export function addAllergenMatrixSheet(wb: ExcelJS.Workbook, matrix: Array<{
  recipeName: string
  category: string | null
  derived: Record<number, string>
  override: Record<string, string>
}>) {
  const ws = wb.addWorksheet('Alergény')
  const allergenNums = Array.from({ length: 14 }, (_, i) => i + 1)

  // header row 1 = title
  ws.mergeCells(`A1:${String.fromCharCode(64 + 2 + allergenNums.length)}1`)
  const titleCell = ws.getCell('A1')
  titleCell.value = 'Alergénová matica — Golden Lama'
  titleCell.font = { bold: true, size: 13, color: { argb: BRAND_CREAM } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_DARK } }
  titleCell.alignment = { horizontal: 'center' }

  const headerRow = ws.getRow(2)
  headerRow.getCell(1).value = 'Produkt'
  headerRow.getCell(2).value = 'Kategória'
  allergenNums.forEach((n, i) => {
    const cell = headerRow.getCell(3 + i)
    cell.value = `${n}`
    cell.note = EU_ALLERGENS[n]
  })
  headerRow.eachCell(c => {
    c.font = { bold: true, color: { argb: BRAND_DARK } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_GOLD } }
    c.alignment = { horizontal: 'center' }
  })

  matrix.forEach((recipe, ri) => {
    const row = ws.getRow(3 + ri)
    row.getCell(1).value = recipe.recipeName
    row.getCell(2).value = recipe.category ?? ''
    allergenNums.forEach((n, i) => {
      const overrideVal = recipe.override[String(n)]
      const derivedVal = recipe.derived[n]
      const val = overrideVal ?? derivedVal
      const cell = row.getCell(3 + i)
      if (val === 'contains') {
        cell.value = 'C'
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } }
        cell.font = { bold: true, color: { argb: 'FFCC0000' } }
      } else if (val === 'may_contain') {
        cell.value = 'S'
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFACC' } }
        cell.font = { color: { argb: 'FF996600' } }
      } else {
        cell.value = ''
      }
      cell.alignment = { horizontal: 'center' }
    })
    if (ri % 2 === 1) {
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF6EC' } }
      row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF6EC' } }
    }
  })

  // legend
  const legendRow = ws.getRow(3 + matrix.length + 2)
  legendRow.getCell(1).value = 'Legenda: C = obsahuje alergén, S = môže obsahovať stopy (deklarácia výrobcu), prázdne = nedeklarované'
  legendRow.getCell(1).font = { italic: true, size: 9 }

  autoWidth(ws)
}

export function addTrainingSheet(wb: ExcelJS.Workbook, records: Row[], range: string) {
  const ws = wb.addWorksheet('Školenia')
  const cols = ['Zamestnanec','Téma','Dátum','Lektor','Potvrdil/a','Potvrdené o','Ďalšie školenie','Poznámky']
  const keys = ['employee_name','topic','training_date','trainer','confirmed','confirmed_at','next_retraining_date','notes']
  const start = applyHeader(ws, cols, 'Záznamy o školeniach pracovníkov', range)
  addRows(ws, start, records.map(r => ({
    ...r,
    training_date: fmtDate(r.training_date),
    confirmed: fmt(r.confirmed),
    confirmed_at: fmtDateTime(r.confirmed_at),
    next_retraining_date: fmtDate(r.next_retraining_date),
  })), keys)
  autoWidth(ws)
}

// ─── Individual export entry points (used by /api/admin/haccp/exports) ────────

async function buildSingle(
  fetcher: () => Promise<Row[]>,
  builder: (wb: ExcelJS.Workbook, rows: Row[], range: string) => void,
  from: string,
  to: string
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Golden Lama – HACCP Admin'
  wb.created = new Date()
  const rows = await fetcher()
  builder(wb, rows, `${from} – ${to}`)
  return (await wb.xlsx.writeBuffer()) as unknown as Buffer
}

export async function exportDailyChecks(from: string, to: string) {
  return buildSingle(() => getDailyChecks({ from, to }), addDailyChecksSheet, from, to)
}
export async function exportTemperatures(from: string, to: string) {
  return buildSingle(() => getTemperatureRecords({ from, to }), addTemperaturesSheet, from, to)
}
export async function exportSanitation(from: string, to: string) {
  return buildSingle(() => getSanitationRecords({ from, to }), addSanitationSheet, from, to)
}
export async function exportWaterChecks(from: string, to: string) {
  return buildSingle(() => getWaterRecords({ from, to }), addWaterSheet, from, to)
}
export async function exportReceiving(from: string, to: string) {
  return buildSingle(() => getReceivingRecords({ from, to }), addReceivingSheet, from, to)
}
export async function exportDiscards(from: string, to: string) {
  return buildSingle(() => getDiscardRecords({ from, to }), addDiscardsSheet, from, to)
}
export async function exportNonConformities(from: string, to: string) {
  return buildSingle(() => getNonConformities({ from, to }), addNonConformitiesSheet, from, to)
}
export async function exportPestControl(from: string, to: string) {
  return buildSingle(() => getPestControlRecords({ from, to }), addPestControlSheet, from, to)
}
export async function exportMaintenance(from: string, to: string) {
  return buildSingle(() => getMaintenanceRecords({ from, to }), addMaintenanceSheet, from, to)
}
export async function exportTraining(from: string, to: string) {
  return buildSingle(() => getTrainingRecords({ from, to }), addTrainingSheet, from, to)
}

export async function exportFullInspectionReport(from: string, to: string): Promise<Buffer> {
  const [checks, temps, san, water, recv, discards, nc, pest, maint, training, suppliers, matrix, manuals] =
    await Promise.all([
      getDailyChecks({ from, to }),
      getTemperatureRecords({ from, to }),
      getSanitationRecords({ from, to }),
      getWaterRecords({ from, to }),
      getReceivingRecords({ from, to }),
      getDiscardRecords({ from, to }),
      getNonConformities({ from, to }),
      getPestControlRecords({ from, to }),
      getMaintenanceRecords({ from, to }),
      getTrainingRecords({ from, to }),
      getSuppliers(),
      getAllergenMatrix(),
      getManualVersions(),
    ])
  return buildInspectionXlsx({
    from, to,
    checks: checks as Row[],
    temperatures: temps as Row[],
    sanitation: san as Row[],
    water: water as Row[],
    receiving: recv as Row[],
    discards: discards as Row[],
    nonConformities: nc as Row[],
    pestControl: pest as Row[],
    maintenance: maint as Row[],
    suppliers: suppliers as Row[],
    allergenMatrix: matrix,
    training: training as Row[],
    manualVersions: manuals as Row[],
  })
}

// ─── Full inspection package ──────────────────────────────────────────────────

export async function buildInspectionXlsx(data: {
  from: string
  to: string
  checks: Row[]
  temperatures: Row[]
  sanitation: Row[]
  water: Row[]
  receiving: Row[]
  discards: Row[]
  nonConformities: Row[]
  pestControl: Row[]
  maintenance: Row[]
  suppliers: Row[]
  allergenMatrix: Array<{ recipeName: string; category: string | null; derived: Record<number, string>; override: Record<string, string> }>
  training: Row[]
  manualVersions: Row[]
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Golden Lama – HACCP Admin'
  wb.created = new Date()
  const range = `${data.from} – ${data.to}`

  // Cover sheet
  const cover = wb.addWorksheet('Súhrn')
  cover.getCell('A1').value = 'Golden Lama — HACCP Inšpekčný balík'
  cover.getCell('A1').font = { bold: true, size: 16, color: { argb: BRAND_CREAM } }
  cover.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_DARK } }
  cover.getCell('A2').value = `Obdobie: ${range}`
  cover.getCell('A3').value = `Vytvorené: ${new Date().toLocaleString('sk-SK')}`
  cover.getCell('A5').value = 'HACCP manuál — aktuálna aktívna verzia:'
  const activeManual = data.manualVersions.find(v => v.status === 'active')
  cover.getCell('A6').value = activeManual ? `${activeManual.version} – ${activeManual.title} (${fmtDate(activeManual.effective_date)})` : '(Žiadna aktívna verzia)'
  cover.getCell('A8').value = 'Tento dokument je generovaný z operačných záznamov a nenahrádza originál HACCP manuálu.'
  cover.getCell('A8').font = { italic: true, size: 9, color: { argb: 'FF888888' } }
  cover.getColumn(1).width = 70

  addDailyChecksSheet(wb, data.checks, range)
  addTemperaturesSheet(wb, data.temperatures, range)
  addSanitationSheet(wb, data.sanitation, range)
  addWaterSheet(wb, data.water, range)
  addReceivingSheet(wb, data.receiving, range)
  addDiscardsSheet(wb, data.discards, range)
  addNonConformitiesSheet(wb, data.nonConformities, range)
  addPestControlSheet(wb, data.pestControl, range)
  addMaintenanceSheet(wb, data.maintenance, range)
  addSuppliersSheet(wb, data.suppliers)
  addAllergenMatrixSheet(wb, data.allergenMatrix)
  addTrainingSheet(wb, data.training, range)

  return (await wb.xlsx.writeBuffer()) as unknown as Buffer
}
