import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { getVoterToken } from '../../utils/token';
import SlideRenderer from './SlideRenderer';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function PresentationPresent() {
  const { id } = useParams();
  const [pres, setPres] = useState(null);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const ownerToken = getVoterToken();

  useEffect(() => {
    axios
      .get(`${API}/presentations/${id}`, { params: { ownerToken } })
      .then((res) => {
        setPres(res.data);
        setIndex(res.data.currentIndex || 0);
      })
      .catch((err) => setError(err.response?.data?.error || 'Could not load presentation.'));
  }, [id, ownerToken]);

  const goto = useCallback(
    async (newIndex) => {
      if (!pres) return;
      const clamped = Math.max(0, Math.min(newIndex, pres.slides.length - 1));
      setIndex(clamped);
      try {
        await axios.post(`${API}/presentations/${id}/nav`, { ownerToken, index: clamped });
      } catch (err) {
        setError(err.response?.data?.error || 'Could not change slide.');
      }
    },
    [pres, id, ownerToken]
  );

  const share = async () => {
    const url = `${window.location.origin}/features/presentations/${id}`;
    try {
      await navigator.clipboard.writeText(url);
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
        <Link to="/features/presentations" className="mt-4 inline-block font-semibold text-quorum-600">
          ← Presentations
        </Link>
      </div>
    );
  }
  if (!pres) {
    return <div className="mx-auto max-w-2xl px-4 py-20 text-center text-slate-500">Loading…</div>;
  }
  if (pres.slides.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <p className="text-slate-500">This presentation has no slides yet.</p>
        <Link to={`/features/presentations/${id}/edit`} className="mt-4 inline-block font-semibold text-quorum-600">
          ← Add slides
        </Link>
      </div>
    );
  }

  const slide = pres.slides[index];

  return (
    <div className="min-h-[70vh] bg-gradient-to-br from-slateink via-slateink-800 to-slateink-900 py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Presenter bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-white">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-quorum-400">
              Presenter mode
            </p>
            <h1 className="text-xl font-extrabold">{pres.title}</h1>
          </div>
          <button
            onClick={share}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
          >
            {copied ? '✓ Join link copied!' : '🔗 Copy join link for audience'}
          </button>
        </div>

        {/* Current slide */}
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-card sm:p-8">
          <SlideRenderer slide={slide} />
        </div>

        {/* Controls */}
        <div className="mt-6 flex items-center justify-between text-white">
          <button
            onClick={() => goto(index - 1)}
            disabled={index === 0}
            className="rounded-lg bg-white/10 px-6 py-3 font-semibold backdrop-blur transition hover:bg-white/20 disabled:opacity-30"
          >
            ← Prev
          </button>
          <span className="text-sm text-slate-300">
            Slide {index + 1} of {pres.slides.length}
          </span>
          <button
            onClick={() => goto(index + 1)}
            disabled={index === pres.slides.length - 1}
            className="rounded-lg bg-quorum-500 px-6 py-3 font-semibold transition hover:bg-quorum-600 disabled:opacity-30"
          >
            Next →
          </button>
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">
          Everyone who opened the join link follows your slide automatically.
        </p>
      </div>
    </div>
  );
}

export default PresentationPresent;
