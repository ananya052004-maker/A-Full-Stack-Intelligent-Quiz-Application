import React from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();

  function startQuiz() {
    navigate('/category');
  }

  return (
    <div style={styles.container}>
        <h2 style={styles.subtitle}>Test Yourself Today</h2>
     
      <img src="/image2.png" alt="Quiz Banner" style={styles.image} />

      <h1>Welcome to the Quiz App</h1>
      <p style={styles.paragraph}>
        Test your knowledge with exciting general knowledge questions! This interactive quiz app records your answers, gives you instant feedback, and calculates your final score — helping you challenge yourself and sharpen your skills in a fun and engaging way.
      </p>
      <button onClick={startQuiz} style={styles.button}>Start Quiz</button>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    textAlign: 'center',
    height: '100vh',
    paddingTop: '50px',
  },
  image: {
    width: '300px',    
    height: 'auto',
    marginBottom: '20px',
    borderRadius: '10px',
    
  },
  paragraph: {
    maxWidth: '600px',
    marginTop: '20px',
    fontSize: '16px',
    lineHeight: '1.6',
  },
  button: {
    marginTop: '30px',
    padding: '10px 25px',
    fontSize: '18px',
    cursor: 'pointer',
  },
  subtitle: {
    fontSize: '32px',
    fontWeight: '3000',
    marginBottom: '20px',
    color: '#222',
    textTransform: 'uppercase',
  }
  

};

export default Home;
