// marigold 스키마 안의 모든 데이터를 비웁니다.
// 스키마(테이블/트리거 등)는 유지. 카테고리 시드는 다시 채워둠.
// 사용: node reset.cjs --yes
//        node reset.cjs   (확인 프롬프트)

const readline = require('readline');
const { Client } = require('pg');
const { pgConfig, requireEnv } = require('./lib/sql-parser.cjs');

function confirm(msg) {
  if (process.argv.includes('--yes')) return Promise.resolve(true);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) =>
    rl.question(msg + ' [y/N] ', (a) => {
      rl.close();
      resolve(a.trim().toLowerCase() === 'y');
    }),
  );
}

(async () => {
  requireEnv();
  const ok = await confirm('marigold 의 모든 데이터를 삭제합니다. 진행할까요?');
  if (!ok) {
    console.log('취소됨.');
    return;
  }

  const client = new Client(pgConfig());
  await client.connect();
  try {
    await client.query('BEGIN');
    // 자식 → 부모 순서대로 TRUNCATE CASCADE
    await client.query(`
      TRUNCATE
        marigold.payment_images,
        marigold.payment_items,
        marigold.payments,
        marigold.member_histories,
        marigold.members,
        marigold.items,
        marigold.item_categories,
        marigold.admins
      RESTART IDENTITY CASCADE;
    `);
    // 기본 카테고리 시드 재삽입
    await client.query(`
      INSERT INTO marigold.item_categories (code, name, sort_order) VALUES
        ('PER', '펌',     1),
        ('CUT', '컷',     2),
        ('DRY', '드라이', 3),
        ('DYE', '염색',   4)
      ON CONFLICT (code) DO NOTHING;
    `);
    await client.query('COMMIT');
    console.log('reset 완료. (item_categories 만 시드된 빈 상태)');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('FAIL:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
