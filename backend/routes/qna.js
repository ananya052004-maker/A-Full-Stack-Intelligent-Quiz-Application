const express = require('express');
const db = require('../db');
const router = express.Router();

// Create a Q&A board
router.post('/qna', (req, res) => {
  const { title, ownerToken } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'A title is required' });
  if (!ownerToken) return res.status(400).json({ error: 'ownerToken is required' });

  const sql = 'INSERT INTO qna_boards (title, owner_token) VALUES (?, ?)';
  db.query(sql, [title.trim(), ownerToken], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: result.insertId });
  });
});

// Get a board with its questions (sorted by votes), live
router.get('/qna/:id', (req, res) => {
  const { id } = req.params;
  const voterToken = req.query.voterToken || '';

  db.query('SELECT id, title, owner_token FROM qna_boards WHERE id = ?', [id], (err, boards) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!boards.length) return res.status(404).json({ error: 'Board not found' });

    const board = boards[0];
    const sql = `
      SELECT q.id, q.text, q.answered, q.created_at,
             COUNT(v.id) AS votes,
             MAX(CASE WHEN v.voter_token = ? THEN 1 ELSE 0 END) AS upvoted_by_me
      FROM qna_questions q
      LEFT JOIN qna_upvotes v ON v.question_id = q.id
      WHERE q.board_id = ?
      GROUP BY q.id
      ORDER BY votes DESC, q.created_at ASC
    `;
    db.query(sql, [voterToken, id], (err2, rows) => {
      if (err2) return res.status(500).json({ error: err2.message });

      const questions = rows.map((r) => ({
        id: r.id,
        text: r.text,
        answered: !!r.answered,
        votes: Number(r.votes),
        upvotedByMe: !!r.upvoted_by_me,
      }));
      res.json({
        id: board.id,
        title: board.title,
        isOwner: !!(voterToken && voterToken === board.owner_token),
        questions,
      });
    });
  });
});

// Submit a question
router.post('/qna/:id/questions', (req, res) => {
  const { id } = req.params;
  const { text, authorToken } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Question text is required' });
  if (!authorToken) return res.status(400).json({ error: 'authorToken is required' });

  db.query('SELECT id FROM qna_boards WHERE id = ?', [id], (err, boards) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!boards.length) return res.status(404).json({ error: 'Board not found' });

    const sql = 'INSERT INTO qna_questions (board_id, text, author_token) VALUES (?, ?, ?)';
    db.query(sql, [id, text.trim().slice(0, 500), authorToken], (err2, result) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.status(201).json({ id: result.insertId });
    });
  });
});

// Toggle an upvote on a question (one per voter)
router.post('/qna/questions/:qid/upvote', (req, res) => {
  const { qid } = req.params;
  const { voterToken } = req.body;
  if (!voterToken) return res.status(400).json({ error: 'voterToken is required' });

  db.query(
    'SELECT id FROM qna_upvotes WHERE question_id = ? AND voter_token = ?',
    [qid, voterToken],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      if (rows.length) {
        // Already upvoted → remove it (toggle off)
        db.query('DELETE FROM qna_upvotes WHERE id = ?', [rows[0].id], (err2) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json({ upvoted: false });
        });
      } else {
        db.query(
          'INSERT INTO qna_upvotes (question_id, voter_token) VALUES (?, ?)',
          [qid, voterToken],
          (err2) => {
            if (err2) {
              if (err2.code === 'ER_NO_REFERENCED_ROW_2') {
                return res.status(404).json({ error: 'Question not found' });
              }
              return res.status(500).json({ error: err2.message });
            }
            res.json({ upvoted: true });
          }
        );
      }
    }
  );
});

// Mark a question answered / unanswered (board owner only)
router.post('/qna/questions/:qid/answer', (req, res) => {
  const { qid } = req.params;
  const { ownerToken, answered } = req.body;
  if (!ownerToken) return res.status(400).json({ error: 'ownerToken is required' });

  const sql = `
    SELECT b.owner_token
    FROM qna_questions q JOIN qna_boards b ON b.id = q.board_id
    WHERE q.id = ?
  `;
  db.query(sql, [qid], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(404).json({ error: 'Question not found' });
    if (rows[0].owner_token !== ownerToken) {
      return res.status(403).json({ error: 'Only the board owner can mark answers' });
    }

    db.query(
      'UPDATE qna_questions SET answered = ? WHERE id = ?',
      [answered ? 1 : 0, qid],
      (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ answered: !!answered });
      }
    );
  });
});

module.exports = router;
