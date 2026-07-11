const express = require('express');
const db = require('../db');
const router = express.Router();

// Gate: only authenticated users whose role is 'teacher' may pass.
function requireTeacher(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated() && req.user && req.user.role === 'teacher') {
    return next();
  }
  return res.status(403).json({ error: 'Teacher access required' });
}

router.use(requireTeacher);

// ---- Question bank ----

// Distinct topics/categories
router.get('/categories', (req, res) => {
  db.query('SELECT DISTINCT category FROM questions ORDER BY category', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map((r) => r.category));
  });
});

// All questions for a topic (full detail, including correct answer)
router.get('/questions', (req, res) => {
  const { category } = req.query;
  const sql = category
    ? 'SELECT id, question, options, correctanswer AS "correctAnswer", category FROM questions WHERE category = ? ORDER BY id'
    : 'SELECT id, question, options, correctanswer AS "correctAnswer", category FROM questions ORDER BY id';
  db.query(sql, category ? [category] : [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Create a question
router.post('/questions', (req, res) => {
  const { question, options, correctAnswer, category } = req.body;
  if (!question || !Array.isArray(options) || options.length < 2 || !correctAnswer || !category) {
    return res.status(400).json({ error: 'question, options[2+], correctAnswer and category are required' });
  }
  if (!options.includes(correctAnswer)) {
    return res.status(400).json({ error: 'correctAnswer must be one of the options' });
  }
  db.query(
    'INSERT INTO questions (question, options, correctAnswer, category) VALUES (?, ?, ?, ?)',
    [question.trim(), JSON.stringify(options), correctAnswer, category.trim()],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: result.insertId });
    }
  );
});

// Edit a question
router.put('/questions/:id', (req, res) => {
  const { id } = req.params;
  const { question, options, correctAnswer, category } = req.body;
  if (!question || !Array.isArray(options) || options.length < 2 || !correctAnswer || !category) {
    return res.status(400).json({ error: 'question, options[2+], correctAnswer and category are required' });
  }
  if (!options.includes(correctAnswer)) {
    return res.status(400).json({ error: 'correctAnswer must be one of the options' });
  }
  db.query(
    'UPDATE questions SET question = ?, options = ?, correctAnswer = ?, category = ? WHERE id = ?',
    [question.trim(), JSON.stringify(options), correctAnswer, category.trim(), id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Question updated' });
    }
  );
});

// Delete a question
router.delete('/questions/:id', (req, res) => {
  db.query('DELETE FROM questions WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Question deleted' });
  });
});

// ---- Quizzes (built from selected questions) ----

// Create a quiz from chosen question ids
router.post('/quizzes', (req, res) => {
  const { title, category, questionIds } = req.body;
  if (!title || !category || !Array.isArray(questionIds) || questionIds.length === 0) {
    return res.status(400).json({ error: 'title, category and at least one questionId are required' });
  }

  db.query(
    'INSERT INTO quizzes (title, category, created_by) VALUES (?, ?, ?)',
    [title.trim(), category, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      const quizId = result.insertId;
      // Build a multi-row INSERT with $-placeholders (Postgres).
      const params = [];
      const tuples = questionIds.map((qid, i) => {
        const b = params.length;
        params.push(quizId, qid, i);
        return `($${b + 1}, $${b + 2}, $${b + 3})`;
      });
      const insertSql = `INSERT INTO quiz_questions (quiz_id, question_id, position) VALUES ${tuples.join(', ')}`;
      db.query(insertSql, params, (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.status(201).json({ id: quizId });
      });
    }
  );
});

// List this teacher's quizzes
router.get('/quizzes', (req, res) => {
  const sql = `
    SELECT q.id, q.title, q.category, q.created_at, COUNT(qq.id) AS question_count
    FROM quizzes q
    LEFT JOIN quiz_questions qq ON qq.quiz_id = q.id
    WHERE q.created_by = ?
    GROUP BY q.id
    ORDER BY q.created_at DESC
  `;
  db.query(sql, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Delete a quiz
router.delete('/quizzes/:id', (req, res) => {
  db.query('DELETE FROM quizzes WHERE id = ? AND created_by = ?', [req.params.id, req.user.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Quiz deleted' });
  });
});

module.exports = router;
