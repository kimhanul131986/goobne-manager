# 굽네치킨 매장관리 (Goobne Manager)

Next.js 14 + Supabase 기반 치킨 프랜차이즈 매장 관리 웹앱

---

## 기술 스택

| 항목 | 기술 |
|------|------|
| 프레임워크 | Next.js 14 (App Router) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS |
| 백엔드 | Supabase (Auth, Database, Storage) |
| 배포 | Vercel |

---

## 기능 목록

- **로그인** – Supabase Auth (이메일 + 비밀번호)
- **대시보드** – 미확인 공지, 체크리스트, 스케줄, 인수인계, 이슈 현황 요약
- **공지사항** – 작성/목록/상세/읽음 처리
- **발주 관리** – 품목별 수량 입력, 일괄 발주, 발주 이력
- **스케줄** – 주간 캘린더, 자가 확인, admin 스케줄 관리
- **체크리스트** – 오픈/마감/청소 탭, 완료 기록
- **매뉴얼** – 레시피/청소/오픈마감 카테고리, 이미지 포함
- **인수인계** – 오픈/미들/마감 시프트별 작성 및 7일 이력
- **이슈 신고** – 설비/재고/기타 카테고리, 해결 완료 처리

---

## 로컬 개발 환경 설정

### 1. 저장소 클론 및 패키지 설치

```bash
git clone <repo-url>
cd goobne-manager
npm install
```

### 2. 환경변수 설정

```bash
cp .env.example .env.local
```

`.env.local` 파일을 열고 Supabase 프로젝트 정보를 입력합니다:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

> Supabase 대시보드 → Settings → API 에서 값을 확인할 수 있습니다.

### 3. Supabase 스키마 적용

Supabase SQL Editor에서 아래 파일을 순서대로 실행합니다:

```
supabase/schema.sql          ← 테이블 생성
supabase/seed_checklist.sql  ← 기본 체크리스트 항목 삽입 (store_id 교체 필요)
```

### 4. Supabase Storage 버킷 생성

Supabase 대시보드 → Storage → New bucket:
- Bucket name: `manual-images`
- Public bucket: ✅ 체크

### 5. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

---

## Vercel 배포

### 1. Vercel CLI 배포 (권장)

```bash
npm i -g vercel
vercel
```

### 2. Vercel 대시보드 배포

1. [vercel.com](https://vercel.com) → New Project
2. GitHub 저장소 연결
3. **Environment Variables** 탭에서 아래 값 입력:

| 변수명 | 값 |
|--------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |

4. **Deploy** 클릭

> `vercel.json`의 `"regions": ["icn1"]` 설정으로 서울 리전에 배포됩니다.

---

## 역할(Role) 정책

| 기능 | staff | manager | admin |
|------|:-----:|:-------:|:-----:|
| 공지 읽기 | ✅ | ✅ | ✅ |
| 공지 작성 | ❌ | ✅ | ✅ |
| 발주 실행 | ✅ | ✅ | ✅ |
| 적정발주량 수정 | ❌ | ❌ | ✅ |
| 스케줄 자가확인 | ✅ | ✅ | ✅ |
| 스케줄 추가/수정/삭제 | ❌ | ❌ | ✅ |
| 매뉴얼 수정 | ❌ | ✅ | ✅ |
| 이슈 해결완료 | ❌ | ❌ | ✅ |
| 체크리스트 항목 추가/삭제 | ❌ | ❌ | ✅ |

---

## 프로젝트 구조

```
src/
├── app/
│   ├── login/                  # 로그인 페이지
│   ├── (dashboard)/
│   │   ├── layout.tsx          # 사이드바 + 탭바 레이아웃
│   │   ├── dashboard/          # 홈 대시보드
│   │   ├── notices/            # 공지사항
│   │   ├── orders/             # 발주 관리
│   │   ├── schedule/           # 스케줄
│   │   ├── checklist/          # 체크리스트
│   │   ├── manuals/            # 매뉴얼
│   │   ├── handover/           # 인수인계
│   │   └── incidents/          # 이슈 신고
│   ├── error.tsx               # 전역 에러 페이지
│   └── not-found.tsx           # 404 페이지
├── lib/
│   ├── supabase.ts             # 브라우저 클라이언트
│   └── supabaseServer.ts       # 서버 컴포넌트 클라이언트
└── middleware.ts               # 인증 미들웨어
supabase/
├── schema.sql                  # DB 스키마
└── seed_checklist.sql          # 체크리스트 기본 데이터
```
