// 레거시 IMAGES.img (base64 dataURL) → 디스크 파일로 추출 + payment_images 메타 저장
// 사용: node import-images.cjs <backup.sql> <upload-root>
// 환경: PGHOST PGPORT PGDATABASE PGUSER PGPASSWORD
//
// upload-root 예: ../../uploads  (프로젝트 루트의 uploads 폴더)
// 결과 경로 규칙:
//   디스크: <upload-root>/payments/{new_payment_id}/{legacy_row_id}.{ext}
//   DB:     payments/{new_payment_id}/{legacy_row_id}.{ext}

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Client } = require('pg');
const { parseTuples, pgConfig, requireEnv } = require('./lib/sql-parser.cjs');

const SQL_FILE = process.argv[2];
const UPLOAD_ROOT = process.argv[3];

if (!SQL_FILE || !UPLOAD_ROOT) {
  console.error('Usage: node import-images.cjs <backup.sql> <upload-root>');
  process.exit(1);
}

(async () => {
  requireEnv();

  const client = new Client(pgConfig());
  await client.connect();

  const existing = await client.query(`SELECT count(*)::int n FROM marigold.payment_images`);
  if (existing.rows[0].n > 0) {
    console.error(`ABORT: payment_images 에 이미 ${existing.rows[0].n} 행이 있습니다.`);
    console.error('전체 이미지를 다시 임포트하려면 reset.cjs 부터 다시 실행하세요.');
    process.exit(2);
  }

  console.log('legacy_pay_id → payment.id 맵 작성 중...');
  const r = await client.query(
    `SELECT id, legacy_pay_id FROM marigold.payments WHERE legacy_pay_id IS NOT NULL`,
  );
  const payIdByLegacy = new Map(r.rows.map((x) => [x.legacy_pay_id, x.id]));
  console.log('  map size:', payIdByLegacy.size);

  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

  const stream = fs.createReadStream(SQL_FILE, {
    encoding: 'utf8',
    highWaterMark: 1024 * 1024,
  });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let processed = 0, written = 0, orphaned = 0, errors = 0;
  const batch = [];
  const FLUSH_AT = 30;

  async function flush() {
    if (batch.length === 0) return;
    const vals = [], params = [];
    let p = 1;
    for (const x of batch) {
      vals.push(`($${p++},$${p++},$${p++},$${p++})`);
      params.push(x.payment_id, x.file_path, x.file_size, x.mime_type);
    }
    await client.query(
      `INSERT INTO marigold.payment_images (payment_id, file_path, file_size, mime_type)
       VALUES ${vals.join(',')}`,
      params,
    );
    batch.length = 0;
  }

  try {
    for await (const line of rl) {
      if (!line.startsWith('INSERT INTO `IMAGES`')) continue;
      const vIdx = line.indexOf('VALUES');
      if (vIdx < 0) continue;
      const valuesSection = line.slice(vIdx + 'VALUES'.length);

      let tuples;
      try { tuples = parseTuples(valuesSection); }
      catch (e) { console.error('  parse error:', e.message); errors++; continue; }

      for (const [row_id, pay_id, imgData] of tuples) {
        processed++;
        const payment_id = payIdByLegacy.get(pay_id);
        if (!payment_id) { orphaned++; continue; }
        if (!imgData) { errors++; continue; }

        let mime = 'image/jpeg';
        let base64 = imgData;
        const m = /^data:([^;]+);base64,([\s\S]*)$/.exec(imgData);
        if (m) { mime = m[1]; base64 = m[2]; }

        const ext =
          mime === 'image/png'  ? 'png' :
          mime === 'image/gif'  ? 'gif' :
          mime === 'image/webp' ? 'webp' : 'jpg';

        let buf;
        try { buf = Buffer.from(base64, 'base64'); }
        catch { errors++; continue; }
        if (!buf || buf.length === 0) { errors++; continue; }

        const dir = path.join(UPLOAD_ROOT, 'payments', String(payment_id));
        fs.mkdirSync(dir, { recursive: true });
        const filename = `${row_id}.${ext}`;
        fs.writeFileSync(path.join(dir, filename), buf);
        written++;

        batch.push({
          payment_id,
          file_path: `payments/${payment_id}/${filename}`,
          file_size: buf.length,
          mime_type: mime,
        });

        if (batch.length >= FLUSH_AT) await flush();
      }

      if (processed % 50 === 0) {
        process.stdout.write(`  processed=${processed} written=${written} orphaned=${orphaned} errors=${errors}\r`);
      }
    }

    await flush();
    console.log(`\n완료. processed=${processed} written=${written} orphaned=${orphaned} errors=${errors}`);

    const after = await client.query(
      `SELECT count(*)::int n, COALESCE(SUM(file_size),0)::bigint bytes FROM marigold.payment_images`,
    );
    console.log(`payment_images: ${after.rows[0].n} rows, ${Number(after.rows[0].bytes).toLocaleString()} bytes`);
  } catch (e) {
    console.error('FAIL:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
