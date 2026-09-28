# 프로젝트 구조 가이드

이 문서는 Next.js 15.5.3 프로젝트의 폴더 구조, 파일 조직 및 네이밍 컨벤션을 정의합니다.

## 🏗️ 전체 프로젝트 구조

```
duckil-barcode/
├── data/                  # 💾 런타임 데이터 (git 제외)
│   ├── app.db            # SQLite DB
│   └── uploads/          # 사진 파일 (uuid.jpg)
├── docs/                  # 📚 프로젝트 문서 (PRD, ROADMAP)
│   └── guides/           # 개발 가이드 모음
├── public/                # 🌍 정적 파일 (이미지, 아이콘)
├── src/                   # 📦 소스 코드 루트
│   ├── app/              # 🚀 Next.js App Router
│   ├── components/       # 🧩 React 컴포넌트
│   └── lib/              # 🛠️ 유틸리티 및 설정
├── tasks/                 # 📋 Task 작업 파일 (XXX-description.md)
├── components.json       # shadcn/ui 설정
├── next.config.ts        # Next.js 설정 (serverExternalPackages)
├── package.json          # 의존성 및 스크립트
├── tsconfig.json         # TypeScript 설정
└── CLAUDE.md            # 개발 지침 메인 문서
```

## 📁 세부 폴더 구조

### src/app/ - App Router 페이지

```
src/app/
├── layout.tsx           # 🎨 루트 레이아웃 (전역 설정, ThemeProvider·Toaster)
├── page.tsx             # 🏠 홈 - 기록 목록 (/)
├── _components/         # 홈 전용 컴포넌트
│   ├── home-view.tsx    # 홈 컨테이너 (검색·더 보기 상태, 더미 데이터 공급)
│   ├── record-list.tsx  # 목록 표현 컴포넌트 (로딩·빈·오류·목록)
│   ├── record-list-item.tsx # 목록 항목 (썸네일·Product No·Lot·일시)
│   └── record-search.tsx    # 검색창
├── not-found.tsx        # 🚫 404 페이지
├── globals.css          # 🎨 전역 CSS 스타일
├── favicon.ico          # 🔖 파비콘
├── scan/                # 📷 스캔·촬영·저장 (/scan)
│   ├── page.tsx
│   └── _components/     # 스캔 전용: scan-flow(단계 reducer)·scanner/confirm/photo/done-step
├── records/
│   └── [id]/            # 📄 기록 상세·수정·삭제 (/records/[id])
│       ├── page.tsx
│       ├── loading.tsx  # 로딩 스켈레톤
│       └── _components/ # 상세 전용: record-detail-view·record-detail-skeleton·delete-record-button·record-not-found
└── export/              # 📊 Excel 내보내기 (/export)
    ├── page.tsx
    └── _components/     # 내보내기 전용: export-form(기간·흐름)·export-status(상태 표시)
```

**🚀 App Router 규칙:**

- `page.tsx`: 해당 경로의 메인 페이지
- `layout.tsx`: 레이아웃 컴포넌트 (자식 페이지 감쌈)
- `loading.tsx`: 로딩 UI (필요시)
- `error.tsx`: 에러 UI (필요시)
- `not-found.tsx`: 404 페이지 (필요시)

### src/components/ - 컴포넌트 조직

```
src/components/
├── ui/                 # 🎛️ 기본 UI 컴포넌트 (shadcn/ui)
│   ├── button.tsx     # 버튼 (모바일용 touch·icon-touch 크기 변형 추가)
│   ├── alert-dialog.tsx # 확인 모달 기반
│   ├── textarea.tsx   # 여러 줄 입력 (메모)
│   ├── card.tsx       # 카드
│   ├── form.tsx       # 폼 관련
│   ├── input.tsx      # 입력 필드
│   └── ...           # 기타 UI 컴포넌트
├── layout/            # 🏗️ 레이아웃 컴포넌트
│   ├── container.tsx  # 컨테이너 래퍼 (size="mobile": 최대 480px)
│   └── app-header.tsx # 화면 헤더 (제목·뒤로 가기·테마 토글)
├── navigation/        # 🧭 내비게이션
│   └── bottom-tab-bar.tsx # 하단 탭 바 (홈/스캔/내보내기)
├── states/            # ⏳ 공통 상태 표시
│   ├── list-skeleton.tsx # 목록 로딩 스켈레톤
│   ├── empty-state.tsx   # 빈 목록 (아이콘·문구·행동 버튼 슬롯)
│   └── error-state.tsx   # 오류 안내 + 다시 시도
├── dialogs/           # 💬 대화상자
│   └── confirm-dialog.tsx # 제어형 확인 모달 (AlertDialog 기반)
├── scanner/           # 📷 스캐너 (스캔 화면)
│   ├── scanner-view.tsx       # 카메라 영역 자리 + 조준 가이드
│   └── camera-unavailable.tsx # 카메라 권한 거부/미지원 안내
├── records/           # 🗂️ 기록 공용 (스캔·상세 화면)
│   ├── record-fields.tsx # Product No/Lot/메모(+QR 원문) 입력 필드 (useFormContext)
│   ├── photo-slot.tsx    # 사진 슬롯 (빈 상태·미리보기·오류)
│   └── raw-text-box.tsx  # QR 원문 읽기 전용 박스
├── providers/         # 🔧 Context 프로바이더
│   └── theme-provider.tsx
└── theme-toggle.tsx   # 🌓 테마 토글
```

**🧩 컴포넌트 분류 규칙:**

1. **ui/**: shadcn/ui 기반 재사용 가능한 기본 컴포넌트
   - 순수 UI 컴포넌트만 포함
   - 비즈니스 로직 없음
   - props로 모든 동작 제어

2. **layout/**: 페이지 구조를 담당하는 레이아웃 컴포넌트
   - 전체 페이지 구조
   - 공통 헤더/푸터
   - 컨테이너 래퍼

3. **공용 컴포넌트 카테고리** (2개 이상 화면에서 쓰는 컴포넌트)
   - `navigation/`: 하단 탭 바 등 내비게이션
   - `states/`: 로딩·빈 상태·오류 상태 컴포넌트
   - `dialogs/`: 확인 모달 등 대화상자
   - `scanner/`: 카메라 영역·권한 안내 (실제 QR 스캐너 `qr-scanner.tsx`는 Task 014에서 `'use client'`로 추가)
   - `records/`: 입력 필드·사진 슬롯·원문 박스 등 기록 관련 공용 컴포넌트

4. **라우트 전용 컴포넌트**: 한 화면에서만 쓰면 해당 라우트의 `_components/`에 둔다 (홈 전용은 `src/app/_components/`)

5. **providers/**: React Context 프로바이더
   - 전역 상태 관리
   - 테마 관리
   - 인증 상태

### src/lib/ - 유틸리티 및 설정

```
src/lib/
├── utils.ts           # 🛠️ 공통 유틸리티 함수 (cn)
├── env.ts             # 🔧 환경변수 검증 (DATA_DIR, UPLOAD_DIR, 서버 전용)
├── constants.ts       # 📏 제한 수치 단일 출처 (사진·리사이즈·길이·목록·내보내기)
├── time.ts            # 🕘 KST 시간 유틸 (nowKstIso 등, 브라우저·Node 공용)
├── api-error.ts       # ⚠️ 에러 응답 헬퍼 (Route Handler 전용)
├── preview-state.ts   # 👀 Phase 2 ?preview=<상태> 헬퍼 (개발 모드 전용, 공용)
├── types/             # 📐 공통 타입
│   ├── record.ts      # RecordRow, RecordDto, CreateRecordResponse, RecordListResponse
│   └── api.ts         # ApiErrorCode, ApiErrorBody
├── schemas/           # ✅ Zod 스키마 (클라이언트·서버 공용, 서버 전용 코드 금지)
│   ├── record.ts      # 기록 생성·수정·id·목록 쿼리
│   ├── export.ts      # 날짜·내보내기 쿼리
│   └── photo.ts       # 사진 파일명·파일 검사
└── mock/              # 🧪 Phase 2 화면용 더미 데이터
    └── records.ts
```

**📚 Phase 3 이후 추가 예정 (서버 전용은 첫 줄 `import 'server-only'`):**

```
src/lib/
├── db.ts              # SQLite 연결 (서버 전용)
├── records-repo.ts    # 기록 리포지토리 (서버 전용)
├── storage.ts         # 사진 저장소 (서버 전용)
├── excel-export.ts    # Excel 생성 (서버 전용)
├── qr-parser.ts       # QR 파서 (브라우저·Node 공용 순수 함수)
└── api/               # 클라이언트용 fetch 래퍼 (*-client.ts)
```

### 기타 폴더

```
public/mock/           # 🖼️ 더미 샘플 이미지 (barcode-sample.jpg 800x267 3:1, product-sample.jpg 800x160 5:1, 가로형)
scripts/               # 🔍 Node 24 타입 스트리핑 검증 스크립트
├── register-alias.mjs # '@/' 별칭 resolve 훅
├── check-schemas.ts   # 스키마 경계값 검사
└── check-time.ts      # KST 유틸 타임존 독립성 검사
tasks/                 # 📋 Task 작업 파일 (000-sample.md 템플릿)
```

검증 스크립트 실행:

```bash
node --import ./scripts/register-alias.mjs scripts/check-schemas.ts
TZ=UTC node --import ./scripts/register-alias.mjs scripts/check-time.ts
```

## 🏷️ 파일 네이밍 컨벤션

### 파일명 규칙

```bash
# ✅ 올바른 파일명
user-profile.tsx        # kebab-case (권장)
UserProfile.tsx         # PascalCase (컴포넌트)
userProfile.tsx         # camelCase (허용)

# ❌ 잘못된 파일명
user_profile.tsx        # snake_case (금지)
userprofile.tsx         # 소문자만 (금지)
```

### 컴포넌트 네이밍

```typescript
// ✅ 올바른 컴포넌트 네이밍
export function UserProfile() {} // PascalCase
export function LoginForm() {} // PascalCase
export function APIEndpoint() {} // 약어도 PascalCase

// ❌ 잘못된 컴포넌트 네이밍
export function userProfile() {} // camelCase (금지)
export function login_form() {} // snake_case (금지)
```

### 폴더 네이밍

```bash
# ✅ 올바른 폴더명
components/             # 소문자
user-settings/          # kebab-case
api-routes/            # kebab-case

# ❌ 잘못된 폴더명
Components/            # PascalCase (금지)
user_settings/         # snake_case (금지)
```

## 🔗 경로 별칭 (Path Aliases)

`components.json`에 정의된 경로 별칭:

```typescript
// ✅ 경로 별칭 사용 (권장)
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { AppHeader } from '@/components/layout/app-header'

// ❌ 상대 경로 사용 (금지)
import { Button } from '../../../components/ui/button'
import { cn } from '../../lib/utils'
```

**📍 정의된 별칭:**

- `@/components` → `src/components`
- `@/lib` → `src/lib`
- `@/hooks` → `src/hooks`
- `@/ui` → `src/components/ui`
- `@/utils` → `src/lib/utils`

## 📝 새 파일/폴더 추가 규칙

### 1. 새 UI 컴포넌트 추가

```bash
# shadcn/ui 컴포넌트 추가
npx shadcn@latest add [component-name]

# 커스텀 UI 컴포넌트 추가
src/components/ui/custom-component.tsx
```

### 2. 새 페이지 추가

```bash
# 정적 페이지
src/app/about/page.tsx

# 동적 페이지
src/app/users/[id]/page.tsx

# 그룹 라우트
src/app/(auth)/login/page.tsx
```

### 3. 새 비즈니스 컴포넌트 추가

```bash
# 위치 결정 기준:
1. 특정 페이지에서만 사용 → 해당 페이지 폴더 내
2. 여러 페이지에서 사용 → components/ 적절한 카테고리
3. 레이아웃 관련 → components/layout/
4. 네비게이션 관련 → components/navigation/
```

### 4. 새 유틸리티 추가

```bash
# 공통 유틸리티
src/lib/utils.ts            # 기존 파일에 추가

# 특화된 유틸리티
src/lib/date-utils.ts       # 새 파일 생성
src/lib/api-utils.ts        # 새 파일 생성
```

## 🎯 코드 조직 베스트 프랙티스

### 1. 단일 책임 원칙

- 하나의 파일은 하나의 주요 기능만 담당
- 관련된 타입과 유틸리티는 같은 파일에 포함 가능

### 2. 의존성 순서

```typescript
// 1. 외부 라이브러리
import React from 'react'
import { NextPage } from 'next'

// 2. 내부 라이브러리 (@/ 경로)
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// 3. 상대 경로
import './component.css'
```

### 3. Export 규칙

```typescript
// ✅ Named export 사용 (권장)
export function LoginForm() {}

// ✅ Default export (페이지 컴포넌트)
export default function LoginPage() {}

// ❌ 혼재 사용 지양
export function LoginForm() {}
export default LoginForm // 같은 컴포넌트를 두 방식으로 export
```

### 4. 파일 크기 관리

- 단일 파일: 300줄 이하 권장
- 300줄 초과 시 분할 고려
- 관련 기능별로 분리

## 🚫 금지사항

### ❌ 피해야 할 구조

```bash
# 깊은 중첩 구조 (4단계 이상)
src/components/pages/auth/forms/login/LoginForm.tsx

# 의미 없는 폴더명
src/components/misc/
src/components/common/
src/components/shared/

# 혼재된 케이스
src/Components/userProfile/LoginForm.tsx
```

### ❌ 피해야 할 패턴

```typescript
// 거대한 파일
export function SuperMegaComponent() {
  // 500줄 이상의 코드
}

// 혼재된 import
import Button from '@/components/ui/button' // default
import { Card } from '@/components/ui/card' // named

// 깊은 상대 경로
import { utils } from '../../../../../lib/utils'
```

## ✅ 체크리스트

새 파일/폴더 추가 시 확인사항:

- [ ] 적절한 카테고리 폴더에 배치
- [ ] kebab-case 파일명 사용
- [ ] PascalCase 컴포넌트명 사용
- [ ] 경로 별칭 사용
- [ ] 단일 책임 원칙 준수
- [ ] 적절한 export 방식 선택
- [ ] 의존성 import 순서 준수
- [ ] 파일 크기 300줄 이하 유지

이 가이드를 따라 일관성 있고 유지보수하기 쉬운 프로젝트 구조를 만들어보세요!
