import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { getVoterToken } from '../../utils/token';

const API = 'http://localhost:5000/api';
const COLORS = [
  'text-quorum-600',
  'text-emerald-600',
  'text-amber-600',
  'text-rose-600',
  'text-sky-600',
  'text-violet-600',
  'text-teal-600',
];

// Renders a live word cloud. Used standalone (reads :id from the route) or
// embedded inside a presentation (pass embedId + embedded).
function WordCloudView({ embedId, embedded = false }) {
  const params = useParams();
  const id = embedId || params.id;

  const [cloud, setCloud] = useState(null);
  const [error, setError] = useState('');
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchCloud = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/wordclouds/${id}`, {
        params: { submitterToken: getVoterToken() },
      });
      setCloud(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load this word cloud.');
    }
  }, [id]);

  useEffect(() => {
    fetchCloud();
  }, [fetchCloud]);

  useEffect(() => {
    const timer = setInterval(fetchCloud, 2000);
    return () => clearInterval(timer);
  }, [fetchCloud]);

  const remaining = cloud ? cloud.maxWords - cloud.mySubmissions : 0;

  const submit = async (e) => {
    e.preventDefault();
    const words = input
      .split(',')
      .map((w) => w.trim())
      .filter(Boolean);
    if (!words.length) return;
    try {
      await axios.post(`${API}/wordclouds/${id}/words`, {
        words,
        submitterToken: getVoterToken(),
      });
      setInput('');
      fetchCloud();
    } catch (err) {
      if (err.response?.status === 409) {
        setInput('');
        fetchCloud();
      } else {
        setError(err.response?.data?.error || 'Failed to submit.');
      }
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

  if (error && !cloud) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <p className="text-rose-600">{error}</p>
        <Link to="/features/word-cloud" className="mt-4 inline-block font-semibold text-quorum-600">
          ← Create a new word cloud
        </Link>
      </div>
    );
  }
  if (!cloud) {
    return <div className="mx-auto max-w-2xl px-4 py-20 text-center text-slate-500">Loading…</div>;
  }

  const maxValue = cloud.words.reduce((m, w) => Math.max(m, w.value), 1);

  const cloudBody = (
    <>
      {/* The live cloud */}
      <div className="flex min-h-[180px] flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-xl bg-slate-50 p-6">
        {cloud.words.length === 0 ? (
          <p className="text-slate-400">Waiting for the first words…</p>
        ) : (
          cloud.words.map((w, i) => {
            const size = 16 + (w.value / maxValue) * 40; // 16px … 56px
            return (
              <span
                key={w.text}
                className={`font-extrabold leading-tight transition-all duration-500 ${
                  COLORS[i % COLORS.length]
                }`}
                style={{ fontSize: `${size}px` }}
                title={`${w.value} ${w.value === 1 ? 'mention' : 'mentions'}`}
              >
                {w.text}
              </span>
            );
          })
        )}
      </div>

      {/* Submission input */}
      {remaining > 0 ? (
        <form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a word (or several, comma-separated)…"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slateink outline-none transition focus:border-quorum-500 focus:ring-2 focus:ring-quorum-100"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-quorum-500 px-6 py-3 font-semibold text-white transition-transform hover:scale-105"
          >
            Add
          </button>
        </form>
      ) : (
        <p className="mt-5 rounded-lg bg-green-50 px-4 py-2 text-center text-sm font-medium text-green-700">
          ✓ Thanks — you've added all {cloud.maxWords} of your words.
        </p>
      )}
      {remaining > 0 && (
        <p className="mt-2 text-center text-xs text-slate-400">
          You can add {remaining} more {remaining === 1 ? 'word' : 'words'}.
        </p>
      )}
    </>
  );

  // Embedded mode: just the cloud + input, no page chrome.
  if (embedded) {
    return <div>{cloudBody}</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-quorum-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-quorum-600">
            Live Word Cloud
          </span>
          <span className="text-sm text-slate-500">
            {cloud.total} {cloud.total === 1 ? 'word' : 'words'}
          </span>
        </div>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slateink sm:text-3xl">
          {cloud.prompt}
        </h1>
        <div className="mt-6">{cloudBody}</div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={share}
          className="rounded-lg bg-slateink px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-105"
        >
          {copied ? '✓ Link copied!' : '🔗 Share this word cloud'}
        </button>
        <Link
          to="/features/word-cloud"
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slateink transition-colors hover:bg-white"
        >
          + New word cloud
        </Link>
      </div>
    </div>
  );
}

export default WordCloudView;
