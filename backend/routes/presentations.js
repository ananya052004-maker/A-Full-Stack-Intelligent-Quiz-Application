const express = require('express');
const db = require('../db');
const router = express.Router();

// Create a presentation
router.post('/presentations', (req, res) => {
  const { title, ownerToken } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'A title is required' });
  if (!ownerToken) return res.status(400).json({ error: 'ownerToken is required' });

  db.query(
    'INSERT INTO presentations (title, owner_token) VALUES (?, ?)',
    [title.trim(), ownerToken],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: result.insertId });
    }
  );
});

// Add a slide to a presentation (appended at the end)
router.post('/presentations/:id/slides', (req, res) => {
  const { id } = req.params;
  const { type, refId, config, ownerToken } = req.body;

  if (!['info', 'poll', 'word_cloud', 'survey'].includes(type)) {
    return res.status(400).json({ error: 'Invalid slide type' });
  }

  db.query('SELECT owner_token FROM presentations WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ error: 'Presentation not found' });
    if (rows[0].owner_token !== ownerToken) {
      return res.status(403).json({ error: 'Only the owner can edit this presentation' });
    }

    db.query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM presentation_slides WHERE presentation_id = ?',
      [id],
      (err2, posRows) => {
        if (err2) return res.status(500).json({ error: err2.message });
        const position = posRows[0].pos;

        db.query(
          'INSERT INTO presentation_slides (presentation_id, position, type, ref_id, config) VALUES (?, ?, ?, ?, ?)',
          [id, position, type, refId || null, config ? JSON.stringify(config) : null],
          (err3, result) => {
            if (err3) return res.status(500).json({ error: err3.message });
            res.status(201).json({ id: result.insertId, position });
          }
        );
      }
    );
  });
});

// Get a presentation + its slides (ordered)
router.get('/presentations/:id', (req, res) => {
  const { id } = req.params;
  const ownerToken = req.query.ownerToken || '';

  db.query('SELECT id, title, owner_token, current_index FROM presentations WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ error: 'Presentation not found' });
    const p = rows[0];

    db.query(
      'SELECT id, position, type, ref_id, config FROM presentation_slides WHERE presentation_id = ? ORDER BY position ASC',
      [id],
      (err2, slides) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({
          id: p.id,
          title: p.title,
          currentIndex: p.current_index,
          isOwner: !!(ownerToken && ownerToken === p.owner_token),
          slides: slides.map((s) => ({
            id: s.id,
            type: s.type,
            refId: s.ref_id,
            config: typeof s.config === 'string' ? JSON.parse(s.config) : s.config,
          })),
        });
      }
    );
  });
});

// Navigate: set the current slide (owner only)
router.post('/presentations/:id/nav', (req, res) => {
  const { id } = req.params;
  const { ownerToken, index } = req.body;

  db.query('SELECT owner_token FROM presentations WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ error: 'Presentation not found' });
    if (rows[0].owner_token !== ownerToken) {
      return res.status(403).json({ error: 'Only the owner can control the presentation' });
    }

    db.query(
      'UPDATE presentations SET current_index = ? WHERE id = ?',
      [Math.max(0, Number(index) || 0), id],
      (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ currentIndex: Math.max(0, Number(index) || 0) });
      }
    );
  });
});

module.exports = router;
