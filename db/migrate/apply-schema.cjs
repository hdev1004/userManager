// marigold 스키마 적용 (이미 존재하면 그대로 두고 종료)
// 사용: node apply-schema.cjs
// 환경: PGHOST PGPORT PGDATABASE PGUSER PGPASSWORD

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { pgConfig, requireEnv } = require('./lib/sql-parser.cjs');

const SCHEMA_FILE = path.resolve(__dirname, '..', 'marigold_schema.sql');

(async () => {
  requireEnv();
  const client = new Client(pgConfig());
  await client.connect();
  try {
    const pre = await client.query(
      `SELECT 1 FROM information_schema.schemata WHERE schema_name='marigold'`,
    );
    if (pre.rowCount > 0) {
      console.log('schema "marigold" 가 이미 존재합니다. 변경 없음.');
      console.log('전체를 다시 만들고 싶다면 reset.cjs 를 먼저 실행하거나, ');
      console.log('DROP SCHEMA marigold CASCADE 를 수동으로 실행하세요.');
      return;
    }
    const sql = fs.readFileSync(SCHEMA_FILE, 'utf8');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('schema 적용 완료.');
    const t = await client.query(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema='marigold' ORDER BY table_name`,
    );
    t.rows.forEach((r) => console.log('  -', r.table_name));
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('FAIL:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
