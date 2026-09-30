# Task 023: 사내 서버 배포 및 운영 가이드 작성

> ROADMAP: `docs/ROADMAP.md` Phase 6 · Task 023
> 의존: Task 020
> 상태: 1단계(설정·백업·가이드 준비와 로컬 리허설) 완료, 2단계(사내 서버 적용) 서버 정보 대기 (PRD §10)

## 개요

사내 서버에 올리는 데 필요한 PM2·nginx 설정, 데이터 백업 스크립트, 배포·운영 가이드를 만들고 로컬 프로덕션 빌드로 리허설했다(1단계). 서버 정보(OS, Node 설치 가능 여부, 인증서 방식, 사내망 대역)를 받으면 가이드대로 서버에 적용하고 휴대폰으로 확인한다(2단계, Task 022와 함께).

## 관련 파일

- 생성: `ecosystem.config.cjs`, `deploy/nginx.conf.example`, `scripts/backup-data.ts`, `docs/guides/deployment.md`
- 수정: `.gitignore`(`/backups/`: `DATA_DIR=./data`일 때 기본 백업 위치)
- 참고: `docs/PRD.md` §8, §10 / `docs/ROADMAP.md` Q2, Q3

## 수락 기준

- [x] 백업본으로 다른 경로에 복원해 목록과 사진이 정상 표시된다 (로컬 리허설)
- [ ] 사내 서버 HTTPS 주소에서 휴대폰으로 전체 흐름(스캔 → 저장 → 목록 → 내보내기)이 동작한다
- [ ] 서버 재시작 후에도 데이터가 유지되고, 저장된 기록 시각이 KST로 맞다 (로컬 리허설로는 확인)
- [ ] 외부 인터넷에서 접근되지 않는다 (로컬에서는 127.0.0.1 바인딩으로 LAN IP 접속 거부만 확인)
- [x] `npm run check-all` 통과
- [x] `npm run build` 통과 (로컬). 사내 서버 빌드는 2단계

## 구현 단계

- [x] 1단계-1: `ecosystem.config.cjs` — fork 1개(SQLite 단일 쓰기), `127.0.0.1` 바인딩, `NODE_ENV=production`, `TZ=Asia/Seoul`, `DATA_DIR` 절대 경로, `max_memory_restart: '1G'`, 로그 경로. 서버마다 다른 값은 `SERVER` 블록 한 곳에서 바꿈
- [x] 1단계-2: `deploy/nginx.conf.example` — 80→443, 인증서 선택지 주석, 사내망 `allow`/`deny all`, `client_max_body_size 12m`, `/api/export`만 `proxy_read_timeout 120s`
- [x] 1단계-3: `scripts/backup-data.ts` — `better-sqlite3`의 `backup()`으로 DB를 떠낸 뒤 **백업본 DB가 가리키는 사진만** 복사. 백업 폴더가 그대로 `DATA_DIR`로 쓸 수 있는 일관된 상태가 됨. 빈 WAL 파일은 정리
- [x] 1단계-4: `docs/guides/deployment.md` — 요구 사항, 설치, PM2, nginx·인증서 비교, 백업·복원·cron, 업데이트·롤백, 장애 점검, 서버 담당자 확인 목록
- [ ] 2단계-1: 서버 담당자 확인 목록(가이드 8장) 답변 받기
- [ ] 2단계-2: 가이드대로 서버 설치·PM2·nginx 적용, `nginx -t`, 서버에서 `npm run build`
- [ ] 2단계-3: 휴대폰으로 전체 흐름, 재시작 후 데이터·KST, 백업·복원, 외부망 접근 차단 확인 (Task 022와 함께)

## 테스트 체크리스트 (1단계 로컬 리허설)

> 스크래치 복제본에서 `npm run build` 후 `next start`. 3000번의 기존 dev 서버와 `data/`는 건드리지 않음.

| #   | 시나리오                                                    | 기대                             | 실제                                                                | 결과 |
| --- | ----------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------- | ---- |
| 1   | dev 서버가 같은 DB를 쓰는 중에 `backup-data.ts` 실행        | 백업 완료, exit 0                | 기록 509건, 사진 8/8개 복사, 폴더 `backups/20260930-222951`, exit 0 | 통과 |
| 2   | 백업 폴더를 다른 경로로 복사해 `check-data-integrity`       | exit 0                           | 고아 파일·레코드 0, exit 0                                          | 통과 |
| 3   | 복원본 `PRAGMA integrity_check`                             | `ok`                             | `ok`, 기록 509건                                                    | 통과 |
| 4   | 비어 있지 않은 대상 폴더 지정                               | 쓰지 않고 거부                   | "대상 폴더가 비어 있지 않습니다", exit 2                            | 통과 |
| 5   | 없는 `DATA_DIR`                                             | 거부                             | "DB 파일이 없습니다", exit 2                                        | 통과 |
| 6   | 복원본을 `DATA_DIR`로, `TZ=UTC`로 프로덕션 실행 → 목록·상세 | 목록·사진 정상                   | 검색 목록 3건, 상세 사진 2장 로드(200)                              | 통과 |
| 7   | `TZ=UTC` 서버에서 새 기록 저장                              | `created_at`이 실제 KST `+09:00` | `2026-09-30T22:30:43+09:00` (그 순간 KST 시계 `22:30:43`)           | 통과 |
| 8   | 서버 재시작 후 조회                                         | 방금 저장한 기록과 사진 유지     | id 510 조회 성공, 정합성 exit 0                                     | 통과 |
| 9   | `-H 127.0.0.1`로 띄운 서버에 LAN IP로 접속                  | 접속 불가                        | 연결 거부                                                           | 통과 |
| 10  | `node -e "require('./ecosystem.config.cjs')"`               | 설정 로드                        | 이름·args·env·로그 경로가 의도대로 나옴                             | 통과 |
| 11  | nginx 설정 문법 (`nginx -t`)                                | 통과                             | 로컬에 nginx가 없어 확인 못 함 → 2단계 서버에서 확인                | 대기 |
| 12  | PM2 실제 실행 (`pm2 start`·`startup`·`reload`)              | 동작                             | 로컬에 PM2가 없어 확인 못 함 → 2단계 서버에서 확인                  | 대기 |

## 확인 필요

- PRD §10: 서버 OS/Node 설치 가능 여부, 인증서 방식(공인 도메인 / 사내 CA), 서버 OS 타임존, 사내망 대역 → `docs/guides/deployment.md` 8장 목록
- Q3: 200건 내보내기 때 서버 메모리. `max_memory_restart: '1G'`는 임시값이며 Task 022 측정 후 조정

## 변경 사항 요약

- 배포에 필요한 설정 파일 2개와 백업 스크립트, 운영 가이드를 추가했다. 앱 코드는 바꾸지 않았다
- 백업은 파일 복사 대신 SQLite 온라인 백업을 쓰고, 사진은 백업본 DB 기준으로 골라 DB와 파일이 어긋나지 않게 했다
- 로컬 리허설 10항목은 통과했다. nginx·PM2 실제 동작과 서버 전용 항목은 서버 적용 때 확인한다
