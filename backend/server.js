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

const app = express();
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.get('/', (req, res) => {
  res.send('Quiz App Backend is running 🚀');
});


app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: false
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
app.listen(PORT, () => {
  console.log(`✅ Server started on http://localhost:${PORT}`);
});
