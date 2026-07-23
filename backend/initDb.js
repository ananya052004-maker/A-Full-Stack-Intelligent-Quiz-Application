// Auto-initialize the database on first boot: if the schema isn't there yet,
// create all tables, load the question bank, and add one starter quiz — so a
// freshly deployed instance works immediately with zero manual SQL.
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function initDb() {
  try {
    const check = await pool.query("SELECT to_regclass('public.questions') AS t");
    if (check.rows[0].t) return; // already initialized — nothing to do

    console.log('🔧 First boot: initializing database…');

    // 1. Schema
    const schema = fs.readFileSync(path.join(__dirname, 'schema.pg.sql'), 'utf8');
    await pool.query(schema);

    // 2. Question bank
    const seedPath = path.join(__dirname, 'seed_questions.pg.sql');
    if (fs.existsSync(seedPath)) {
      await pool.query(fs.readFileSync(seedPath, 'utf8'));
      // The seed inserts explicit ids, so advance the SERIAL sequence past them.
      await pool.query(
        "SELECT setval(pg_get_serial_sequence('questions','id'), (SELECT MAX(id) FROM questions))"
      );
    }

    // 3. A starter quiz so a shared link shows something right away
    const quizCount = await pool.query('SELECT COUNT(*)::int AS n FROM quizzes');
    if (quizCount.rows[0].n === 0) {
      await pool.query(
        "INSERT INTO users (name, email, role) VALUES ('Demo Teacher','demo.teacher@quorum.app','teacher') ON CONFLICT (email) DO NOTHING"
      );
      await pool.query(`
        WITH q AS (
          INSERT INTO quizzes (title, category, created_by)
          SELECT 'General Knowledge Starter', 'Science', id
          FROM users WHERE email = 'demo.teacher@quorum.app' LIMIT 1
          RETURNING id
        )
        INSERT INTO quiz_questions (quiz_id, question_id, position)
        SELECT (SELECT id FROM q), t.id, (row_number() OVER ()) - 1
        FROM (
          SELECT id FROM questions
          WHERE category IN ('Science','History','Geography')
          ORDER BY id LIMIT 6
        ) t
      `);
    }

    console.log('✅ Database initialized (schema + questions + starter quiz)');
  } catch (e) {
    console.error('⚠️  DB init skipped/failed:', e.message);
  }
}

module.exports = initDb;
