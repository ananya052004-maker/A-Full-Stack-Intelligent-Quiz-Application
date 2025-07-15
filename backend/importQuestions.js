// importQuestions.js
const fs = require('fs');
const db = require('./db'); // your db.js file that connects to MySQL

const questions = JSON.parse(fs.readFileSync('questions.json', 'utf-8'));

questions.forEach((q) => {
  const { question, options, answer, category } = q;

  // 👇 note the column name change: correctAnswer
  const query =
    'INSERT INTO questions (question, options, correctAnswer, category) VALUES (?, ?, ?, ?)';

  db.query(
    query,
    [question, JSON.stringify(options), answer, category],
    (err) => {
      if (err) {
        console.error('Error inserting question:', err.sqlMessage);
      } else {
        console.log('✅ Inserted:', question);
      }
    }
  );
});
