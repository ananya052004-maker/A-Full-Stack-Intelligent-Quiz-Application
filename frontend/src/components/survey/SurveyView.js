import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { getVoterToken } from '../../utils/token';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function SurveyView({ embedId, embedded = false }) {
  const params = useParams();
  const id = embedId || params.id;
  const [survey, setSurvey] = useState(null);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [hoverStar, setHoverStar] = useState(0);
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(
    () => localStorage.getItem(`quorum_survey_done_${id}`) === '1'
  );

  const fetchSurvey = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/surveys/${id}`, {
        params: { responderToken: getVoterToken() },
      });
      setSurvey(res.data);
      if (res.data.hasResponded) setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load this survey.');
    }
  }, [id]);

  useEffect(() => {
    fetchSurvey();
  }, [fetchSurvey]);

  // Live updates once results are showing.
  useEffect(() => {
    if (!submitted) return undefined;
    const timer = setInterval(fetchSurvey, 2000);
    return () => clearInterval(timer);
  }, [submitted, fetchSurvey]);

  const respond = async (payload) => {
    try {
      await axios.post(`${API}/surveys/${id}/respond`, {
        ...payload,
        responderToken: getVoterToken(),
      });
    } catch (err) {
      if (err.response?.status !== 409) {
        setError(err.response?.data?.error || 'Failed to submit.');
        return;
      }
    }
    localStorage.setItem(`quorum_survey_done_${id}`, '1');
    setSubmitted(true);
    fetchSurvey();
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

  if (error && !survey) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <p className="text-rose-600">{error}</p>
        <Link to="/features/survey" className="mt-4 inline-block font-semibold text-quorum-600">
          ← Create a new survey
        </Link>
      </div>
    );
  }
  if (!survey) {
    return <div className="mx-auto max-w-2xl px-4 py-20 text-center text-slate-500">Loading…</div>;
  }

  const agg = survey.aggregate;

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-quorum-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-quorum-600">
            Anonymous Survey
          </span>
          <span className="text-sm text-slate-500">
            {agg.count} {agg.count === 1 ? 'response' : 'responses'}
          </span>
        </div>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slateink sm:text-3xl">
          {survey.question}
        </h1>

        {/* INPUT (not yet responded) */}
        {!submitted && survey.mode === 'rating' && (
          <div className="mt-8 text-center">
            <div className="flex justify-center gap-2">
              {Array.from({ length: survey.scale }).map((_, i) => {
                const val = i + 1;
                return (
                  <button
                    key={val}
                    onMouseEnter={() => setHoverStar(val)}
                    onMouseLeave={() => setHoverStar(0)}
                    onClick={() => respond({ rating: val })}
                    className={`text-4xl transition-transform hover:scale-125 ${
                      val <= hoverStar ? 'text-amber-400' : 'text-slate-300'
                    }`}
                    aria-label={`${val} star`}
                  >
                    ★
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-sm text-slate-500">Tap a star to submit your rating.</p>
          </div>
        )}

        {!submitted && survey.mode === 'text' && (
          <div className="mt-6">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share your feedback…"
              rows={4}
              maxLength={1000}
              className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-slateink outline-none transition focus:border-quorum-500 focus:ring-2 focus:ring-quorum-100"
            />
            <button
              onClick={() => text.trim() && respond({ text })}
              disabled={!text.trim()}
              className="mt-3 w-full rounded-lg bg-quorum-500 px-6 py-3 font-semibold text-white transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Submit feedback
            </button>
          </div>
        )}

        {/* RESULTS (after responding) */}
        {submitted && (
          <div className="mt-6">
            <div className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-center text-sm font-medium text-green-700">
              ✓ Thanks! Your response was recorded anonymously.
            </div>

            {agg.mode === 'rating' ? (
              <>
                <div className="text-center">
                  <div className="text-5xl font-extrabold text-slateink">{agg.average}</div>
                  <div className="text-amber-400">
                    {'★'.repeat(Math.round(agg.average))}
                    <span className="text-slate-200">
                      {'★'.repeat(agg.scale - Math.round(agg.average))}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-slate-500">average of {agg.count} ratings</div>
                </div>
                <div className="mt-6 space-y-2">
                  {agg.histogram
                    .map((c, i) => ({ star: i + 1, c }))
                    .reverse()
                    .map(({ star, c }) => {
                      const pct = agg.count ? Math.round((c / agg.count) * 100) : 0;
                      return (
                        <div key={star} className="flex items-center gap-3">
                          <span className="w-10 shrink-0 text-sm text-slate-500">{star}★</span>
                          <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-amber-400 transition-all duration-700 ease-out"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-10 shrink-0 text-right text-sm text-slate-500">{c}</span>
                        </div>
                      );
                    })}
                </div>
              </>
            ) : (
              <div className="space-y-3">
                {agg.responses.length === 0 && (
                  <p className="py-6 text-center text-slate-400">No feedback yet.</p>
                )}
                {agg.responses.map((r, i) => (
                  <div
                    key={i}
                    className="animate-fade-up rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slateink"
                  >
                    “{r.text}”
                  </div>
                ))}
              </div>
            )}
            <p className="pt-4 text-center text-xs text-slate-400">
              Results update live as new responses arrive.
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
            {copied ? '✓ Link copied!' : '🔗 Share this survey'}
          </button>
          <Link
            to="/features/survey"
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slateink transition-colors hover:bg-white"
          >
            + New survey
          </Link>
        </div>
      )}
    </div>
  );
}

export default SurveyView;
