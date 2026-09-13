// PM2 ecosystem — 운영 서버 (/root/projects/userManager) 기준
// 사용:
//   ./deploy.sh                       # 배포 (git pull + 빌드 + reload) — 권장
//   ./deploy.sh --no-pull             # 이미 pull 한 뒤 재빌드/재기동만
//   pm2 start ecosystem.config.cjs    # 최초 기동 (dist/ 존재해야 함)
//   pm2 reload ecosystem.config.cjs   # 무중단 재시작 (소스 변경 없을 때만)
//   pm2 save && pm2 startup           # 부팅 시 자동 기동
//
// 주의: 소스만 pull 하면 화면 그대로. 반드시 build 필요.
//   - frontend: vite preview 가 frontend/dist 를 서빙
//   - backend : node 가 backend/dist/main.js 를 실행
//
// 로그: ./logs/{api,web}-{out,err}.log

module.exports = {
  apps: [
    {
      name: 'marigold-api',
      cwd: './backend',
      script: './dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3004,
      },
      out_file: './logs/api-out.log',
      error_file: './logs/api-err.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'marigold-web',
      cwd: './frontend',
      script: './node_modules/vite/bin/vite.js',
      args: 'preview --port 3005 --host 0.0.0.0',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
      },
      out_file: './logs/web-out.log',
      error_file: './logs/web-err.log',
      merge_logs: true,
      time: true,
    },
  ],
};
