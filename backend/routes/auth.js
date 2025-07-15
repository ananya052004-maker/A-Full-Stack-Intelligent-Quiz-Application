// backend/routes/auth.js
const express = require('express');
const passport = require('passport');

const router = express.Router();

router.get('/test', (req, res) => {
  res.send('Auth route working');
});

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', {
    successRedirect: 'http://localhost:3000',
    failureRedirect: 'http://localhost:3000/login'
  })
);

router.get('/logout', (req, res, next) => {
  req.logout(function (err) {
    if (err) return next(err);
    res.redirect('http://localhost:3000');
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
