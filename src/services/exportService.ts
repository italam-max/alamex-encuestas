import ExcelJS from 'exceljs';
import { supabase } from '../lib/supabase';
import { isStoredSectionQuestion } from './questionsService';

// ── Paleta de marca ───────────────────────────────────────────
const C = {
  navy:      'FF0A2463',
  darkNavy:  'FF051338',
  gold:      'FFD4AF37',
  lightGold: 'FFFEF3C7',
  cream:     'FFF9F7F2',
  white:     'FFFFFFFF',
  gray:      'FF6B7280',
  emerald:   'FF10B981',
  amber:     'FFF59E0B',
} as const;

// ── Helpers de estilo ──────────────────────────────────────────
function headerCell(cell: ExcelJS.Cell, text: string) {
  cell.value = text;
  cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navy } };
  cell.font  = { color: { argb: C.gold }, bold: true, size: 10 };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = { bottom: { style: 'medium', color: { argb: C.gold } } };
}

function titleCell(cell: ExcelJS.Cell, text: string, size = 14) {
  cell.value = text;
  cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.darkNavy } };
  cell.font  = { color: { argb: C.gold }, bold: true, size };
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
}

function dataCell(cell: ExcelJS.Cell, value: string | number | Date | null, rowIndex: number) {
  cell.value = value ?? '';
  cell.fill  = {
    type: 'pattern', pattern: 'solid',
    fgColor: { argb: rowIndex % 2 === 0 ? C.white : C.cream },
  };
  cell.font      = { color: { argb: C.navy }, size: 9 };
  cell.alignment = { vertical: 'middle', wrapText: true };
  cell.border    = { bottom: { style: 'hair', color: { argb: C.lightGold } } };
}

function metaRow(ws: ExcelJS.Worksheet, row: number, label: string, value: string) {
  const r = ws.getRow(row);
  r.height = 18;
  const lc = ws.getCell(row, 1);
  lc.value = label;
  lc.font  = { bold: true, color: { argb: C.navy }, size: 9 };
  const vc = ws.getCell(row, 2);
  vc.value = value;
  vc.font  = { color: { argb: C.navy }, size: 9 };
}

function kpiBlock(ws: ExcelJS.Worksheet, row: number, col: number, label: string, value: string | number, color: string) {
  const lc = ws.getCell(row, col);
  lc.value = label;
  lc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navy } };
  lc.font  = { color: { argb: color as ExcelJS.Color['argb'] }, size: 8 };
  lc.alignment = { horizontal: 'center', vertical: 'bottom' };

  const vc = ws.getCell(row + 1, col);
  vc.value = value;
  vc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navy } };
  vc.font  = { color: { argb: C.white }, bold: true, size: 20 };
  vc.alignment = { horizontal: 'center', vertical: 'top' };
}

// ── Semana ISO ─────────────────────────────────────────────────
function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  return Math.ceil((((d.getTime() - new Date(Date.UTC(d.getUTCFullYear(), 0, 1)).getTime()) / 86400000) + 1) / 7);
}

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_ES   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

// ── Tipos internos ─────────────────────────────────────────────
interface RawAnswer { value: string | null; values: string[] | null; question_id: string }
interface RawResponse {
  id: string; submitted_at: string;
  recipients: { name: string | null; email: string; status: string } | null;
  answers: RawAnswer[];
}
interface QuestionRow {
  id: string;
  title: string;
  type: string;
  order_index: number;
  settings?: Record<string, unknown> | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ── Función principal de exportación ──────────────────────────
export async function exportSurveyToExcel(surveyId: string, surveyTitle: string) {
  // ── 1. Datos ──────────────────────────────────────────────────
  const [respRes, qRes, distRes] = await Promise.all([
    db.from('responses')
      .select('id, submitted_at, recipients(name, email, status), answers(value, values, question_id)')
      .eq('survey_id', surveyId)
      .order('submitted_at', { ascending: true }),
    db.from('questions')
      .select('id, title, type, order_index, settings')
      .eq('survey_id', surveyId)
      .order('order_index', { ascending: true }),
    db.from('distributions')
      .select('id, recipients(status)')
      .eq('survey_id', surveyId),
  ]);

  const responses  = (respRes.data ?? []) as RawResponse[];
  const questions  = ((qRes.data ?? []) as QuestionRow[]).filter(q => !isStoredSectionQuestion(q));

  // KPIs desde distribuciones
  let totalSent = 0, totalOpened = 0;
  for (const d of (distRes.data ?? []) as { recipients: { status: string }[] }[]) {
    for (const r of d.recipients ?? []) {
      totalSent++;
      if (r.status === 'abierto' || r.status === 'respondido') totalOpened++;
    }
  }
  const totalResp   = responses.length;
  const responseRate = totalSent > 0 ? Math.round((totalResp / totalSent) * 100) : 0;
  const openRate     = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;

  // ── 2. Workbook ───────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator  = 'Alamex IT';
  wb.created  = new Date();
  wb.modified = new Date();

  // ════════════════════════════════════════════════════════════
  // HOJA 1: RESUMEN
  // ════════════════════════════════════════════════════════════
  const wsR = wb.addWorksheet('Resumen', {
    properties: { tabColor: { argb: C.gold } },
  });
  wsR.views = [{ showGridLines: false }];

  // Título
  wsR.mergeCells('A1:F1');
  wsR.mergeCells('A2:F2');
  wsR.mergeCells('A3:F3');
  wsR.getRow(1).height = 40;
  wsR.getRow(2).height = 24;
  wsR.getRow(3).height = 16;

  titleCell(wsR.getCell('A1'), 'ALAMEX ENCUESTAS', 18);
  titleCell(wsR.getCell('A2'), surveyTitle, 12);
  const subtitleCell = wsR.getCell('A3');
  subtitleCell.value = `Exportado el ${new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })} · Sistema de Encuestas de Satisfacción`;
  subtitleCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.darkNavy } };
  subtitleCell.font  = { color: { argb: C.gold }, size: 8 };
  subtitleCell.alignment = { horizontal: 'center' };

  // Separador dorado
  for (let c = 1; c <= 6; c++) {
    const cell = wsR.getCell(4, c);
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.gold } };
    cell.value = '';
  }
  wsR.getRow(4).height = 3;

  // KPIs
  wsR.getRow(5).height = 16;
  wsR.getRow(6).height = 32;
  kpiBlock(wsR, 5, 1, 'ENVIADOS',     totalSent,     C.amber);
  kpiBlock(wsR, 5, 2, 'ABIERTOS',     totalOpened,   C.lightGold);
  kpiBlock(wsR, 5, 3, 'RESPONDIDOS',  totalResp,     C.emerald);
  kpiBlock(wsR, 5, 4, 'TASA APERTURA', `${openRate}%`, C.lightGold);
  kpiBlock(wsR, 5, 5, 'TASA RESPUESTA', `${responseRate}%`, C.emerald);
  kpiBlock(wsR, 5, 6, 'PREGUNTAS',    questions.length, C.lightGold);

  wsR.getRow(7).height = 3;
  for (let c = 1; c <= 6; c++) {
    wsR.getCell(7, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.gold } };
  }

  // Metadata
  wsR.getRow(8).height = 6;
  metaRow(wsR, 9,  'Encuesta:',       surveyTitle);
  metaRow(wsR, 10, 'Total preguntas:', String(questions.length));
  metaRow(wsR, 11, 'Total enviados:',  String(totalSent));
  metaRow(wsR, 12, 'Total respuestas:', String(totalResp));
  metaRow(wsR, 13, 'Tasa de respuesta:', `${responseRate}%`);
  if (responses.length > 0) {
    const first = new Date(responses[0].submitted_at);
    const last  = new Date(responses[responses.length - 1].submitted_at);
    metaRow(wsR, 14, 'Primera respuesta:', first.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }));
    metaRow(wsR, 15, 'Última respuesta:',  last.toLocaleDateString('es-MX',  { day: 'numeric', month: 'long', year: 'numeric' }));
  }

  wsR.columns = [
    { width: 22 }, { width: 35 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 },
  ];

  // ════════════════════════════════════════════════════════════
  // HOJA 2: RESPUESTAS DETALLADAS
  // ════════════════════════════════════════════════════════════
  const wsD = wb.addWorksheet('Respuestas', {
    properties: { tabColor: { argb: C.navy } },
    views: [{ state: 'frozen', ySplit: 1, showGridLines: false }],
  });

  // Encabezados
  const fixedHeaders = ['#', 'Fecha', 'Hora', 'Día', 'Semana ISO', 'Mes', 'Año', 'Nombre', 'Email', 'Estado'];
  const allHeaders   = [...fixedHeaders, ...questions.map((q, i) => `${i + 1}. ${q.title}`)];

  allHeaders.forEach((h, ci) => headerCell(wsD.getCell(1, ci + 1), h));
  wsD.getRow(1).height = 30;

  // Datos
  responses.forEach((resp, ri) => {
    const dt    = new Date(resp.submitted_at);
    const rowN  = ri + 2;
    const di    = ri % 2; // alternating

    const fixedValues: (string | number | Date)[] = [
      ri + 1,
      dt.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      dt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
      DAYS_ES[dt.getDay()],
      `Sem ${isoWeek(dt)}`,
      MONTHS_ES[dt.getMonth()],
      dt.getFullYear(),
      resp.recipients?.name ?? '(Anónimo)',
      resp.recipients?.email ?? '',
      resp.recipients?.status ?? '',
    ];

    // Build answer map: question_id → formatted value
    const ansMap: Record<string, string> = {};
    for (const ans of resp.answers) {
      if (ans.values && ans.values.length > 0) {
        ansMap[ans.question_id] = ans.values.join(', ');
      } else if (ans.value !== null && ans.value !== undefined) {
        ansMap[ans.question_id] = ans.value;
      }
    }

    const row    = wsD.getRow(rowN);
    row.height   = 18;
    fixedValues.forEach((val, ci) => dataCell(wsD.getCell(rowN, ci + 1), val as string, di));
    questions.forEach((q, qi) => {
      dataCell(wsD.getCell(rowN, fixedHeaders.length + qi + 1), ansMap[q.id] ?? '', di);
    });
  });

  // Anchos de columna
  const dCols: Partial<ExcelJS.Column>[] = [
    { width: 5 }, { width: 14 }, { width: 8 }, { width: 12 },
    { width: 10 }, { width: 12 }, { width: 6 }, { width: 22 }, { width: 28 }, { width: 12 },
    ...questions.map(() => ({ width: 28 } as Partial<ExcelJS.Column>)),
  ];
  wsD.columns = dCols;

  // Auto-filtro
  wsD.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: allHeaders.length } };

  // ════════════════════════════════════════════════════════════
  // HOJA 3: ANÁLISIS POR PREGUNTA
  // ════════════════════════════════════════════════════════════
  const wsA = wb.addWorksheet('Por pregunta', {
    properties: { tabColor: { argb: C.gold } },
    views: [{ showGridLines: false }],
  });

  // Título
  wsA.mergeCells('A1:D1');
  wsA.getRow(1).height = 28;
  titleCell(wsA.getCell('A1'), 'ANÁLISIS POR PREGUNTA', 12);

  let curRow = 3;

  for (let qi = 0; qi < questions.length; qi++) {
    const q = questions[qi];

    // Título de pregunta
    wsA.mergeCells(curRow, 1, curRow, 4);
    const qtCell = wsA.getCell(curRow, 1);
    qtCell.value = `${qi + 1}. ${q.title}`;
    qtCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navy } };
    qtCell.font  = { color: { argb: C.white }, bold: true, size: 10 };
    qtCell.alignment = { vertical: 'middle' };
    wsA.getRow(curRow).height = 20;
    curRow++;

    // Headers de distribución
    ['Respuesta', 'Conteo', 'Porcentaje', 'Barra visual'].forEach((h, ci) => {
      headerCell(wsA.getCell(curRow, ci + 1), h);
    });
    wsA.getRow(curRow).height = 20;
    curRow++;

    // Calcular distribución
    const freq: Record<string, number> = {};
    for (const resp of responses) {
      const ans = resp.answers.find(a => a.question_id === q.id);
      if (!ans) continue;
      const vals = ans.values ?? (ans.value ? [ans.value] : []);
      for (const v of vals) { freq[v] = (freq[v] ?? 0) + 1; }
    }

    const total   = Object.values(freq).reduce((s, n) => s + n, 0);
    const entries = Object.entries(freq).sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
      const ec = wsA.getCell(curRow, 1);
      ec.value = 'Sin respuestas';
      ec.font  = { color: { argb: C.gray }, italic: true, size: 9 };
      curRow++;
    } else {
      entries.forEach(([val, count], ri) => {
        const pct  = total > 0 ? Math.round((count / total) * 100) : 0;
        const bar  = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
        const di   = ri % 2;
        dataCell(wsA.getCell(curRow, 1), val,   di);
        dataCell(wsA.getCell(curRow, 2), count, di);

        const pctCell = wsA.getCell(curRow, 3);
        pctCell.value = `${pct}%`;
        pctCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: di === 0 ? C.white : C.cream } };
        pctCell.font  = { color: { argb: pct >= 50 ? C.emerald : C.navy }, bold: pct >= 50, size: 9 };
        pctCell.alignment = { horizontal: 'center' };

        const barCell = wsA.getCell(curRow, 4);
        barCell.value = bar;
        barCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: di === 0 ? C.white : C.cream } };
        barCell.font  = { color: { argb: C.gold }, size: 8 };

        wsA.getRow(curRow).height = 16;
        curRow++;
      });
    }

    curRow += 2; // espaciado entre preguntas
  }

  wsA.columns = [{ width: 32 }, { width: 10 }, { width: 12 }, { width: 24 }];

  // ════════════════════════════════════════════════════════════
  // HOJA 4: TENDENCIA TEMPORAL
  // ════════════════════════════════════════════════════════════
  const wsT = wb.addWorksheet('Tendencia', {
    properties: { tabColor: { argb: C.emerald } },
    views: [{ showGridLines: false }],
  });

  wsT.mergeCells('A1:E1');
  wsT.getRow(1).height = 28;
  titleCell(wsT.getCell('A1'), 'TENDENCIA TEMPORAL DE RESPUESTAS', 12);

  // Agrupar por mes
  const byMonth: Record<string, number> = {};
  const byWeek:  Record<string, number> = {};

  for (const resp of responses) {
    const dt = new Date(resp.submitted_at);
    const mk  = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    const wk  = `${dt.getFullYear()}-Sem ${String(isoWeek(dt)).padStart(2, '0')}`;
    byMonth[mk] = (byMonth[mk] ?? 0) + 1;
    byWeek[wk]  = (byWeek[wk]  ?? 0) + 1;
  }

  // Tabla por mes
  let tRow = 3;
  wsT.mergeCells(tRow, 1, tRow, 3);
  const mtCell = wsT.getCell(tRow, 1);
  mtCell.value = 'Por mes';
  mtCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navy } };
  mtCell.font  = { color: { argb: C.gold }, bold: true, size: 10 };
  tRow++;

  ['Mes', 'Respuestas', 'Barra'].forEach((h, ci) => headerCell(wsT.getCell(tRow, ci + 1), h));
  wsT.getRow(tRow).height = 20;
  tRow++;

  const maxMonth = Math.max(...Object.values(byMonth), 1);
  Object.entries(byMonth).sort().forEach(([mk, n], ri) => {
    const [yr, mo] = mk.split('-');
    const label = `${MONTHS_ES[parseInt(mo) - 1]} ${yr}`;
    const bar   = '█'.repeat(Math.round((n / maxMonth) * 20));
    dataCell(wsT.getCell(tRow, 1), label, ri % 2);
    dataCell(wsT.getCell(tRow, 2), n,     ri % 2);
    const bc = wsT.getCell(tRow, 3);
    bc.value = bar;
    bc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: ri % 2 === 0 ? C.white : C.cream } };
    bc.font  = { color: { argb: C.gold }, size: 9 };
    wsT.getRow(tRow).height = 16;
    tRow++;
  });

  // Tabla por semana
  tRow += 2;
  wsT.mergeCells(tRow, 1, tRow, 3);
  const wtCell = wsT.getCell(tRow, 1);
  wtCell.value = 'Por semana';
  wtCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navy } };
  wtCell.font  = { color: { argb: C.gold }, bold: true, size: 10 };
  tRow++;

  ['Semana', 'Respuestas', 'Barra'].forEach((h, ci) => headerCell(wsT.getCell(tRow, ci + 1), h));
  wsT.getRow(tRow).height = 20;
  tRow++;

  const maxWeek = Math.max(...Object.values(byWeek), 1);
  Object.entries(byWeek).sort().forEach(([wk, n], ri) => {
    const bar = '█'.repeat(Math.round((n / maxWeek) * 20));
    dataCell(wsT.getCell(tRow, 1), wk, ri % 2);
    dataCell(wsT.getCell(tRow, 2), n,  ri % 2);
    const bc = wsT.getCell(tRow, 3);
    bc.value = bar;
    bc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: ri % 2 === 0 ? C.white : C.cream } };
    bc.font  = { color: { argb: C.gold }, size: 9 };
    wsT.getRow(tRow).height = 16;
    tRow++;
  });

  wsT.columns = [{ width: 20 }, { width: 12 }, { width: 26 }, { width: 14 }, { width: 14 }];

  // ── Generar y descargar ────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  const safe   = surveyTitle.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '_');
  a.href       = url;
  a.download   = `Alamex_${safe}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
