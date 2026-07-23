const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
require('./config/passport'); 
require('dotenv').config();

const authRoutes = require('./routes/auth');
const questionRoutes = require('./routes/questions');
const pollRoutes = require('./routes/polls');
const qnaRoutes = require('./routes/qna');
const surveyRoutes = require('./routes/surveys');
const wordcloudRoutes = require('./routes/wordclouds');
const presentationRoutes = require('./routes/presentations');
const teacherRoutes = require('./routes/teacher');
const quizTakingRoutes = require('./routes/quizTaking');
const initDb = require('./initDb');

const app = express();

const isProd = process.env.NODE_ENV === 'production';
// Allow the deployed frontend origin (set FRONTEND_URL in production).
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Behind a hosting proxy (Render, Railway…), needed for secure cookies.
app.set('trust proxy', 1);
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());
app.get('/', (req, res) => {
  res.send('Quiz App Backend is running 🚀');
});


app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    // Cross-site cookies (frontend and backend on different domains) require
    // SameSite=None + Secure in production; Lax works for local dev.
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
  },
}));
app.use(passport.initialize());
app.use(passport.session());



// Check if user is logged in
app.get('/api/auth/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user); // or { user: req.user }
  } else {
    res.status(401).json(null);
  }
});

console.log("Mounting auth routes...");
app.use('/api/auth', authRoutes);
app.use('/api', questionRoutes);
app.use('/api', pollRoutes);
app.use('/api', qnaRoutes);
app.use('/api', surveyRoutes);
app.use('/api', wordcloudRoutes);
app.use('/api', presentationRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api', quizTakingRoutes);

const PORT = process.env.PORT || 5000;
// Initialize the DB on first boot (no-op if already set up), then start.
initDb().finally(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server started on http://localhost:${PORT}`);
  });
});
