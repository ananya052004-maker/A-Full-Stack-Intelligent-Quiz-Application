// db.js — PostgreSQL, exposed through a small mysql2-compatible shim so the
// existing route code (which uses `?` placeholders and callbacks) keeps working.
require('dotenv').config();
const { Pool, types } = require('pg');

// COUNT(*) and other BIGINTs come back as strings by default in node-pg.
// Parse them as JS numbers to match the old mysql2 behaviour.
types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || process.env.USER,
      password: process.env.DB_PASSWORD || undefined,
      database: process.env.DB_NAME || 'quizdb',
    });

pool
  .query('SELECT 1')
  .then(() => console.log('✅ DB connected successfully'))
  .catch((err) => console.error('❌ DB connection failed:', err.message));

// Map Postgres error codes back to the mysql2 codes the routes check for.
const CODE_MAP = { 23505: 'ER_DUP_ENTRY', 23503: 'ER_NO_REFERENCED_ROW_2' };

// Convert `?` placeholders to `$1, $2, …` and auto-add `RETURNING id` to
// INSERTs so callers can still read `result.insertId`.
function toPg(text) {
  let i = 0;
  let sql = text.replace(/\?/g, () => `$${(i += 1)}`);
  if (/^\s*insert\b/i.test(sql) && !/\breturning\b/i.test(sql)) {
    sql = sql.replace(/\s*;?\s*$/, '') + ' RETURNING id';
  }
  return sql;
}

function decorate(res) {
  // The routes treat the 2nd callback arg as an array of rows (SELECT) OR read
  // `.insertId` (INSERT). Arrays are objects, so we attach both.
  const rows = res.rows;
  rows.insertId = res.rows[0] ? res.rows[0].id : undefined;
  rows.affectedRows = res.rowCount;
  return rows;
}

// mysql2-style: db.query(sql, params, cb) | db.query(sql, cb) | returns Promise if no cb
function query(text, params, cb) {
  if (typeof params === 'function') {
    cb = params;
    params = [];
  }
  const promise = pool.query(toPg(text), params || []).then(decorate);
  if (!cb) return promise;
  promise.then(
    (rows) => cb(null, rows),
    (err) => {
      if (CODE_MAP[err.code]) err.code = CODE_MAP[err.code];
      cb(err);
    }
  );
  return undefined;
}

module.exports = { query, pool };
