// 관리자 비밀번호를 bcrypt 해시로 설정.
// 사용: node set-admin-password.cjs <login_id> <new_password>
// 존재하지 않으면 생성, 있으면 갱신.

const bcrypt = require('bcrypt');
const { Client } = require('pg');
const { pgConfig, requireEnv } = require('./lib/sql-parser.cjs');

const LOGIN_ID = process.argv[2];
const PLAIN    = process.argv[3];

if (!LOGIN_ID || !PLAIN) {
  console.error('Usage: node set-admin-password.cjs <login_id> <new_password>');
  process.exit(1);
}

(async () => {
  requireEnv();
  const hash = await bcrypt.hash(PLAIN, 10);
  const c = new Client(pgConfig());
  await c.connect();

  const dup = await c.query(`SELECT id FROM marigold.admins WHERE login_id = $1`, [LOGIN_ID]);
  if (dup.rows.length > 0) {
    await c.query(
      `UPDATE marigold.admins SET password = $1, is_active = TRUE WHERE login_id = $2`,
      [hash, LOGIN_ID],
    );
    console.log('비밀번호 변경:', LOGIN_ID);
  } else {
    const r = await c.query(
      `INSERT INTO marigold.admins(login_id, password, name, is_active)
       VALUES ($1, $2, $3, TRUE) RETURNING id`,
      [LOGIN_ID, hash, LOGIN_ID],
    );
    console.log('관리자 신규 생성:', LOGIN_ID, '(id=' + r.rows[0].id + ')');
  }
  await c.end();
})();
