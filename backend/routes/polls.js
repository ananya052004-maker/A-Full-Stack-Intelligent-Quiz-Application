const express = require('express');
const db = require('../db');
const router = express.Router();

// Create a poll
router.post('/polls', (req, res) => {
  const { question, options } = req.body;

  if (!question || !Array.isArray(options)) {
    return res.status(400).json({ error: 'question and options[] are required' });
  }
  const cleaned = options.map((o) => String(o).trim()).filter(Boolean);
  if (cleaned.length < 2) {
    return res.status(400).json({ error: 'Provide at least 2 non-empty options' });
  }
  if (cleaned.length > 8) {
    return res.status(400).json({ error: 'A poll can have at most 8 options' });
  }

  const sql = 'INSERT INTO polls (question, options) VALUES (?, ?)';
  db.query(sql, [question.trim(), JSON.stringify(cleaned)], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: result.insertId });
  });
});

// Get a poll + its live results
router.get('/polls/:id', (req, res) => {
  const { id } = req.params;

  db.query('SELECT id, question, options FROM polls WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ error: 'Poll not found' });

    const poll = rows[0];
    // mysql2 returns JSON columns already parsed; guard just in case.
    const options = typeof poll.options === 'string' ? JSON.parse(poll.options) : poll.options;

    db.query(
      'SELECT option_index, COUNT(*) AS n FROM poll_votes WHERE poll_id = ? GROUP BY option_index',
      [id],
      (err2, tally) => {
        if (err2) return res.status(500).json({ error: err2.message });

        const counts = new Array(options.length).fill(0);
        tally.forEach((row) => {
          if (row.option_index >= 0 && row.option_index < counts.length) {
            counts[row.option_index] = row.n;
          }
        });
        const total = counts.reduce((a, b) => a + b, 0);

        res.json({ id: poll.id, question: poll.question, options, counts, total });
      }
    );
  });
});

// Cast a vote (one per voter token per poll)
router.post('/polls/:id/vote', (req, res) => {
  const { id } = req.params;
  const { optionIndex, voterToken } = req.body;

  if (optionIndex === undefined || voterToken === undefined) {
    return res.status(400).json({ error: 'optionIndex and voterToken are required' });
  }

  // Validate option index against the poll's options.
  db.query('SELECT options FROM polls WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ error: 'Poll not found' });

    const options = typeof rows[0].options === 'string' ? JSON.parse(rows[0].options) : rows[0].options;
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= options.length) {
      return res.status(400).json({ error: 'Invalid optionIndex' });
    }

    const sql = 'INSERT INTO poll_votes (poll_id, option_index, voter_token) VALUES (?, ?, ?)';
    db.query(sql, [id, optionIndex, voterToken], (err2) => {
      if (err2) {
        if (err2.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ error: 'You have already voted in this poll' });
        }
        return res.status(500).json({ error: err2.message });
      }
      res.status(201).json({ message: 'Vote recorded' });
    });
  });
});

module.exports = router;
