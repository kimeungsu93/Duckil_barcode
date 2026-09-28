// 브라우저 전용 - /api/records, /api/photos 호출용 fetch 래퍼.
// server-only 모듈(record-form.ts, storage.ts 등)은 import하지 않고, 타입만 import한다.
import type { ApiErrorBody, ApiErrorCode } from '@/lib/types/api'
import type {
  CreateRecordResponse,
  RecordDto,
  RecordListResponse,
} from '@/lib/types/record'

// API 에러를 표준 Error로 감싼 클래스. UI가 status·code·fields로 분기 처리할 수 있게 한다
export class ApiError extends Error {
  status: number
  code: ApiErrorCode
  fields?: Record<string, string>

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    fields?: Record<string, string>
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
  }
}

// fetch 응답을 처리하는 공통 헬퍼.
// - 네트워크 요청 자체가 실패하면(오프라인 등) ApiError로 바꿔서 던진다
// - !res.ok면 ApiErrorBody(JSON)를 파싱해 ApiError로 던진다. 파싱에 실패하면 INTERNAL_ERROR로 처리한다
// - 204 No Content는 undefined를 반환한다
async function request<T>(input: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(input, init)
  } catch (error) {
    throw new ApiError(
      0,
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : '네트워크 요청에 실패했습니다'
    )
  }

  if (!res.ok) {
    let body: ApiErrorBody | null = null
    try {
      body = (await res.json()) as ApiErrorBody
    } catch {
      // 응답 본문이 JSON이 아니거나 비어있는 경우(예: 서버가 아예 죽어있을 때) INTERNAL_ERROR로 처리한다
      body = null
    }

    if (body?.error) {
      throw new ApiError(
        res.status,
        body.error.code,
        body.error.message,
        body.error.fields
      )
    }
    throw new ApiError(
      res.status,
      'INTERNAL_ERROR',
      `요청이 실패했습니다 (${res.status})`
    )
  }

  if (res.status === 204) {
    return undefined as T
  }

  return (await res.json()) as T
}

// 값이 undefined인 필드는 FormData에 아예 넣지 않는다 (PATCH의 "보낸 필드만 갱신" 규칙과 맞춰야 함)
function appendIfDefined(
  formData: FormData,
  key: string,
  value: string | Blob | undefined
): void {
  if (value === undefined) return
  formData.append(key, value)
}

export interface CreateRecordInput {
  raw_text: string
  product_no: string
  lot: string
  memo?: string
  barcode_photo?: Blob
  product_photo?: Blob
}

// POST /api/records: 기록 생성 (multipart/form-data)
export async function createRecord(
  input: CreateRecordInput
): Promise<CreateRecordResponse> {
  const formData = new FormData()
  formData.append('raw_text', input.raw_text)
  formData.append('product_no', input.product_no)
  formData.append('lot', input.lot)
  appendIfDefined(formData, 'memo', input.memo)
  appendIfDefined(formData, 'barcode_photo', input.barcode_photo)
  appendIfDefined(formData, 'product_photo', input.product_photo)

  return request<CreateRecordResponse>('/api/records', {
    method: 'POST',
    body: formData,
  })
}

export interface ListRecordsQuery {
  q?: string
  limit?: number
  offset?: number
  from?: string
  to?: string
}

// GET /api/records: 목록/검색 조회
export async function listRecords(
  query: ListRecordsQuery = {}
): Promise<RecordListResponse> {
  const params = new URLSearchParams()
  if (query.q !== undefined) params.set('q', query.q)
  if (query.limit !== undefined) params.set('limit', String(query.limit))
  if (query.offset !== undefined) params.set('offset', String(query.offset))
  if (query.from !== undefined) params.set('from', query.from)
  if (query.to !== undefined) params.set('to', query.to)

  const qs = params.toString()
  return request<RecordListResponse>(`/api/records${qs ? `?${qs}` : ''}`)
}

// GET /api/records/[id]: 단건 조회
export async function getRecord(id: number): Promise<RecordDto> {
  return request<RecordDto>(`/api/records/${id}`)
}

export interface UpdateRecordInput {
  product_no?: string
  lot?: string
  memo?: string
  barcode_photo?: Blob
  product_photo?: Blob
}

// PATCH /api/records/[id]: 부분 수정 (multipart/form-data). raw_text는 서버 스키마에 없어 보내도 무시된다
export async function updateRecord(
  id: number,
  input: UpdateRecordInput
): Promise<RecordDto> {
  const formData = new FormData()
  appendIfDefined(formData, 'product_no', input.product_no)
  appendIfDefined(formData, 'lot', input.lot)
  appendIfDefined(formData, 'memo', input.memo)
  appendIfDefined(formData, 'barcode_photo', input.barcode_photo)
  appendIfDefined(formData, 'product_photo', input.product_photo)

  return request<RecordDto>(`/api/records/${id}`, {
    method: 'PATCH',
    body: formData,
  })
}

// DELETE /api/records/[id]: 기록 삭제. 성공 시 204라 반환값이 없다
export async function deleteRecord(id: number): Promise<void> {
  return request<void>(`/api/records/${id}`, { method: 'DELETE' })
}

// 사진 파일명 → 조회 URL. <img src={photoUrl(record.barcode_photo)}> 형태로 사용한다 (Phase 5)
export function photoUrl(name: string): string {
  return `/api/photos/${name}`
}
