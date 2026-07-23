const express = require('express');
const db = require('../db');
const router = express.Router();

// Public: list all available quizzes (for the "Quizzes" hub).
router.get('/quizzes', (req, res) => {
  const sql = `
    SELECT q.id, q.title, q.category, q.created_at,
           u.name AS creator,
           COUNT(qq.id) AS question_count
    FROM quizzes q
    LEFT JOIN users u ON u.id = q.created_by
    LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
    GROUP BY q.id, u.name
    ORDER BY q.created_at DESC
  `;
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Each student's BEST attempt, ranked: highest score first, and on a tie,
// the faster time wins. DISTINCT ON picks each name's best (score, time) row.
const LEADERBOARD_SQL = `
  SELECT name, score, total, time_taken FROM (
    SELECT DISTINCT ON (name) name, score, total, time_taken
    FROM quiz_attempts
    WHERE quiz_id = ?
    ORDER BY name, score DESC, time_taken ASC
  ) best
  ORDER BY best.score DESC, best.time_taken ASC
`;

// Public: leaderboard for a quiz (score, then time as tie-breaker).
router.get('/quizzes/:id/leaderboard', (req, res) => {
  db.query(`${LEADERBOARD_SQL} LIMIT 20`, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Public: fetch a quiz to TAKE it — questions are returned WITHOUT the
// correct answer, so students/guests can never see answers up front.
router.get('/quizzes/:id', (req, res) => {
  const { id } = req.params;
  db.query('SELECT id, title, category FROM quizzes WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ error: 'Quiz not found' });
    const quiz = rows[0];

    const sql = `
      SELECT q.id, q.question, q.options
      FROM quiz_questions qq
      JOIN questions q ON q.id = qq.question_id
      WHERE qq.quiz_id = ?
      ORDER BY qq.position ASC
    `;
    db.query(sql, [id], (err2, questions) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({
        id: quiz.id,
        title: quiz.title,
        category: quiz.category,
        questions: questions.map((q) => ({
          id: q.id,
          question: q.question,
          options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
        })),
      });
    });
  });
});

// Public: submit answers — scored on the SERVER. Correct answers are only
// revealed in the results (after submitting), never before.
router.post('/quizzes/:id/submit', (req, res) => {
  const { id } = req.params;
  const { answers, name } = req.body; // { [questionId]: selectedOptionText }, plus taker name
  if (!answers || typeof answers !== 'object') {
    return res.status(400).json({ error: 'answers object is required' });
  }
  const takerName = (name || 'Anonymous').toString().trim().slice(0, 80) || 'Anonymous';

  const sql = `
    SELECT q.id, q.question, q.correctanswer AS "correctAnswer"
    FROM quiz_questions qq
    JOIN questions q ON q.id = qq.question_id
    WHERE qq.quiz_id = ?
    ORDER BY qq.position ASC
  `;
  db.query(sql, [id], (err, questions) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!questions.length) return res.status(404).json({ error: 'Quiz not found or empty' });

    let score = 0;
    const results = questions.map((q) => {
      const chosen = answers[q.id];
      const correct = chosen === q.correctAnswer;
      if (correct) score += 1;
      return {
        questionId: q.id,
        question: q.question,
        yourAnswer: chosen ?? null,
        correctAnswer: q.correctAnswer,
        correct,
      };
    });
    const total = questions.length;
    // Time taken in seconds (client-measured); clamp to a sane range.
    const timeTaken = Math.max(0, Math.min(parseInt(req.body.timeTaken, 10) || 0, 86400));

    // Record the attempt, then compute rank from the SAME ordering the
    // leaderboard uses (score DESC, then time ASC) so they always agree.
    db.query(
      'INSERT INTO quiz_attempts (quiz_id, name, score, total, time_taken) VALUES (?, ?, ?, ?, ?)',
      [id, takerName, score, total, timeTaken],
      (insErr) => {
        if (insErr) return res.status(500).json({ error: insErr.message });

        db.query(LEADERBOARD_SQL, [id], (lbErr, board) => {
          if (lbErr) return res.status(500).json({ error: lbErr.message });
          const pos = board.findIndex((r) => r.name === takerName);
          res.json({
            total,
            score,
            timeTaken,
            results,
            name: takerName,
            rank: pos >= 0 ? pos + 1 : board.length,
            players: board.length,
          });
        });
      }
    );
  });
});

module.exports = router;
