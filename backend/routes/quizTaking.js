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

// Public: leaderboard for a quiz — best score per name, ranked.
router.get('/quizzes/:id/leaderboard', (req, res) => {
  const sql = `
    SELECT name, MAX(score) AS score, MAX(total) AS total, MIN(created_at) AS achieved_at
    FROM quiz_attempts
    WHERE quiz_id = ?
    GROUP BY name
    ORDER BY score DESC, achieved_at ASC
    LIMIT 20
  `;
  db.query(sql, [req.params.id], (err, rows) => {
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

    // Record the attempt for the leaderboard, then compute this taker's rank.
    db.query(
      'INSERT INTO quiz_attempts (quiz_id, name, score, total) VALUES (?, ?, ?, ?)',
      [id, takerName, score, total],
      (insErr) => {
        if (insErr) return res.status(500).json({ error: insErr.message });

        // Rank = 1 + number of DISTINCT names with a strictly higher best score.
        const rankSql = `
          SELECT COUNT(*) AS ahead FROM (
            SELECT name, MAX(score) AS best FROM quiz_attempts WHERE quiz_id = ? GROUP BY name
          ) t WHERE t.best > ?
        `;
        db.query(rankSql, [id, score], (rankErr, rankRows) => {
          if (rankErr) return res.status(500).json({ error: rankErr.message });
          const rank = (rankRows[0].ahead || 0) + 1;
          db.query(
            'SELECT COUNT(DISTINCT name) AS players FROM quiz_attempts WHERE quiz_id = ?',
            [id],
            (cErr, cRows) => {
              if (cErr) return res.status(500).json({ error: cErr.message });
              res.json({
                total,
                score,
                results,
                name: takerName,
                rank,
                players: cRows[0].players,
              });
            }
          );
        });
      }
    );
  });
});

module.exports = router;
