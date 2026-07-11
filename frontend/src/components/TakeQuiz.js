import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:5000/api';

function LeaderboardTable({ id, highlightName }) {
  const [rows, setRows] = useState(null);

  const load = useCallback(() => {
    axios
      .get(`${API}/quizzes/${id}/leaderboard`)
      .then((res) => setRows(res.data))
      .catch(() => setRows([]));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!rows) return <p className="py-6 text-center text-slate-500">Loading leaderboard…</p>;
  if (rows.length === 0)
    return <p className="py-6 text-center text-slate-400">No one has taken this quiz yet.</p>;

  const medal = ['🥇', '🥈', '🥉'];
  return (
    <div className="space-y-2">
      {rows.map((r, i) => {
        const mine = highlightName && r.name === highlightName;
        return (
          <div
            key={`${r.name}-${i}`}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
              mine ? 'border-quorum-400 bg-quorum-50' : 'border-slate-200 bg-white'
            }`}
          >
            <span className="w-8 text-center text-lg font-bold text-slate-500">
              {medal[i] || i + 1}
            </span>
            <span className="flex-1 font-semibold text-slateink">
              {r.name} {mine && <span className="text-xs text-quorum-600">(you)</span>}
            </span>
            <span className="font-bold text-slateink">
              {r.score}
              <span className="text-sm font-normal text-slate-400">/{r.total}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TakeQuiz() {
  const { id } = useParams();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState(
    () => user?.name || localStorage.getItem('quorum_name') || ''
  );
  const [started, setStarted] = useState(false);
  const showLeaderboardOnly = searchParams.get('tab') === 'leaderboard';

  useEffect(() => {
    axios
      .get(`${API}/quizzes/${id}`)
      .then((res) => setQuiz(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Quiz not found.'));
  }, [id]);

  // If logged in, adopt that name automatically.
  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user]);

  const choose = (qid, option) => setAnswers((a) => ({ ...a, [qid]: option }));

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await axios.post(`${API}/quizzes/${id}/submit`, { answers, name });
      setResult(res.data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.response?.data?.error || 'Could not submit.');
    } finally {
      setSubmitting(false);
    }
  };

  if (error && !quiz) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <p className="text-rose-600">{error}</p>
        <Link to="/quizzes" className="mt-4 inline-block font-semibold text-quorum-600">
          ← All quizzes
        </Link>
      </div>
    );
  }
  if (!quiz) {
    return <div className="mx-auto max-w-2xl px-4 py-20 text-center text-slate-500">Loading…</div>;
  }

  // Leaderboard-only view (from the 🏆 button)
  if (showLeaderboardOnly && !result) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <h1 className="text-center text-3xl font-extrabold tracking-tight text-slateink">
          🏆 {quiz.title}
        </h1>
        <p className="mb-6 mt-1 text-center text-slate-500">Leaderboard</p>
        <LeaderboardTable id={id} highlightName={name} />
        <div className="mt-8 text-center">
          <Link to={`/take/${id}`} className="rounded-lg bg-quorum-500 px-6 py-3 font-semibold text-white">
            Take this quiz
          </Link>
        </div>
      </div>
    );
  }

  // Results view (after submitting)
  if (result) {
    const pct = Math.round((result.score / result.total) * 100);
    return (
      <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-card">
          <div className="text-5xl">{pct >= 60 ? '🎉' : '💪'}</div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slateink">
            {result.score} / {result.total}
          </h1>
          <p className="mt-1 text-slate-500">You scored {pct}%</p>
          <div className="mt-4 inline-block rounded-full bg-quorum-50 px-4 py-1.5 text-sm font-semibold text-quorum-700">
            Rank #{result.rank} of {result.players} {result.players === 1 ? 'player' : 'players'}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            🏆 Leaderboard
          </h2>
          <LeaderboardTable id={id} highlightName={result.name} />
        </div>

        {/* Answer review */}
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Your answers
          </h2>
          <div className="space-y-3">
            {result.results.map((r, i) => (
              <div
                key={r.questionId}
                className={`rounded-xl border p-4 ${
                  r.correct ? 'border-green-200 bg-green-50' : 'border-rose-200 bg-rose-50'
                }`}
              >
                <p className="font-semibold text-slateink">
                  {i + 1}. {r.question}
                </p>
                <p className="mt-2 text-sm">
                  <span className={r.correct ? 'text-green-700' : 'text-rose-700'}>
                    {r.correct ? '✓' : '✗'} Your answer: {r.yourAnswer ?? '(blank)'}
                  </span>
                </p>
                {!r.correct && (
                  <p className="text-sm text-green-700">✓ Correct answer: {r.correctAnswer}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex justify-center gap-3">
          <Link to="/quizzes" className="rounded-lg bg-slateink px-6 py-3 font-semibold text-white">
            More quizzes
          </Link>
        </div>
      </div>
    );
  }

  // Name gate (before starting), skipped for logged-in users
  if (!started && !name) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-card">
          <span className="rounded-full bg-quorum-50 px-3 py-1 text-xs font-semibold uppercase text-quorum-600">
            {quiz.category} Quiz
          </span>
          <h1 className="mt-4 text-2xl font-extrabold text-slateink">{quiz.title}</h1>
          <p className="mt-2 text-slate-600">Enter your name to appear on the leaderboard.</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={80}
            className="mt-5 w-full rounded-lg border border-slate-300 px-4 py-3 text-center text-slateink outline-none focus:border-quorum-500 focus:ring-2 focus:ring-quorum-100"
          />
          <button
            onClick={() => {
              const n = name.trim() || 'Anonymous';
              setName(n);
              localStorage.setItem('quorum_name', n);
              setStarted(true);
            }}
            className="mt-4 w-full rounded-lg bg-quorum-500 px-6 py-3 font-semibold text-white transition-transform hover:scale-[1.02]"
          >
            Start quiz →
          </button>
        </div>
      </div>
    );
  }

  // Taking view
  const allAnswered = quiz.questions.every((q) => answers[q.id]);
  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <div className="text-center">
        <span className="rounded-full bg-quorum-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-quorum-600">
          {quiz.category} Quiz
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slateink">{quiz.title}</h1>
        <p className="mt-1 text-slate-500">
          {quiz.questions.length} questions · playing as{' '}
          <span className="font-semibold text-slateink">{name || 'Anonymous'}</span>
        </p>
      </div>

      <div className="mt-8 space-y-4">
        {quiz.questions.map((q, idx) => (
          <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <h3 className="font-semibold text-slateink">
              {idx + 1}. {q.question}
            </h3>
            <div className="mt-4 space-y-2">
              {q.options.map((opt) => (
                <label
                  key={opt}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                    answers[q.id] === opt
                      ? 'border-quorum-400 bg-quorum-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    checked={answers[q.id] === opt}
                    onChange={() => choose(q.id, opt)}
                    className="h-4 w-4 accent-quorum-500"
                  />
                  <span className="text-slateink">{opt}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && <div className="mt-4 rounded-lg bg-rose-50 px-4 py-2.5 text-sm text-rose-600">{error}</div>}

      <button
        onClick={submit}
        disabled={submitting || !allAnswered}
        className="mt-6 w-full rounded-lg bg-quorum-500 px-6 py-3 text-lg font-semibold text-white shadow-card transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? 'Submitting…' : allAnswered ? 'Submit quiz' : 'Answer all questions to submit'}
      </button>
    </div>
  );
}

export default TakeQuiz;
