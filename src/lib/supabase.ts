import { createBrowserClient } from '@supabase/ssr'

// 브라우저용 클라이언트 (Client Component에서 사용)
// createBrowserClient: 세션을 쿠키에 저장 → 미들웨어와 SSR에서 읽기 가능
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
