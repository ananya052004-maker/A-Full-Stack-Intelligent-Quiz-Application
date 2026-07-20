import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import SlideRenderer from './SlideRenderer';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Participant view: follows whatever slide the presenter is on.
function PresentationView() {
  const { id } = useParams();
  const [pres, setPres] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/presentations/${id}`);
      setPres(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load presentation.');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Follow the presenter: re-check the current slide every 2s.
  useEffect(() => {
    const timer = setInterval(load, 2000);
    return () => clearInterval(timer);
  }, [load]);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <p className="text-rose-600">{error}</p>
        <Link to="/" className="mt-4 inline-block font-semibold text-quorum-600">
          ← Home
        </Link>
      </div>
    );
  }
  if (!pres) {
    return <div className="mx-auto max-w-2xl px-4 py-20 text-center text-slate-500">Loading…</div>;
  }

  const slide = pres.slides[pres.currentIndex];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-quorum-600">
          Live presentation
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-slateink">{pres.title}</h1>
        {pres.slides.length > 0 && (
          <p className="mt-1 text-sm text-slate-500">
            Slide {pres.currentIndex + 1} of {pres.slides.length}
          </p>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
        {slide ? (
          <SlideRenderer slide={slide} />
        ) : (
          <p className="py-10 text-center text-slate-400">
            Waiting for the presenter to start…
          </p>
        )}
      </div>
      <p className="mt-4 text-center text-xs text-slate-400">
        Your screen follows the presenter automatically.
      </p>
    </div>
  );
}

export default PresentationView;
