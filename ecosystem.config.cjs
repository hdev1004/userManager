// PM2 ecosystem — 운영 서버 (/root/projects/userManager) 기준
// 사용:
//   pm2 start ecosystem.config.cjs
//   pm2 reload ecosystem.config.cjs   # 무중단 재시작
//   pm2 save && pm2 startup           # 부팅 시 자동 기동
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
