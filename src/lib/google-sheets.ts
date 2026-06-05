import { google } from 'googleapis'

// 매장 → 스프레드시트 ID 매핑 (env 로 주입)
const SHEET_ID_BY_STORE: Record<string, string | undefined> = {
  // 성산점
  'a279d0fb-9fef-4fb8-a472-43c153a56fc5': process.env.GOOGLE_SHEET_ID_SEONGSAN,
  // 홍대점
  '7cf30fca-9d3c-4c55-a937-bcc7d6a4697a': process.env.GOOGLE_SHEET_ID_HONGDAE,
}

const RAW_TAB = process.env.GOOGLE_SHEET_RAW_TAB || 'raw'
const GRID_TAB = process.env.GOOGLE_SHEET_GRID_TAB || '월간'
const PAYROLL_TAB = '인건비'

export function getSheetIdForStore(storeId: string): string | null {
  return SHEET_ID_BY_STORE[storeId] ?? null
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!email || !key) throw new Error('구글 서비스 계정 환경변수가 설정되지 않았습니다.')

  return new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: key },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

// 탭이 없으면 생성하고, 해당 탭의 sheetId 반환
async function ensureTab(sheets: any, spreadsheetId: string, title: string): Promise<number> {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties(title,sheetId)',
  })
  const found = (meta.data.sheets ?? []).find((s: any) => s.properties?.title === title)
  if (found) return found.properties.sheetId
  const res = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: [{ addSheet: { properties: { title } } }] },
  })
  return res.data.replies[0].addSheet.properties.sheetId
}

// 지정 탭을 통째로 덮어쓰기 (멱등). 탭이 없으면 만들고 sheetId 반환.
async function writeTab(sheets: any, spreadsheetId: string, title: string, rows: (string | number)[][]): Promise<number> {
  const sheetId = await ensureTab(sheets, spreadsheetId, title)
  // 한글 등 특수 탭 이름은 A1 표기에서 작은따옴표로 감싼다
  const q = `'${title.replace(/'/g, "''")}'`
  await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${q}!A:Z` })
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${q}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: rows },
  })
  return sheetId
}

const RGB = (r: number, g: number, b: number) => ({ red: r / 255, green: g / 255, blue: b / 255 })

// 월간 격자 탭 서식 (가운데 정렬·헤더/주말/합계 색·테두리·틀고정). 매번 재적용해도 안전(멱등).
async function formatGrid(sheets: any, spreadsheetId: string, sheetId: number, rows: (string | number)[][]) {
  const rowCount = rows.length
  const colCount = rows[0]?.length ?? 0
  if (rowCount < 1 || colCount < 1) return

  const all = { sheetId, startRowIndex: 0, endRowIndex: rowCount, startColumnIndex: 0, endColumnIndex: colCount }
  const border = { style: 'SOLID', color: RGB(190, 190, 190) }
  const outer = { style: 'SOLID_MEDIUM', color: RGB(120, 120, 120) }

  const requests: any[] = [
    // 전체 가운데 정렬 + 글자 크기
    { repeatCell: { range: all, cell: { userEnteredFormat: { horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE', textFormat: { fontSize: 10 } } }, fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment,textFormat)' } },
    // 헤더(직원명) 행 — 브랜드 레드 배경 + 흰 굵은 글씨
    { repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: colCount }, cell: { userEnteredFormat: { backgroundColor: RGB(232, 0, 29), textFormat: { bold: true, fontSize: 10, foregroundColor: RGB(255, 255, 255) } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
    // 날짜·요일 두 열 — 연회색 배경 + 굵게
    { repeatCell: { range: { sheetId, startRowIndex: 1, endRowIndex: rowCount, startColumnIndex: 0, endColumnIndex: 2 }, cell: { userEnteredFormat: { backgroundColor: RGB(243, 243, 243), textFormat: { bold: true, fontSize: 10 } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
  ]

  // 주말 행 강조 (토=파랑, 일=빨강 계열) — 요일 열 값 기준
  for (let i = 1; i < rowCount - 1; i++) {
    const dow = String(rows[i]?.[1] ?? '')
    const bg = dow === '일' ? RGB(252, 228, 228) : dow === '토' ? RGB(228, 236, 252) : null
    if (bg) {
      requests.push({ repeatCell: { range: { sheetId, startRowIndex: i, endRowIndex: i + 1, startColumnIndex: 0, endColumnIndex: colCount }, cell: { userEnteredFormat: { backgroundColor: bg } }, fields: 'userEnteredFormat.backgroundColor' } })
    }
  }

  requests.push(
    // 합계 행 — 연한 주황 + 굵게
    { repeatCell: { range: { sheetId, startRowIndex: rowCount - 1, endRowIndex: rowCount, startColumnIndex: 0, endColumnIndex: colCount }, cell: { userEnteredFormat: { backgroundColor: RGB(253, 236, 210), textFormat: { bold: true, fontSize: 10 } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
    // 안쪽 테두리
    { updateBorders: { range: all, innerHorizontal: border, innerVertical: border } },
    // 바깥 테두리(굵게)
    { updateBorders: { range: all, top: outer, bottom: outer, left: outer, right: outer } },
    // 틀 고정: 헤더 1행 + 날짜·요일 2열
    { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 1, frozenColumnCount: 2 } }, fields: 'gridProperties(frozenRowCount,frozenColumnCount)' } },
    // 열 너비
    { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 92 }, fields: 'pixelSize' } },
    { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 46 }, fields: 'pixelSize' } },
    { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 2, endIndex: colCount }, properties: { pixelSize: 72 }, fields: 'pixelSize' } },
  )

  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } })
}

// 인건비 탭 서식
async function formatPayroll(sheets: any, spreadsheetId: string, sheetId: number, rowCount: number, colCount: number) {
  if (rowCount < 1 || colCount < 1) return

  const all = { sheetId, startRowIndex: 0, endRowIndex: rowCount, startColumnIndex: 0, endColumnIndex: colCount }
  const border = { style: 'SOLID', color: RGB(190, 190, 190) }
  const outer = { style: 'SOLID_MEDIUM', color: RGB(120, 120, 120) }

  const requests: any[] = [
    // 전체 가운데 정렬
    { repeatCell: { range: all, cell: { userEnteredFormat: { horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE', textFormat: { fontSize: 10 } } }, fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment,textFormat)' } },
    // 헤더 행 — 브랜드 레드
    { repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: colCount }, cell: { userEnteredFormat: { backgroundColor: RGB(232, 0, 29), textFormat: { bold: true, fontSize: 10, foregroundColor: RGB(255, 255, 255) } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
    // 직원명 열 — 연회색
    { repeatCell: { range: { sheetId, startRowIndex: 1, endRowIndex: rowCount - 1, startColumnIndex: 0, endColumnIndex: 1 }, cell: { userEnteredFormat: { backgroundColor: RGB(243, 243, 243), textFormat: { bold: true, fontSize: 10 } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
    // 합계 행 — 연한 주황 + 굵게
    { repeatCell: { range: { sheetId, startRowIndex: rowCount - 1, endRowIndex: rowCount, startColumnIndex: 0, endColumnIndex: colCount }, cell: { userEnteredFormat: { backgroundColor: RGB(253, 236, 210), textFormat: { bold: true, fontSize: 10 } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } },
    // 안쪽 테두리
    { updateBorders: { range: all, innerHorizontal: border, innerVertical: border } },
    // 바깥 테두리
    { updateBorders: { range: all, top: outer, bottom: outer, left: outer, right: outer } },
    // 틀 고정: 헤더 1행
    { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 1, frozenColumnCount: 0 } }, fields: 'gridProperties(frozenRowCount,frozenColumnCount)' } },
    // 열 너비
    { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 100 }, fields: 'pixelSize' } },
    { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 1, endIndex: colCount }, properties: { pixelSize: 110 }, fields: 'pixelSize' } },
  ]

  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } })
}

// raw 탭 덮어쓰기 (멱등)
export async function writeRawSheet(spreadsheetId: string, rows: (string | number)[][]) {
  const sheets = google.sheets({ version: 'v4', auth: getAuth() })
  await writeTab(sheets, spreadsheetId, RAW_TAB, rows)
}

// 월간 격자 탭 덮어쓰기 + 서식 (직원×날짜)
export async function writeGridSheet(spreadsheetId: string, rows: (string | number)[][]) {
  const sheets = google.sheets({ version: 'v4', auth: getAuth() })
  const sheetId = await writeTab(sheets, spreadsheetId, GRID_TAB, rows)
  await formatGrid(sheets, spreadsheetId, sheetId, rows)
}

// 인건비 탭 덮어쓰기 + 서식
export async function writePayrollSheet(spreadsheetId: string, rows: (string | number)[][]) {
  const sheets = google.sheets({ version: 'v4', auth: getAuth() })
  const sheetId = await writeTab(sheets, spreadsheetId, PAYROLL_TAB, rows)
  await formatPayroll(sheets, spreadsheetId, sheetId, rows.length, rows[0]?.length ?? 0)
}
