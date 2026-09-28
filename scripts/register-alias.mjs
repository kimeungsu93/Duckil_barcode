// 검증 스크립트용 resolve 훅: Node 24 타입 스트리핑으로 src/*.ts를 직접 실행할 때
// '@/...' 별칭과 확장자 없는 상대 경로를 .ts 파일로 해석한다.
// 사용: node --import ./scripts/register-alias.mjs scripts/<name>.ts
import { existsSync, statSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const srcDir = fileURLToPath(new URL('../src/', import.meta.url))

// 실제 파일 경로를 찾는다 (그대로 → .ts → .tsx → index.ts 순)
function resolveTsFile(basePath) {
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    path.join(basePath, 'index.ts'),
  ]
  return candidates.find(c => existsSync(c) && statSync(c).isFile()) ?? null
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    // 'server-only'는 Next.js 번들러 전용 표식이라 순수 Node 스크립트에서는 빈 모듈로 대체한다
    if (specifier === 'server-only') {
      return { url: 'data:text/javascript,', shortCircuit: true }
    }
    let basePath = null
    if (specifier.startsWith('@/')) {
      basePath = path.join(srcDir, specifier.slice(2))
    } else if (
      (specifier.startsWith('./') || specifier.startsWith('../')) &&
      context.parentURL?.startsWith('file:') &&
      // node_modules 내부(CJS require 포함)의 상대 경로는 Node 기본 해석에 맡긴다
      !context.parentURL.includes('/node_modules/')
    ) {
      basePath = path.resolve(
        path.dirname(fileURLToPath(context.parentURL)),
        specifier
      )
    }
    if (basePath) {
      const file = resolveTsFile(basePath)
      if (file) return nextResolve(pathToFileURL(file).href, context)
    }
    return nextResolve(specifier, context)
  },
})
