// PM2 실행 설정 (ROADMAP Phase 6 Task 023, 운영 절차는 docs/guides/deployment.md)
// 사용: npm ci && npm run build 후 `pm2 start ecosystem.config.cjs`
//
// 서버마다 다른 값은 아래 SERVER 블록만 바꾼다. DATA_DIR는 반드시 절대 경로로 지정한다
// (상대 경로면 PM2 실행 위치에 따라 다른 폴더에 DB가 새로 만들어질 수 있다).
const SERVER = {
  // 앱 코드 위치 (git clone한 폴더)
  appDir: '/srv/duckil-barcode/app',
  // DB(app.db)와 사진(uploads/) 저장 위치. 앱 코드와 분리해 업데이트·백업을 쉽게 한다
  dataDir: '/srv/duckil-barcode/data',
  // PM2 로그 위치
  logDir: '/srv/duckil-barcode/logs',
  // nginx가 프록시할 내부 포트 (외부에 직접 열지 않는다)
  port: 3000,
}

module.exports = {
  apps: [
    {
      name: 'duckil-barcode',
      cwd: SERVER.appDir,
      script: 'node_modules/next/dist/bin/next',
      // localhost에서만 받는다. 외부 접속은 nginx(HTTPS)만 거친다 (PRD §8)
      args: `start -p ${SERVER.port} -H 127.0.0.1`,
      // SQLite는 쓰기 프로세스가 하나일 때 가장 안전하다. cluster 모드·여러 인스턴스를 쓰지 않는다
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      // 대량 내보내기(사진 수백 장) 중 메모리가 급증했다가 새지 않는지 감시하는 안전장치 (ROADMAP Q3)
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        // 서버 OS 타임존과 무관하게 KST로 고정 (PRD §8, ROADMAP Q2). 저장 시각은 앱이 +09:00으로 직접 만든다
        TZ: 'Asia/Seoul',
        DATA_DIR: SERVER.dataDir,
        PORT: String(SERVER.port),
      },
      out_file: `${SERVER.logDir}/out.log`,
      error_file: `${SERVER.logDir}/error.log`,
      time: true,
    },
  ],
}
