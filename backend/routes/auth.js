// backend/routes/auth.js
const express = require('express');
const passport = require('passport');
const db = require('../db');

const router = express.Router();

// Where to send the user after login/logout (the deployed frontend in prod).
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Set the logged-in user's role (teacher/student), chosen after first login.
router.post('/role', (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not logged in' });
  const { role } = req.body;
  if (!['teacher', 'student'].includes(role)) {
    return res.status(400).json({ error: "role must be 'teacher' or 'student'" });
  }
  db.query('UPDATE users SET role = ? WHERE id = ?', [role, req.user.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    req.user.role = role; // keep the session copy in sync
    res.json({ id: req.user.id, name: req.user.name, email: req.user.email, role });
  });
});

router.get('/test', (req, res) => {
  res.send('Auth route working');
});

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', {
    successRedirect: FRONTEND_URL,
    failureRedirect: `${FRONTEND_URL}/login`
  })
);

router.get('/logout', (req, res, next) => {
  req.logout(function (err) {
    if (err) return next(err);
    res.redirect(FRONTEND_URL);
  });
});

router.get('/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user); // or { user: req.user } depending on frontend
  } else {
    res.status(401).json(null);
  }
});
module.exports = router;
