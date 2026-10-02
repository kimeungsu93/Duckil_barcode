# 사내 서버 배포·운영 가이드

Duckil Barcode를 사내 서버에 설치하고 운영하는 절차입니다. 구성은 **nginx(HTTPS, 사내망 제한) → PM2 → Next.js(127.0.0.1:3000) → SQLite + 사진 파일**입니다.

> 이 문서의 명령은 로컬(macOS)에서 프로덕션 빌드로 리허설했습니다(ROADMAP Task 023). 로컬에 nginx·PM2가 없어 **서버에서만 확인 가능**으로 표시한 단계는 서버 적용 때 처음 실행합니다.

| 표시 | 뜻                                                                   |
| ---- | -------------------------------------------------------------------- |
| ✅   | 로컬 리허설로 확인함 (2026-09-30)                                    |
| 🖥️   | 서버에서만 확인 가능 (nginx, PM2, 인증서, 방화벽, 서버 OS 타임존 등) |

## 1. 요구 사항

| 항목      | 기준                                                                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Node.js   | 24.16 이상 (`package.json`의 `engines`)                                                                                                          |
| 빌드 도구 | `better-sqlite3`는 네이티브 모듈. 서버 OS·Node 버전에 맞는 prebuilt가 없으면 설치 중 소스 빌드가 필요 (Linux: `python3`, `make`, `g++`)          |
| 디스크    | 사진 1장은 리사이즈 후 보통 150~400KB, 기록 1건당 최대 2장 → 1건 약 0.3~0.8MB. 하루 200건이면 월 약 1.8~4.8GB. 백업 보관분도 같은 크기로 더 필요 |
| 메모리    | 대량 내보내기 중 사진을 워크북에 담느라 일시적으로 늘어남. 200건 기준 실측은 Task 022에서 함 (ROADMAP Q3)                                        |
| 네트워크  | 휴대폰과 같은 사내망. 외부 인터넷에서 접근되면 안 됨 (PRD §8)                                                                                    |

## 2. 폴더 구성과 설치

앱 코드와 데이터를 분리해 두면 업데이트·백업이 쉽습니다. 아래 경로는 `ecosystem.config.cjs`의 기본값입니다.

```
/srv/duckil-barcode/
├── app/       # git clone한 코드 (ecosystem.config.cjs의 appDir)
├── data/      # DATA_DIR: app.db + uploads/  (git 밖, 백업 대상)
├── backups/   # scripts/backup-data.ts 기본 백업 위치 (data와 같은 위치의 backups/)
└── logs/      # PM2 로그
```

```bash
# 🖥️ 서버
sudo mkdir -p /srv/duckil-barcode/{data,backups,logs}
sudo chown -R <실행 계정>:<실행 계정> /srv/duckil-barcode
cd /srv/duckil-barcode
git clone <저장소 주소> app
cd app
npm ci           # better-sqlite3 설치 실패 시 1장의 빌드 도구 설치 후 다시 실행
npm run build    # ✅ 로컬 리허설: 빌드 중 DATA_DIR를 만들지 않음 (DB는 첫 요청 때 생성)
```

- `npm ci`(postinstall)와 `npm run build`(prebuild)가 스캐너 디코더 `public/wasm/zxing_reader.wasm`(약 1MB)을 `node_modules`에서 자동으로 복사합니다. 사내망이라 CDN 대신 앱 서버가 직접 서빙합니다
- 배포 후 `curl -I https://<주소>/wasm/zxing_reader.wasm`이 `200`, `Content-Type: application/wasm`인지 확인합니다 (nginx `mime.types`에 `wasm`이 없으면 추가)

## 3. PM2 실행

`ecosystem.config.cjs`의 `SERVER` 블록만 서버에 맞게 바꿉니다.

| 값                   | 설명                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `appDir`             | 앱 코드 위치                                                                                  |
| `dataDir`            | `DATA_DIR`. **반드시 절대 경로**. 상대 경로면 실행 위치에 따라 빈 DB가 새로 생길 수 있음      |
| `logDir`             | PM2 로그 위치                                                                                 |
| `port`               | 내부 포트. `127.0.0.1`에만 열리므로 외부에서 직접 접속할 수 없음 (✅ LAN IP 접속 거부 확인)   |
| `instances: 1`, fork | SQLite는 쓰기 프로세스가 하나일 때 가장 안전함. cluster 모드로 바꾸지 않음                    |
| `TZ: 'Asia/Seoul'`   | 프로세스 타임존 고정 (PRD §8). 저장 시각은 앱이 `+09:00`으로 직접 만들므로 OS 타임존과 무관함 |

```bash
# 🖥️ 서버
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save          # 현재 프로세스 목록 저장
pm2 startup       # 부팅 시 자동 시작. 화면에 나온 sudo 명령을 그대로 한 번 더 실행
pm2 install pm2-logrotate   # (권장) 로그 파일 자동 회전
```

✅ 로컬 리허설: `TZ=UTC`로 프로덕션 서버를 띄워도 새 기록의 `created_at`이 실제 KST 시각(`…+09:00`)과 일치했고, 서버를 재시작한 뒤에도 기록과 사진이 그대로 남았다.

## 4. nginx·HTTPS

`deploy/nginx.conf.example`을 복사해 `<...>` 값을 바꿉니다. 휴대폰 브라우저는 HTTPS에서만 카메라를 허용하므로 HTTPS는 필수입니다.

| 설정                                      | 이유                                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| 80 → 443 리다이렉트                       | 카메라는 HTTPS에서만 동작                                                 |
| `allow <사내 대역>; deny all;`            | 외부 인터넷 노출 금지 (PRD §8)                                            |
| `client_max_body_size 20m`                | 사진 3장(각 최대 5MB) 업로드. nginx 기본값 1MB면 사진 저장이 413으로 막힘 |
| `/api/export`의 `proxy_read_timeout 120s` | 사진이 많은 내보내기는 수십 초 걸릴 수 있음                               |
| `http2 on;`                               | nginx 1.25.1 이상. 낮은 버전이면 `listen 443 ssl http2;`로 바꿈           |

```bash
# 🖥️ 서버 (Ubuntu 예)
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/duckil-barcode
sudo nano /etc/nginx/sites-available/duckil-barcode      # <...> 값 바꾸기
sudo ln -s /etc/nginx/sites-available/duckil-barcode /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 인증서 방식 (미결, PRD §10)

| 방식               | 장점                                 | 해야 할 일                                                                                                            |
| ------------------ | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| 공인 도메인 인증서 | 휴대폰에 아무것도 설치하지 않아도 됨 | 사내 DNS에서 공인 도메인(예: `barcode.회사도메인`)이 이 서버를 가리키게 하고, 도메인 인증서 발급·갱신                 |
| 사내 CA 인증서     | 외부 도메인이 필요 없음              | 작업자 휴대폰마다 사내 루트 인증서 설치. iOS는 프로파일 설치 후 **설정 > 일반 > 정보 > 인증서 신뢰 설정**에서 켜야 함 |

인증서가 신뢰되지 않으면 브라우저가 경고를 띄우고, 경고를 넘겨도 카메라가 막힐 수 있습니다. 배포 후 휴대폰에서 주소창 자물쇠 표시를 먼저 확인합니다.

## 5. 백업·복원

WAL 모드라 `app.db` 파일을 그냥 복사하면 최근 변경이 빠질 수 있습니다. 반드시 백업 스크립트(SQLite 온라인 백업)를 씁니다. 서버가 실행 중이어도 됩니다.

```bash
# ✅ 로컬 리허설 (실행 중인 서버의 DB로 확인)
cd /srv/duckil-barcode/app
DATA_DIR=/srv/duckil-barcode/data node --import ./scripts/register-alias.mjs scripts/backup-data.ts
# → /srv/duckil-barcode/backups/YYYYMMDD-HHmmss/ (app.db + uploads/)
```

- 백업본 DB가 가리키는 사진만 복사하므로, 백업 폴더 자체가 그대로 `DATA_DIR`로 쓸 수 있는 상태가 됩니다
- exit 0: 완료, exit 1: 백업은 만들었지만 원본에 없는 사진이 있음(목록 출력), exit 2: DB가 없거나 실패
- 대상 폴더를 인자로 줄 수 있고, 비어 있지 않은 폴더에는 쓰지 않습니다

정기 백업 (🖥️ cron 예시, 매일 새벽 2시, 30일 지난 백업 삭제):

```cron
0 2 * * * cd /srv/duckil-barcode/app && DATA_DIR=/srv/duckil-barcode/data /usr/bin/node --import ./scripts/register-alias.mjs scripts/backup-data.ts >> /srv/duckil-barcode/logs/backup.log 2>&1
30 2 * * * find /srv/duckil-barcode/backups -mindepth 1 -maxdepth 1 -type d -mtime +30 -exec rm -rf {} +
```

백업 폴더는 다른 디스크나 다른 서버로도 복사해 두는 것을 권장합니다.

### 복원

```bash
# 1) 앱 중지
pm2 stop duckil-barcode
# 2) 현재 데이터는 지우지 말고 옆으로 옮겨 둔다
mv /srv/duckil-barcode/data /srv/duckil-barcode/data.before-restore
# 3) 백업 폴더를 DATA_DIR로 복사
cp -R /srv/duckil-barcode/backups/<YYYYMMDD-HHmmss> /srv/duckil-barcode/data
# 4) 검증 (✅ 로컬 리허설: 복원본에서 exit 0, integrity_check ok)
DATA_DIR=/srv/duckil-barcode/data node --import ./scripts/register-alias.mjs scripts/check-data-integrity.ts
sqlite3 /srv/duckil-barcode/data/app.db "PRAGMA integrity_check;"
# 5) 앱 시작 후 휴대폰에서 목록·사진 확인
pm2 start duckil-barcode
```

✅ 로컬 리허설: 백업본을 다른 경로에 복원하고 그 경로를 `DATA_DIR`로 프로덕션 서버를 띄워 목록·상세 사진이 정상 표시됨을 확인했다.

## 6. 업데이트

```bash
# 🖥️ 서버
cd /srv/duckil-barcode/app
DATA_DIR=/srv/duckil-barcode/data node --import ./scripts/register-alias.mjs scripts/backup-data.ts   # 먼저 백업
git pull
npm ci
npm run build
pm2 reload ecosystem.config.cjs --update-env
```

- 인스턴스가 1개(fork)라 `reload`도 잠깐(수 초) 끊깁니다. 작업자가 쓰지 않는 시간에 합니다
- DB 스키마는 앱이 DB에 처음 접근할 때(재시작 후 첫 요청) `user_version` 기준으로 자동 마이그레이션합니다. 그래서 업데이트 전 백업이 중요합니다
- 롤백: `git checkout <이전 커밋>` → `npm ci` → `npm run build` → `pm2 reload …`. 마이그레이션이 포함된 업데이트를 되돌릴 때는 업데이트 전 백업으로 복원합니다

## 7. 장애 점검

| 증상                          | 확인할 것                                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 접속이 안 됨                  | `pm2 status`, `pm2 logs duckil-barcode`, `sudo nginx -t`, `curl -I http://127.0.0.1:3000/`                                     |
| 카메라가 켜지지 않음          | HTTPS 주소인지, 인증서가 신뢰되는지(자물쇠 표시), 브라우저 카메라 권한                                                         |
| 카메라는 켜지는데 인식이 느림 | `/wasm/zxing_reader.wasm`이 200인지. 실패하면 브라우저 콘솔에 "기본 디코더로 전환" 경고가 뜨고 인식률이 낮은 zxing-js로 동작함 |
| 사진 저장이 413               | nginx `client_max_body_size`(1MB 기본값으로 돌아가지 않았는지). 앱 자체 413은 사진 1장 5MB 초과일 때                           |
| 저장·삭제가 500               | `DATA_DIR` 권한(실행 계정이 `data/`, `data/uploads/`에 쓰기 가능한지), 디스크 여유 `df -h`                                     |
| 기록 시각이 이상함            | `pm2 env <id>`에서 `TZ=Asia/Seoul` 확인. 저장값은 항상 `+09:00`이어야 함                                                       |
| 내보내기가 중간에 끊김(504)   | nginx `/api/export`의 `proxy_read_timeout`, 기간을 좁혀 다시 시도, `pm2 monit`으로 메모리 확인                                 |
| 목록에 있는데 사진이 404      | `check-data-integrity.ts`로 고아 레코드 확인. 파일을 손으로 지웠거나 복원이 덜 된 경우                                         |

## 8. 서버 담당자 확인 목록 (PRD §10 미결)

배포 전에 서버 담당자에게 받아야 할 답입니다. 답을 받으면 ROADMAP "확인 필요 사항"과 이 문서를 갱신합니다.

- [ ] 서버 OS와 버전, Node.js 24.16 설치 가능 여부 (없으면 nvm 등 사용자 설치 가능한지)
- [ ] `better-sqlite3` 빌드 도구(`python3`, `make`, `g++`) 설치 가능 여부
- [ ] HTTPS 인증서 방식: 공인 도메인 인증서 / 사내 CA (사내 CA면 휴대폰 루트 인증서 배포 방법)
- [ ] 서버 주소(도메인)와 사내망 IP 대역 (nginx `server_name`, `allow`)
- [ ] 서버 OS 타임존이 `Asia/Seoul`인지 (`timedatectl`). 앱은 무관하게 KST로 저장하지만 로그·cron 시각 해석에 필요 (ROADMAP Q2)
- [ ] 데이터 폴더를 둘 디스크와 용량, 백업 보관 위치(다른 디스크·서버)
- [ ] 방화벽: 443(필요하면 80)만 사내망에 열고 3000은 열지 않음
- [ ] nginx 사용 가능 여부와 버전 (`nginx -v`, 1.25.1 미만이면 `http2` 설정 변경)
