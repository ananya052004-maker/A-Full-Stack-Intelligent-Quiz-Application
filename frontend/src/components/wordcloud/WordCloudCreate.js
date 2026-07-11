import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:5000/api';

function WordCloudCreate() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [maxWords, setMaxWords] = useState(3);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!prompt.trim()) return setError('Please enter a prompt.');

    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/wordclouds`, { prompt: prompt.trim(), maxWords });
      navigate(`/features/word-cloud/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create word cloud. Is the backend running?');
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-quorum-400 to-quorum-600 text-3xl shadow-card">
          ☁️
        </div>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slateink sm:text-4xl">
          Create a Word Cloud
        </h1>
        <p className="mt-2 text-slate-600">
          Ask a question — popular answers grow bigger as the room submits words.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8"
      >
        <label className="block text-sm font-semibold text-slateink">Your prompt</label>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Describe today's session in one word"
          maxLength={255}
          className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slateink outline-none transition focus:border-quorum-500 focus:ring-2 focus:ring-quorum-100"
        />

        <label className="mt-6 block text-sm font-semibold text-slateink">
          Words per person: <span className="text-quorum-600">{maxWords}</span>
        </label>
        <input
          type="range"
          min="1"
          max="10"
          value={maxWords}
          onChange={(e) => setMaxWords(Number(e.target.value))}
          className="mt-2 w-full accent-quorum-500"
        />

        {error && (
          <div className="mt-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-lg bg-quorum-500 px-6 py-3 text-lg font-semibold text-white shadow-card transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Creating…' : 'Create Word Cloud'}
        </button>
      </form>
    </div>
  );
}

export default WordCloudCreate;
