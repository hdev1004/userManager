// 레거시 MariaDB 백업 → MARIGOLD 임포트 (BLOB 이미지 제외)
// 사용: node import-data.cjs <backup.sql>
// 환경: PGHOST PGPORT PGDATABASE PGUSER PGPASSWORD

const fs = require('fs');
const { Client } = require('pg');
const {
  extractInsert,
  yymmddToTs,
  yyyymmddToTs,
  pgConfig,
  requireEnv,
} = require('./lib/sql-parser.cjs');

const SQL_FILE = process.argv[2];
if (!SQL_FILE) {
  console.error('Usage: node import-data.cjs <backup.sql>');
  process.exit(1);
}

(async () => {
  requireEnv();

  console.log('백업 파일 읽는 중:', SQL_FILE);
  const raw = fs.readFileSync(SQL_FILE, 'utf8');

  const LOGIN      = extractInsert(raw, 'LOGIN');
  const USERS      = extractInsert(raw, 'USERS');
  const ITEMS      = extractInsert(raw, 'ITEMS');
  const USE_INFO   = extractInsert(raw, 'USE_INFO');
  const MEMO       = extractInsert(raw, 'MEMO');
  const SAVE_POINT = extractInsert(raw, 'SAVE_POINT');
  const USE_POINT  = extractInsert(raw, 'USE_POINT');

  console.log('파싱 완료:',
    'LOGIN=' + LOGIN.length,
    'USERS=' + USERS.length,
    'ITEMS=' + ITEMS.length,
    'USE_INFO=' + USE_INFO.length,
    'MEMO=' + MEMO.length,
    'SAVE_POINT=' + SAVE_POINT.length,
    'USE_POINT=' + USE_POINT.length);

  const memoByPayId = new Map(MEMO.map((r) => [r[0], r[1]]));
  const earnByPayId = new Map(SAVE_POINT.map((r) => [r[0], r[1]]));
  const usedByPayId = new Map(USE_POINT.map((r) => [r[0], r[1]]));

  const client = new Client(pgConfig());
  await client.connect();
  console.log('DB 연결 완료.');

  // 비어있을 때만 진행
  const pre = await client.query(`
    SELECT
      (SELECT count(*) FROM marigold.members)::int  AS members,
      (SELECT count(*) FROM marigold.items)::int    AS items,
      (SELECT count(*) FROM marigold.payments)::int AS payments
  `);
  if (pre.rows[0].members + pre.rows[0].items + pre.rows[0].payments > 0) {
    console.error('ABORT: 대상 테이블에 데이터가 이미 있습니다.', pre.rows[0]);
    console.error('reset.cjs 를 먼저 실행해서 비운 뒤 다시 시도하세요.');
    process.exit(2);
  }

  // 마이그레이션 친화적 제약 완화 (이미 적용돼 있으면 NOOP)
  console.log('legacy 데이터 수용을 위한 제약 완화...');
  await client.query(`ALTER TABLE marigold.members ALTER COLUMN phone DROP NOT NULL`);
  await client.query(`DROP INDEX IF EXISTS marigold.uq_members_phone_active`);

  try {
    await client.query('BEGIN');

    // 1) admins (LOGIN) ----------------------------------------------------
    for (const [id, pw] of LOGIN) {
      await client.query(
        `INSERT INTO marigold.admins(login_id, password, name) VALUES ($1, $2, $3)`,
        [id, pw, id],
      );
    }
    console.log('admins:', LOGIN.length);
    const adminRes = await client.query(`SELECT id FROM marigold.admins ORDER BY id LIMIT 1`);
    const defaultAdminId = adminRes.rows[0] ? adminRes.rows[0].id : null;

    // 2) items + item_categories -------------------------------------------
    const catRes = await client.query(`SELECT id, code FROM marigold.item_categories`);
    const catByCode = new Map(catRes.rows.map((r) => [r.code, r.id]));

    let itemsIns = 0, itemsSkip = 0;
    const seenCode = new Set();
    for (const [item_id, item_nm, pay, align_id, type] of ITEMS) {
      let catId = catByCode.get(type);
      if (!catId) {
        const c = await client.query(
          `INSERT INTO marigold.item_categories(code, name, sort_order)
           VALUES ($1, $1, 999) RETURNING id`,
          [type || 'ETC'],
        );
        catId = c.rows[0].id;
        catByCode.set(type, catId);
      }
      if (seenCode.has(item_id)) { itemsSkip++; continue; }
      seenCode.add(item_id);
      await client.query(
        `INSERT INTO marigold.items(category_id, code, name, price, sort_order, is_active)
         VALUES ($1, $2, $3, $4, $5, TRUE)`,
        [catId, item_id, item_nm || item_id, pay || 0, align_id || 0],
      );
      itemsIns++;
    }
    console.log('items:', itemsIns, '(중복 코드 skip:', itemsSkip + ')');

    const itemMapRes = await client.query(`SELECT id, code FROM marigold.items`);
    const itemIdByCode = new Map(itemMapRes.rows.map((r) => [r.code, r.id]));

    // 3) members (USERS) ---------------------------------------------------
    const BATCH = 500;
    for (let mIdx = 0; mIdx < USERS.length; mIdx += BATCH) {
      const batch = USERS.slice(mIdx, mIdx + BATCH);
      const vals = [], params = [];
      let p = 1;
      for (const [user_id, name, phone, point, create_date, visit] of batch) {
        const phoneClean = (!phone || phone === '0' || phone.trim() === '') ? null : phone;
        const createdAt = yymmddToTs(create_date);
        vals.push(`($${p++},$${p++},$${p++},$${p++},$${p++},COALESCE($${p++}::timestamptz, NOW()))`);
        params.push(name || '(이름없음)', phoneClean, point || 0, visit || 0, user_id, createdAt);
      }
      await client.query(
        `INSERT INTO marigold.members
           (name, phone, point, visit_count, legacy_user_id, created_at)
         VALUES ${vals.join(',')}`,
        params,
      );
      process.stdout.write(`  members ${Math.min(mIdx + BATCH, USERS.length)}/${USERS.length}\r`);
    }
    console.log('\nmembers:', USERS.length);

    const memMapRes = await client.query(
      `SELECT id, legacy_user_id FROM marigold.members WHERE legacy_user_id IS NOT NULL`,
    );
    const memberByLegacy = new Map(memMapRes.rows.map((r) => [r.legacy_user_id, r.id]));

    // 4) payments + payment_items (USE_INFO + MEMO + SAVE_POINT + USE_POINT)
    const grouped = new Map();
    for (const r of USE_INFO) {
      const [, pay_id, user_id, item_code, pay, number, pay_date, , item_nm] = r;
      if (!grouped.has(pay_id)) grouped.set(pay_id, { user_id, pay_date, rows: [] });
      grouped.get(pay_id).rows.push({ item_code, pay: pay || 0, number: number || 1, item_nm });
    }
    console.log('payment groups (pay_id):', grouped.size);

    let payIns = 0, payOrphan = 0, itemRowsIns = 0;
    const entries = [...grouped.entries()];

    for (let off = 0; off < entries.length; off += BATCH) {
      const chunk = entries.slice(off, off + BATCH);
      const vals = [], params = [];
      let p = 1;
      const valid = [];
      for (const [pay_id, g] of chunk) {
        const member_id = memberByLegacy.get(g.user_id);
        if (!member_id) { payOrphan++; continue; }
        const total = g.rows.reduce((s, x) => s + x.pay * x.number, 0);
        const used  = usedByPayId.get(pay_id) || 0;
        const earn  = earnByPayId.get(pay_id) || 0;
        const memo  = memoByPayId.get(pay_id) || null;
        // 레거시는 1:1 차감 가정으로 들어와 있어 그대로 유지
        const finalAmt = Math.max(0, total - used);
        const paidAt = yyyymmddToTs(g.pay_date);
        vals.push(`($${p++},COALESCE($${p++}::timestamptz, NOW()),$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++})`);
        params.push(member_id, paidAt, total, used, earn, finalAmt, memo, pay_id, defaultAdminId);
        valid.push([pay_id, g.rows]);
      }
      if (vals.length === 0) continue;

      const res = await client.query(
        `INSERT INTO marigold.payments
           (member_id, paid_at, total_amount, point_used, point_earned, final_amount, memo, legacy_pay_id, created_by)
         VALUES ${vals.join(',')}
         RETURNING id, legacy_pay_id`,
        params,
      );
      const newIdByPayId = new Map(res.rows.map((r) => [r.legacy_pay_id, r.id]));
      payIns += res.rowCount;

      const ivals = [], iparams = [];
      let q = 1;
      for (const [pay_id, rows] of valid) {
        const newId = newIdByPayId.get(pay_id);
        for (const row of rows) {
          const newItemId = itemIdByCode.get(row.item_code) || null;
          ivals.push(`($${q++},$${q++},$${q++},$${q++},$${q++},$${q++})`);
          iparams.push(newId, newItemId, row.item_nm || (row.item_code || '(미상)'), row.pay, row.number, row.pay * row.number);
        }
      }
      if (ivals.length > 0) {
        await client.query(
          `INSERT INTO marigold.payment_items
             (payment_id, item_id, item_name, unit_price, quantity, amount)
           VALUES ${ivals.join(',')}`,
          iparams,
        );
        itemRowsIns += ivals.length;
      }
      process.stdout.write(`  payments ${payIns}+${payOrphan}orphan / ${grouped.size}\r`);
    }
    console.log('\npayments:', payIns, '(orphan:', payOrphan + ')');
    console.log('payment_items:', itemRowsIns);

    await client.query('COMMIT');
    console.log('\nimport-data 완료.');

    // 최종 카운트
    const after = await client.query(`
      SELECT 'admins' t, count(*)::int n FROM marigold.admins
      UNION ALL SELECT 'item_categories', count(*) FROM marigold.item_categories
      UNION ALL SELECT 'items',           count(*) FROM marigold.items
      UNION ALL SELECT 'members',         count(*) FROM marigold.members
      UNION ALL SELECT 'payments',        count(*) FROM marigold.payments
      UNION ALL SELECT 'payment_items',   count(*) FROM marigold.payment_items
      UNION ALL SELECT 'payment_images',  count(*) FROM marigold.payment_images
    `);
    after.rows.forEach((r) => console.log('  ' + r.t.padEnd(18) + r.n));
    console.log('\n이미지는 별도: node import-images.cjs <backup.sql> <upload-root>');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('FAIL:', e.message);
    if (e.detail) console.error('detail:', e.detail);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
