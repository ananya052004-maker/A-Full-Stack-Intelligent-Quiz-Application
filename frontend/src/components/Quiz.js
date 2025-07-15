import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Quiz.css';

function Quiz() {
  const { category } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startTime, setStartTime] = useState(Date.now());

  useEffect(() => {
    axios
      .get(`http://localhost:5000/api/questions?category=${category}`)
      .then(response => {
        setQuestions(response.data);
        setLoading(false);
        setStartTime(Date.now());
      })
      .catch(() => {
        setError('Failed to load questions. Please try again later.');
        setLoading(false);
      });
  }, [category]);

  const handleOptionSelect = (qId, option) => {
    setSelectedAnswers(prev => ({ ...prev, [qId]: option }));
  };

  const handleSubmit = () => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000); // in seconds
    const totalQuestions = questions.length;
    const averagePerQuestion = Math.floor(timeSpent / totalQuestions);
    const timePerQuestion = Array(totalQuestions).fill(averagePerQuestion); // calculate when submitting

    let score = 0;
    questions.forEach(q => {
      if (selectedAnswers[q.id] === q.answer) {
        score++;
      }
    });

    navigate('/scoreboard', {
      state: {
        category,
        score,
        questions,
        selectedAnswers,
        timePerQuestion,
      },
    });
  };

  if (loading) {
    return <div className="quiz-container"><p>Loading questions...</p></div>;
  }

  if (error) {
    return <div className="quiz-container"><p style={{ color: 'red' }}>{error}</p></div>;
  }

  if (questions.length === 0) {
    return <div className="quiz-container"><p>No questions available for this category.</p></div>;
  }

  return (
    <div className="quiz-container">
      <h2>{category} Quiz</h2>
      {questions.map((q, idx) => (
        <div key={q.id} className="question-block">
          <h4>{idx + 1}. {q.question}</h4>
          {q.options.map(option => (
            <label key={option} className="option-label">
              <input
                type="radio"
                name={`q-${q.id}`}
                value={option}
                checked={selectedAnswers[q.id] === option}
                onChange={() => handleOptionSelect(q.id, option)}
              />
              {option}
            </label>
          ))}
        </div>
      ))}
      <button className="submit-btn" onClick={handleSubmit}>Submit</button>
    </div>
  );
}

export default Quiz;
