const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('../db'); // Adjust path if needed
require('dotenv').config();

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://localhost:5000/api/auth/google/callback',
},
(accessToken, refreshToken, profile, done) => {
  const name = profile.displayName;
  const email = profile.emails?.[0]?.value;

  if (!email) {
    return done(new Error('No email found in Google profile'));
  }

  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err) return done(err);

    if (results.length > 0) {
      return done(null, results[0]); // Existing user
    }

    // Insert new user into MySQL
    db.query(
      'INSERT INTO users (name, email) VALUES (?, ?)',
      [name, email],
      (err, result) => {
        if (err) return done(err);
        const newUser = {
          id: result.insertId,
          name,
          email
        };
        return done(null, newUser);
      }
    );
  });
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  db.query('SELECT * FROM users WHERE id = ?', [id], (err, results) => {
    if (err) return done(err);
    if (!results || results.length === 0) return done(null, false);
    done(null, results[0]);
  });
});
