// Phase 2 화면 상태 전환용 ?preview=<상태> 헬퍼. 브라우저·Node 공용 순수 모듈
// env.ts는 node:path를 쓰므로 import하지 않고 NODE_ENV를 직접 읽는다

// Next.js 15 page의 searchParams(await 후) 형태
export type PreviewSearchParams = Record<string, string | string[] | undefined>

// 개발 모드에서만 허용된 preview 값을 돌려준다. 프로덕션 빌드에서는 항상 null
export function readPreview<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[]
): T | null {
  if (process.env.NODE_ENV === 'production') return null
  const first = Array.isArray(value) ? value[0] : value
  if (!first) return null
  return (allowed as readonly string[]).includes(first) ? (first as T) : null
}
