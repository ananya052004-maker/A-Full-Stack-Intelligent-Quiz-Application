import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function SurveyCreate() {
  const navigate = useNavigate();
  const [question, setQuestion] = useState('');
  const [mode, setMode] = useState('rating');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!question.trim()) return setError('Please enter a question.');

    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/surveys`, { question: question.trim(), mode, scale: 5 });
      navigate(`/features/survey/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create survey. Is the backend running?');
      setSubmitting(false);
    }
  };

  const modeCard = (value, icon, title, subtitle) => {
    const active = mode === value;
    return (
      <button
        type="button"
        onClick={() => setMode(value)}
        className={`flex-1 rounded-xl border-2 p-4 text-left transition-all ${
          active
            ? 'border-quorum-500 bg-quorum-50'
            : 'border-slate-200 bg-white hover:border-slate-300'
        }`}
      >
        <div className="text-2xl">{icon}</div>
        <div className="mt-2 font-bold text-slateink">{title}</div>
        <div className="mt-0.5 text-sm text-slate-500">{subtitle}</div>
      </button>
    );
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-quorum-400 to-quorum-600 text-3xl shadow-card">
          📝
        </div>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slateink sm:text-4xl">
          Create a Survey
        </h1>
        <p className="mt-2 text-slate-600">Collect honest, anonymous feedback from the room.</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8"
      >
        <label className="block text-sm font-semibold text-slateink">Your question</label>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. How would you rate today's session?"
          maxLength={255}
          className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slateink outline-none transition focus:border-quorum-500 focus:ring-2 focus:ring-quorum-100"
        />

        <label className="mt-6 block text-sm font-semibold text-slateink">Response type</label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          {modeCard('rating', '⭐', 'Rating scale', '1–5 stars → average & distribution')}
          {modeCard('text', '💭', 'Open text', 'Free-text feedback → live feed')}
        </div>

        {error && (
          <div className="mt-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-lg bg-quorum-500 px-6 py-3 text-lg font-semibold text-white shadow-card transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Creating…' : 'Create Survey'}
        </button>
      </form>
    </div>
  );
}

export default SurveyCreate;
