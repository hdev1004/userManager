// MySQL/MariaDB mysqldump INSERT 파서.
// `INSERT INTO \`TBL\` VALUES (...), (...), ...;` 을 JS 배열로 변환.
// 문자열 이스케이프 (\\, \', \n, \r, \t, \0) 와 MySQL 식 두 따옴표(''') 처리.

function parseTuples(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    while (i < s.length && /[\s,]/.test(s[i])) i++;
    if (s[i] !== '(') break;
    i++;
    const tup = [];
    while (true) {
      while (i < s.length && /\s/.test(s[i])) i++;
      if (s[i] === ')') { i++; break; }
      if (s[i] === "'") {
        i++;
        let str = '';
        while (i < s.length) {
          if (s[i] === '\\' && i + 1 < s.length) {
            const n = s[i + 1];
            if      (n === "'")  str += "'";
            else if (n === '\\') str += '\\';
            else if (n === 'n')  str += '\n';
            else if (n === 'r')  str += '\r';
            else if (n === 't')  str += '\t';
            else if (n === '0')  str += '\0';
            else str += n;
            i += 2;
          } else if (s[i] === "'" && s[i + 1] === "'") {
            str += "'"; i += 2;
          } else if (s[i] === "'") {
            i++; break;
          } else {
            str += s[i]; i++;
          }
        }
        tup.push(str);
      } else if (s.substr(i, 4).toUpperCase() === 'NULL') {
        tup.push(null); i += 4;
      } else {
        let n = '';
        while (i < s.length && /[0-9.\-+eE]/.test(s[i])) { n += s[i]; i++; }
        tup.push(n === '' ? null : Number(n));
      }
      while (i < s.length && /\s/.test(s[i])) i++;
      if (s[i] === ',') i++;
    }
    out.push(tup);
  }
  return out;
}

/** 백업 파일 전체를 읽고 특정 테이블의 모든 INSERT 라인을 파싱해서 합쳐 반환 */
function extractInsert(raw, tableName) {
  const lines = raw.split('\n');
  const all = [];
  const prefix = 'INSERT INTO `' + tableName + '`';
  for (const line of lines) {
    if (line.startsWith(prefix)) {
      const m = line.match(/VALUES\s+(.+);\s*$/);
      if (m) all.push(...parseTuples(m[1]));
    }
  }
  return all;
}

/** 'YYMMDD' → 'YYYY-MM-DD 00:00:00' (YY < 70 = 20YY, ≥ 70 = 19YY) */
function yymmddToTs(s) {
  if (!s || s.length !== 6) return null;
  const yy = parseInt(s.slice(0, 2), 10);
  const yyyy = yy >= 70 ? 1900 + yy : 2000 + yy;
  return `${yyyy}-${s.slice(2, 4)}-${s.slice(4, 6)} 00:00:00`;
}

/** 'YYYYMMDD' → 'YYYY-MM-DD 00:00:00' */
function yyyymmddToTs(s) {
  if (!s || s.length !== 8) return null;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)} 00:00:00`;
}

/** PG 환경변수에서 Client 옵션 만들기 */
function pgConfig() {
  return {
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT),
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: process.env.PGSSL === '1' ? { rejectUnauthorized: false } : false,
    statement_timeout: 0,
  };
}

function requireEnv() {
  const need = ['PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD'];
  const missing = need.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error('환경변수 누락:', missing.join(', '));
    console.error('루트 .env 의 DB_* 값을 PG* 로 export 하세요. (예시는 README 참조)');
    process.exit(1);
  }
}

module.exports = { parseTuples, extractInsert, yymmddToTs, yyyymmddToTs, pgConfig, requireEnv };
