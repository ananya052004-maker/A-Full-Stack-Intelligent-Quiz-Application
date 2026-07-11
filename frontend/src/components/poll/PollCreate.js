import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:5000/api';

function PollCreate() {
  const navigate = useNavigate();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const updateOption = (i, value) => {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)));
  };

  const addOption = () => {
    if (options.length < 8) setOptions((prev) => [...prev, '']);
  };

  const removeOption = (i) => {
    if (options.length > 2) setOptions((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const cleaned = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim()) return setError('Please enter a question.');
    if (cleaned.length < 2) return setError('Please provide at least 2 options.');

    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/polls`, { question: question.trim(), options: cleaned });
      navigate(`/features/poll/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create poll. Is the backend running?');
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-quorum-400 to-quorum-600 text-3xl shadow-card">
          📊
        </div>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slateink sm:text-4xl">
          Create a Poll
        </h1>
        <p className="mt-2 text-slate-600">
          Ask the room a question, share the link, and watch results come in live.
        </p>
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
          placeholder="e.g. What should we build next?"
          maxLength={255}
          className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slateink outline-none transition focus:border-quorum-500 focus:ring-2 focus:ring-quorum-100"
        />

        <label className="mt-6 block text-sm font-semibold text-slateink">Options</label>
        <div className="mt-2 space-y-3">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-500">
                {i + 1}
              </span>
              <input
                type="text"
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                maxLength={120}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slateink outline-none transition focus:border-quorum-500 focus:ring-2 focus:ring-quorum-100"
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  className="shrink-0 rounded-lg px-3 py-2 text-slate-400 transition hover:bg-slate-100 hover:text-rose-500"
                  aria-label="Remove option"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {options.length < 8 && (
          <button
            type="button"
            onClick={addOption}
            className="mt-3 text-sm font-semibold text-quorum-600 hover:text-quorum-700"
          >
            + Add option
          </button>
        )}

        {error && (
          <div className="mt-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-lg bg-quorum-500 px-6 py-3 text-lg font-semibold text-white shadow-card transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Creating…' : 'Create Poll'}
        </button>
      </form>
    </div>
  );
}

export default PollCreate;
