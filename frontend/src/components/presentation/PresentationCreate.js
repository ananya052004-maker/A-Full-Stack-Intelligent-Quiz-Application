import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getVoterToken } from '../../utils/token';

const API = 'http://localhost:5000/api';

function PresentationCreate() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) return setError('Please enter a title.');

    setSubmitting(true);
    try {
      const ownerToken = getVoterToken();
      const res = await axios.post(`${API}/presentations`, { title: title.trim(), ownerToken });
      localStorage.setItem(`quorum_pres_owner_${res.data.id}`, '1');
      navigate(`/features/presentations/${res.data.id}/edit`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create. Is the backend running?');
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-quorum-400 to-quorum-600 text-3xl shadow-card">
          🖥️
        </div>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slateink sm:text-4xl">
          Create a Presentation
        </h1>
        <p className="mt-2 text-slate-600">
          Combine polls, word clouds and surveys into one deck. Advance a slide and every screen
          follows along.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8"
      >
        <label className="block text-sm font-semibold text-slateink">Presentation title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Kickoff Workshop"
          maxLength={255}
          className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slateink outline-none transition focus:border-quorum-500 focus:ring-2 focus:ring-quorum-100"
        />

        {error && (
          <div className="mt-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-lg bg-quorum-500 px-6 py-3 text-lg font-semibold text-white shadow-card transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Creating…' : 'Create & add slides'}
        </button>
      </form>
    </div>
  );
}

export default PresentationCreate;
