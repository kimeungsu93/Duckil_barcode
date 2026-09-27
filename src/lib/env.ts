// 서버 전용 - node:path를 사용하므로 클라이언트 컴포넌트에서 import 금지
import path from 'node:path'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  // DB(app.db)와 사진(uploads/)을 저장하는 루트 디렉토리
  DATA_DIR: z.string().min(1).default('./data'),
})

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  DATA_DIR: process.env.DATA_DIR,
})

// 사진 저장 디렉토리 (DATA_DIR/uploads)
export const UPLOAD_DIR = path.join(env.DATA_DIR, 'uploads')

export type Env = z.infer<typeof envSchema>
