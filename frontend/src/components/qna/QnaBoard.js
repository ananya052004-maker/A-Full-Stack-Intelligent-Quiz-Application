import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { getVoterToken } from '../../utils/token';

const API = 'http://localhost:5000/api';

function QnaBoard() {
  const { id } = useParams();
  const [board, setBoard] = useState(null);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [copied, setCopied] = useState(false);
  const isOwner = localStorage.getItem(`quorum_qna_owner_${id}`) === '1';

  const fetchBoard = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/qna/${id}`, {
        params: { voterToken: getVoterToken() },
      });
      setBoard(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load this Q&A.');
    }
  }, [id]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  // Live updates every 2s.
  useEffect(() => {
    const timer = setInterval(fetchBoard, 2000);
    return () => clearInterval(timer);
  }, [fetchBoard]);

  const submitQuestion = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setPosting(true);
    try {
      await axios.post(`${API}/qna/${id}/questions`, {
        text: text.trim(),
        authorToken: getVoterToken(),
      });
      setText('');
      fetchBoard();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to post question.');
    } finally {
      setPosting(false);
    }
  };

  const toggleUpvote = async (qid) => {
    try {
      await axios.post(`${API}/qna/questions/${qid}/upvote`, { voterToken: getVoterToken() });
      fetchBoard();
    } catch {
      /* ignore transient errors; next poll will reconcile */
    }
  };

  const toggleAnswered = async (qid, current) => {
    try {
      await axios.post(`${API}/qna/questions/${qid}/answer`, {
        ownerToken: getVoterToken(),
        answered: !current,
      });
      fetchBoard();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update question.');
    }
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

  if (error && !board) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <p className="text-rose-600">{error}</p>
        <Link to="/features/qna" className="mt-4 inline-block font-semibold text-quorum-600">
          ← Start a new Q&A
        </Link>
      </div>
    );
  }

  if (!board) {
    return <div className="mx-auto max-w-2xl px-4 py-20 text-center text-slate-500">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-quorum-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-quorum-600">
            Live Q&amp;A
          </span>
          <span className="text-sm text-slate-500">
            {board.questions.length} {board.questions.length === 1 ? 'question' : 'questions'}
          </span>
        </div>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slateink sm:text-3xl">
          {board.title}
        </h1>

        {/* Ask a question */}
        <form onSubmit={submitQuestion} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your question…"
            maxLength={500}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slateink outline-none transition focus:border-quorum-500 focus:ring-2 focus:ring-quorum-100"
          />
          <button
            type="submit"
            disabled={posting || !text.trim()}
            className="shrink-0 rounded-lg bg-quorum-500 px-6 py-3 font-semibold text-white transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Ask
          </button>
        </form>
      </div>

      {/* Questions, sorted by votes */}
      <div className="mt-5 space-y-3">
        {board.questions.length === 0 && (
          <p className="py-8 text-center text-slate-400">
            No questions yet — be the first to ask!
          </p>
        )}
        {board.questions.map((q) => (
          <div
            key={q.id}
            className={`flex items-start gap-4 rounded-xl border p-4 transition-all ${
              q.answered ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-white'
            }`}
          >
            <button
              onClick={() => toggleUpvote(q.id)}
              className={`flex shrink-0 flex-col items-center rounded-lg border px-3 py-2 transition-colors ${
                q.upvotedByMe
                  ? 'border-quorum-500 bg-quorum-50 text-quorum-600'
                  : 'border-slate-200 text-slate-500 hover:border-quorum-400 hover:text-quorum-600'
              }`}
              aria-label="Upvote"
            >
              <span className="text-lg leading-none">▲</span>
              <span className="text-sm font-bold">{q.votes}</span>
            </button>

            <div className="flex-1">
              <p className={`text-slateink ${q.answered ? 'line-through opacity-70' : ''}`}>
                {q.text}
              </p>
              {q.answered && (
                <span className="mt-1 inline-block text-xs font-semibold uppercase text-green-600">
                  ✓ Answered
                </span>
              )}
            </div>

            {isOwner && (
              <button
                onClick={() => toggleAnswered(q.id, q.answered)}
                className="shrink-0 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:border-green-400 hover:text-green-600"
              >
                {q.answered ? 'Reopen' : 'Mark answered'}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Share + navigation */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={share}
          className="rounded-lg bg-slateink px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-105"
        >
          {copied ? '✓ Link copied!' : '🔗 Share this Q&A'}
        </button>
        <Link
          to="/features/qna"
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slateink transition-colors hover:bg-white"
        >
          + New Q&A
        </Link>
      </div>
      {isOwner && (
        <p className="mt-3 text-center text-xs text-slate-400">
          You created this board — you can mark questions as answered.
        </p>
      )}
    </div>
  );
}

export default QnaBoard;
