const express = require('express');
const db = require('../db');
const router = express.Router();

// Get questions by category
router.get('/questions', (req, res) => {
  const { category } = req.query;
  const sql = category
    ? 'SELECT * FROM questions WHERE category = ? LIMIT 10'
    : 'SELECT * FROM questions LIMIT 10';

  const params = category ? [category] : [];

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    try {
      const formatted = results.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        category: q.category
      }));
      res.json(formatted);
    } catch (parseError) {
      return res.status(500).json({ error: 'Failed to parse question options' });
    }
  });
});

// Submit user score
router.post('/submit-score', (req, res) => {
  const { userId, score, category, timeTaken } = req.body;

  if (!userId || !score || !category || !timeTaken) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const sql = 'INSERT INTO scores (user_id, category, score, time_taken) VALUES (?, ?, ?, ?)';
  db.query(sql, [userId, category, score, timeTaken], err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Score recorded successfully' });
  });
});

// Get leaderboard
router.get('/leaderboard', (req, res) => {
  const sql = `
    SELECT u.name, s.category, MAX(s.score) AS top_score
    FROM scores s
    JOIN users u ON s.user_id = u.id
    GROUP BY s.user_id, s.category
    ORDER BY top_score DESC
    LIMIT 10
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

module.exports = router;
