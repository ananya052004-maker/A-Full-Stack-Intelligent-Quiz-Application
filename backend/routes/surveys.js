const express = require('express');
const db = require('../db');
const router = express.Router();

router.post('/surveys', (req, res) => {
  const { question, mode } = req.body;
  const scale = Number(req.body.scale) || 5;

  if (!question || !question.trim()) return res.status(400).json({ error: 'A question is required' });
  if (!['rating', 'text'].includes(mode)) {
    return res.status(400).json({ error: "mode must be 'rating' or 'text'" });
  }
  
  const sql = 'INSERT INTO surveys (question, mode, scale) VALUES (?, ?, ?)';
  db.query(sql, [question.trim(), mode, scale], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: result.insertId });
  });
  
});
router.get('/surveys/:id', (req, res) => {
  const { id } = req.params;
  const responderToken = req.query.responderToken || '';

  db.query('SELECT id, question, mode, scale FROM surveys WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ error: 'Survey not found' });
    const survey = rows[0];

    db.query(
      'SELECT rating, text_answer, responder_token, created_at FROM survey_responses WHERE survey_id = ? ORDER BY created_at DESC',
      [id],
      (err2, responses) => {
        if (err2) return res.status(500).json({ error: err2.message });

        const hasResponded = responses.some((r) => r.responder_token === responderToken);
        const count = responses.length;

        let aggregate;
        if (survey.mode === 'rating') {
          const histogram = new Array(survey.scale).fill(0); // index 0 => rating 1
          let sum = 0;
          responses.forEach((r) => {
            if (r.rating >= 1 && r.rating <= survey.scale) {
              histogram[r.rating - 1] += 1;
              sum += r.rating;
            }
          });
          aggregate = {
            mode: 'rating',
            scale: survey.scale,
            count,
            average: count ? Number((sum / count).toFixed(2)) : 0,
            histogram,
          };
        } else {
          aggregate = {
            mode: 'text',
            count,
            responses: responses
              .filter((r) => r.text_answer)
              .map((r) => ({ text: r.text_answer, ts: r.created_at })),
          };
        }

        res.json({
          id: survey.id,
          question: survey.question,
          mode: survey.mode,
          scale: survey.scale,
          hasResponded,
          aggregate,
        });
      }
    );
  });
});

// Submit an anonymous response (one per person)
router.post('/surveys/:id/respond', (req, res) => {
  const { id } = req.params;
  const { rating, text, responderToken } = req.body;
  if (!responderToken) return res.status(400).json({ error: 'responderToken is required' });

  db.query('SELECT mode, scale FROM surveys WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ error: 'Survey not found' });
    const { mode, scale } = rows[0];

    let ratingVal = null;
    let textVal = null;
    if (mode === 'rating') {
      ratingVal = Number(rating);
      if (!Number.isInteger(ratingVal) || ratingVal < 1 || ratingVal > scale) {
        return res.status(400).json({ error: `rating must be between 1 and ${scale}` });
      }
    } else {
      textVal = (text || '').trim().slice(0, 1000);
      if (!textVal) return res.status(400).json({ error: 'text response cannot be empty' });
    }

    const sql =
      'INSERT INTO survey_responses (survey_id, rating, text_answer, responder_token) VALUES (?, ?, ?, ?)';
    db.query(sql, [id, ratingVal, textVal, responderToken], (err2) => {
      if (err2) {
        if (err2.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ error: 'You have already responded to this survey' });
        }
        return res.status(500).json({ error: err2.message });
      }
      res.status(201).json({ message: 'Response recorded' });
    });
  });
});

module.exports = router;
