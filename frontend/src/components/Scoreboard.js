import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Scoreboard.css';

function Scoreboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};
  const {
    questions = [],
    selectedAnswers = {},
    timePerQuestion = [],
  } = state;

  if (!questions.length) {
    return (
      <div className="scoreboard">
        <h2>No quiz data found.</h2>
        <p>Please complete a quiz before viewing the scoreboard.</p>
        <button onClick={() => navigate('/')}>Back to Home</button>
      </div>
    );
  }

  const totalQuestions = questions.length;

  // ✅ Calculate score from selectedAnswers, treating unattempted as incorrect
  const correctCount = questions.reduce((count, q) => {
    const userAnswer = selectedAnswers[q.id];
    return userAnswer === q.correctAnswer ? count + 1 : count;
  }, 0);

  const percentage = ((correctCount / totalQuestions) * 100).toFixed(2);
  const averageTime = (
    timePerQuestion.reduce((a, b) => a + b, 0) / totalQuestions
  ).toFixed(2);

  return (
    <div className="scoreboard">
      <h2>Quiz Completed!</h2>
      <p>✅ Score: {correctCount} / {totalQuestions}</p>
      <p>📈 Correct Answer %: {percentage}%</p>
      <p>⏱️ Average Time per Question: {averageTime} seconds</p>

      <h3>📋 Detailed Breakdown</h3>
      <ul>
        {questions.map((q, index) => {
          const userAnswer = selectedAnswers[q.id];
          const isCorrect = userAnswer === q.correctAnswer;

          return (
            <li key={q.id} style={{ marginBottom: '1em' }}>
              <strong>Q{index + 1}: {q.question}</strong>
              <br />
              <span>Your Answer: {userAnswer || 'Not Answered'}</span>
              <br />
              <span>Correct Answer: {q.correctAnswer}</span>
              <br />
              <span>{isCorrect ? '✅ Correct' : '❌ Incorrect'}</span>
              <br />
              <span>Time Taken: {timePerQuestion[index] || 0} seconds</span>
            </li>
          );
        })}
      </ul>

      <button onClick={() => navigate('/')}>🏠 Back to Home</button>
    </div>
  );
}

export default Scoreboard;
