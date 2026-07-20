import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function TeacherDashboard() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/teacher/quizzes`, { withCredentials: true });
      setQuizzes(res.data);
    } catch {
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const shareLink = (id) => `${window.location.origin}/take/${id}`;

  const copy = async (id) => {
    try {
      await navigator.clipboard.writeText(shareLink(id));
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this quiz? This cannot be undone.')) return;
    await axios.delete(`${API}/teacher/quizzes/${id}`, { withCredentials: true });
    load();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-quorum-600">
            Teacher dashboard
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slateink">Your quizzes</h1>
        </div>
        <div className="flex gap-3">
          <Link
            to="/teacher/questions"
            className="rounded-lg border border-slate-300 px-5 py-2.5 font-semibold text-slateink transition-colors hover:bg-white"
          >
            📚 Question Bank
          </Link>
          <Link
            to="/teacher/quizzes/new"
            className="rounded-lg bg-quorum-500 px-5 py-2.5 font-semibold text-white shadow-card transition-transform hover:scale-105"
          >
            + Build a Quiz
          </Link>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {loading ? (
          <p className="text-slate-500">Loading…</p>
        ) : quizzes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center">
            <p className="text-slate-500">You haven't built any quizzes yet.</p>
            <Link
              to="/teacher/quizzes/new"
              className="mt-4 inline-block rounded-lg bg-quorum-500 px-6 py-3 font-semibold text-white"
            >
              Build your first quiz
            </Link>
          </div>
        ) : (
          quizzes.map((q) => (
            <div
              key={q.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-card"
            >
              <div>
                <h3 className="text-lg font-bold text-slateink">{q.title}</h3>
                <p className="text-sm text-slate-500">
                  {q.category} · {q.question_count} question{q.question_count === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copy(q.id)}
                  className="rounded-lg bg-slateink px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-105"
                >
                  {copiedId === q.id ? '✓ Copied!' : '🔗 Share link'}
                </button>
                <Link
                  to={`/take/${q.id}`}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slateink transition-colors hover:bg-slate-50"
                >
                  Preview
                </Link>
                <button
                  onClick={() => remove(q.id)}
                  className="rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default TeacherDashboard;
