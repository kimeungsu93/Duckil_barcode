// zxing-wasm 디코더 바이너리를 public/wasm/으로 복사한다.
// 사내망에서는 zxing-wasm 기본값(jsDelivr CDN)에 접근할 수 없어 앱 서버에서 직접 서빙한다.
// postinstall·predev·prebuild에서 자동 실행되며, public/wasm/은 .gitignore 대상이다.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const source = fileURLToPath(
  new URL(
    '../node_modules/zxing-wasm/dist/reader/zxing_reader.wasm',
    import.meta.url
  )
)
const targetDir = fileURLToPath(new URL('../public/wasm/', import.meta.url))

if (!existsSync(source)) {
  console.error(
    `[copy-zxing-wasm] 원본 파일이 없습니다: ${source}\nnpm install을 먼저 실행하세요.`
  )
  process.exit(1)
}

mkdirSync(targetDir, { recursive: true })
copyFileSync(source, `${targetDir}zxing_reader.wasm`)
console.log('[copy-zxing-wasm] public/wasm/zxing_reader.wasm 복사 완료')
