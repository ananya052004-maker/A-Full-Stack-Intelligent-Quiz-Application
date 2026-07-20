import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BAR_COLORS = [
  'bg-quorum-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-teal-500',
  'bg-orange-500',
];

// A stable per-browser id so each person votes once.
function getVoterToken() {
  let t = localStorage.getItem('quorum_voter_token');
  if (!t) {
    t = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random()}`;
    localStorage.setItem('quorum_voter_token', t);
  }
  return t;
}

function PollView({ embedId, embedded = false }) {
  const params = useParams();
  const id = embedId || params.id;
  const [poll, setPoll] = useState(null);
  const [error, setError] = useState('');
  const [votedIndex, setVotedIndex] = useState(() => {
    const v = localStorage.getItem(`quorum_voted_${id}`);
    return v === null ? null : Number(v);
  });
  const [copied, setCopied] = useState(false);
  const hasVoted = votedIndex !== null;

  const fetchPoll = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/polls/${id}`);
      setPoll(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load this poll.');
    }
  }, [id]);

  useEffect(() => {
    fetchPoll();
  }, [fetchPoll]);

  // Live updates: poll the backend every 2s once results are visible.
  useEffect(() => {
    if (!hasVoted) return undefined;
    const timer = setInterval(fetchPoll, 2000);
    return () => clearInterval(timer);
  }, [hasVoted, fetchPoll]);

  const vote = async (optionIndex) => {
    try {
      await axios.post(`${API}/polls/${id}/vote`, { optionIndex, voterToken: getVoterToken() });
    } catch (err) {
      // 409 = already voted from this browser; just show results.
      if (err.response?.status !== 409) {
        setError(err.response?.data?.error || 'Vote failed.');
        return;
      }
    }
    localStorage.setItem(`quorum_voted_${id}`, String(optionIndex));
    setVotedIndex(optionIndex);
    fetchPoll();
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <p className="text-rose-600">{error}</p>
        <Link to="/features/poll" className="mt-4 inline-block font-semibold text-quorum-600">
          ← Create a new poll
        </Link>
      </div>
    );
  }

  if (!poll) {
    return <div className="mx-auto max-w-2xl px-4 py-20 text-center text-slate-500">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-quorum-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-quorum-600">
            Live Poll
          </span>
          <span className="text-sm text-slate-500">
            {poll.total} {poll.total === 1 ? 'vote' : 'votes'}
          </span>
        </div>

        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slateink sm:text-3xl">
          {poll.question}
        </h1>

        {!hasVoted ? (
          <>
            <p className="mt-2 text-slate-600">Tap an option to cast your vote.</p>
            <div className="mt-6 space-y-3">
              {poll.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => vote(i)}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-5 py-4 text-left font-medium text-slateink transition-all hover:-translate-y-0.5 hover:border-quorum-400 hover:shadow-card"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-500">
                    {i + 1}
                  </span>
                  {opt}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-6 space-y-4">
            {poll.options.map((opt, i) => {
              const count = poll.counts[i] || 0;
              const pct = poll.total ? Math.round((count / poll.total) * 100) : 0;
              const isMine = votedIndex === i;
              return (
                <div key={i}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-semibold text-slateink">
                      {opt} {isMine && <span className="text-quorum-600">• your vote</span>}
                    </span>
                    <span className="text-slate-500">
                      {pct}% ({count})
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${
                        BAR_COLORS[i % BAR_COLORS.length]
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <p className="pt-2 text-center text-xs text-slate-400">
              Results update live as new votes arrive.
            </p>
          </div>
        )}
      </div>

      {/* Share + navigation */}
      {!embedded && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={share}
            className="rounded-lg bg-slateink px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-105"
          >
            {copied ? '✓ Link copied!' : '🔗 Share this poll'}
          </button>
          <Link
            to="/features/poll"
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slateink transition-colors hover:bg-white"
          >
            + New poll
          </Link>
        </div>
      )}
    </div>
  );
}

export default PollView;
