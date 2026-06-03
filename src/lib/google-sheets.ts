import { google } from 'googleapis'

// 매장 → 스프레드시트 ID 매핑 (env 로 주입)
const SHEET_ID_BY_STORE: Record<string, string | undefined> = {
  // 성산점
  'a279d0fb-9fef-4fb8-a472-43c153a56fc5': process.env.GOOGLE_SHEET_ID_SEONGSAN,
  // 홍대점
  '7cf30fca-9d3c-4c55-a937-bcc7d6a4697a': process.env.GOOGLE_SHEET_ID_HONGDAE,
}

const RAW_TAB = process.env.GOOGLE_SHEET_RAW_TAB || 'raw'

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

// raw 탭을 통째로 덮어쓰기 (멱등)
export async function writeRawSheet(spreadsheetId: string, rows: (string | number)[][]) {
  const sheets = google.sheets({ version: 'v4', auth: getAuth() })

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${RAW_TAB}!A:Z`,
  })

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${RAW_TAB}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: rows },
  })
}
