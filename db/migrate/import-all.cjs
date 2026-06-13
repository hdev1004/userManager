// 백업 한 번에 전체 임포트 (스키마 보장 → reset → 데이터 → 이미지 → 관리자 비번 리셋)
// 사용: node import-all.cjs <backup.sql> <upload-root> [admin_password]

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SQL = process.argv[2];
const UPLOAD = process.argv[3];
const ADMIN_PW = process.argv[4] || 'marigold';

if (!SQL || !UPLOAD) {
  console.error('Usage: node import-all.cjs <backup.sql> <upload-root> [admin_password]');
  console.error('  예: node import-all.cjs ../../20260613_marigold0210_DB_Backup.sql ../../uploads marigold');
  process.exit(1);
}

if (!fs.existsSync(SQL)) {
  console.error('백업 파일을 찾을 수 없습니다:', SQL);
  process.exit(1);
}

function run(label, args) {
  console.log('\n========================================');
  console.log('▶', label);
  console.log('========================================');
  const r = spawnSync(process.execPath, args, { stdio: 'inherit', cwd: __dirname });
  if (r.status !== 0) {
    console.error('!! 단계 실패:', label, '(exit', r.status + ')');
    process.exit(r.status || 1);
  }
}

run('1. apply-schema (없으면 생성)', ['apply-schema.cjs']);
run('2. reset (기존 데이터 비우기)',  ['reset.cjs', '--yes']);
run('3. import-data',                ['import-data.cjs', SQL]);
run('4. import-images',              ['import-images.cjs', SQL, UPLOAD]);
run('5. 관리자 marigold 비번 리셋',  ['set-admin-password.cjs', 'marigold', ADMIN_PW]);

console.log('\n전체 임포트 완료.');
console.log(`로그인: marigold / ${ADMIN_PW}`);
