const express = require('express');
const db = require('../db');
const router = express.Router();

// Create a word cloud
router.post('/wordclouds', (req, res) => {
  const { prompt } = req.body;
  const maxWords = Math.min(Math.max(Number(req.body.maxWords) || 3, 1), 10);
  if (!prompt || !prompt.trim()) return res.status(400).json({ error: 'A prompt is required' });

  db.query(
    'INSERT INTO wordclouds (prompt, max_words) VALUES (?, ?)',
    [prompt.trim(), maxWords],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: result.insertId });
    }
  );
});

// Get a word cloud with aggregated word frequencies
router.get('/wordclouds/:id', (req, res) => {
  const { id } = req.params;
  const submitterToken = req.query.submitterToken || '';

  db.query('SELECT id, prompt, max_words FROM wordclouds WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ error: 'Word cloud not found' });
    const wc = rows[0];

    db.query(
      'SELECT word, submitter_token FROM wordcloud_entries WHERE wordcloud_id = ?',
      [id],
      (err2, entries) => {
        if (err2) return res.status(500).json({ error: err2.message });

        const freq = new Map();
        let mine = 0;
        entries.forEach((e) => {
          const key = e.word.toLowerCase();
          freq.set(key, (freq.get(key) || 0) + 1);
          if (e.submitter_token === submitterToken) mine += 1;
        });

        const words = Array.from(freq.entries())
          .map(([text, value]) => ({ text, value }))
          .sort((a, b) => b.value - a.value);

        res.json({
          id: wc.id,
          prompt: wc.prompt,
          maxWords: wc.max_words,
          words,
          total: entries.length,
          mySubmissions: mine,
        });
      }
    );
  });
});

// Submit one or more words (respecting the per-person limit)
router.post('/wordclouds/:id/words', (req, res) => {
  const { id } = req.params;
  const { words, submitterToken } = req.body;
  if (!submitterToken) return res.status(400).json({ error: 'submitterToken is required' });
  if (!Array.isArray(words)) return res.status(400).json({ error: 'words[] is required' });

  const cleaned = words
    .map((w) => String(w).trim().slice(0, 64))
    .filter(Boolean);
  if (!cleaned.length) return res.status(400).json({ error: 'Enter at least one word' });

  db.query('SELECT max_words FROM wordclouds WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ error: 'Word cloud not found' });
    const maxWords = rows[0].max_words;

    db.query(
      'SELECT COUNT(*) AS n FROM wordcloud_entries WHERE wordcloud_id = ? AND submitter_token = ?',
      [id, submitterToken],
      (err2, cnt) => {
        if (err2) return res.status(500).json({ error: err2.message });
        const already = cnt[0].n;
        const remaining = maxWords - already;
        if (remaining <= 0) {
          return res.status(409).json({ error: `You have reached the limit of ${maxWords} words` });
        }

        const toInsert = cleaned.slice(0, remaining);
        const params = [];
        const tuples = toInsert.map((w) => {
          const b = params.length;
          params.push(id, w, submitterToken);
          return `($${b + 1}, $${b + 2}, $${b + 3})`;
        });
        const insertSql = `INSERT INTO wordcloud_entries (wordcloud_id, word, submitter_token) VALUES ${tuples.join(', ')}`;
        db.query(insertSql, params, (err3) => {
          if (err3) return res.status(500).json({ error: err3.message });
          res.status(201).json({ added: toInsert.length });
        });
      }
    );
  });
});

module.exports = router;
