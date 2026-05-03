import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 브라우저용 클라이언트 (Client Component에서 사용)
// TODO: Database 타입 생성 후 createClient<Database>()로 교체
export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey)
