import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './components/Home';
import CategorySelect from './components/CategorySelect';
import Quiz from './components/Quiz';
import Scoreboard from './components/Scoreboard';
import Login from './components/Login';

function App() {
  return (
    <div className="App">
      <Navbar />

      <main style={{ minHeight: 'calc(100vh - 120px)', paddingBottom: '60px' }}>
        <Routes>
          <Route path="/login" element={<Login />} /> 
          <Route path="/" element={<Home />} />
          <Route path="/category" element={<CategorySelect />} />
          <Route path="/quiz/:category" element={<Quiz />} />
          <Route path="/scoreboard" element={<Scoreboard />} />

        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App;
