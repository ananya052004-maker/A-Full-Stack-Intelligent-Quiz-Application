import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { getVoterToken } from '../../utils/token';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const TYPE_META = {
  info: { icon: '📄', label: 'Info slide' },
  poll: { icon: '📊', label: 'Poll' },
  word_cloud: { icon: '☁️', label: 'Word Cloud' },
  survey: { icon: '📝', label: 'Survey' },
};

function PresentationEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pres, setPres] = useState(null);
  const [error, setError] = useState('');
  const [draftType, setDraftType] = useState('info');
  const [busy, setBusy] = useState(false);

  // Draft fields for the different slide types
  const [heading, setHeading] = useState('');
  const [body, setBody] = useState('');
  const [question, setQuestion] = useState('');
  const [optionsText, setOptionsText] = useState('');
  const [prompt, setPrompt] = useState('');
  const [maxWords, setMaxWords] = useState(3);
  const [surveyMode, setSurveyMode] = useState('rating');

  const ownerToken = getVoterToken();

  const load = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/presentations/${id}`, { params: { ownerToken } });
      setPres(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load this presentation.');
    }
  }, [id, ownerToken]);

  useEffect(() => {
    load();
  }, [load]);

  const resetDraft = () => {
    setHeading('');
    setBody('');
    setQuestion('');
    setOptionsText('');
    setPrompt('');
    setMaxWords(3);
    setSurveyMode('rating');
  };

  const addSlide = async () => {
    setError('');
    setBusy(true);
    try {
      let type = draftType;
      let refId = null;
      let config = null;

      if (draftType === 'info') {
        if (!heading.trim()) throw new Error('Enter a heading for the info slide.');
        config = { heading: heading.trim(), body: body.trim() };
      } else if (draftType === 'poll') {
        const options = optionsText.split(/[,\n]/).map((o) => o.trim()).filter(Boolean);
        if (!question.trim()) throw new Error('Enter the poll question.');
        if (options.length < 2) throw new Error('Enter at least 2 poll options (comma-separated).');
        const r = await axios.post(`${API}/polls`, { question: question.trim(), options });
        refId = r.data.id;
      } else if (draftType === 'word_cloud') {
        if (!prompt.trim()) throw new Error('Enter the word cloud prompt.');
        const r = await axios.post(`${API}/wordclouds`, { prompt: prompt.trim(), maxWords });
        refId = r.data.id;
      } else if (draftType === 'survey') {
        if (!question.trim()) throw new Error('Enter the survey question.');
        const r = await axios.post(`${API}/surveys`, {
          question: question.trim(),
          mode: surveyMode,
          scale: 5,
        });
        refId = r.data.id;
      }

      await axios.post(`${API}/presentations/${id}/slides`, { type, refId, config, ownerToken });
      resetDraft();
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to add slide.');
    } finally {
      setBusy(false);
    }
  };

  if (error && !pres) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <p className="text-rose-600">{error}</p>
        <Link to="/features/presentations" className="mt-4 inline-block font-semibold text-quorum-600">
          ← Create a new presentation
        </Link>
      </div>
    );
  }
  if (!pres) {
    return <div className="mx-auto max-w-2xl px-4 py-20 text-center text-slate-500">Loading…</div>;
  }

  const inputCls =
    'w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slateink outline-none transition focus:border-quorum-500 focus:ring-2 focus:ring-quorum-100';

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-quorum-600">
            Editing presentation
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-slateink sm:text-3xl">
            {pres.title}
          </h1>
        </div>
        <button
          onClick={() => navigate(`/features/presentations/${id}/present`)}
          disabled={pres.slides.length === 0}
          className="rounded-lg bg-quorum-500 px-6 py-3 font-semibold text-white shadow-card transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ▶ Start presenting
        </button>
      </div>

      {/* Existing slides */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Slides ({pres.slides.length})
        </h2>
        <div className="mt-3 space-y-2">
          {pres.slides.length === 0 && (
            <p className="rounded-lg bg-slate-50 py-6 text-center text-slate-400">
              No slides yet — add your first below.
            </p>
          )}
          {pres.slides.map((s, i) => (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-500">
                {i + 1}
              </span>
              <span className="text-xl">{TYPE_META[s.type].icon}</span>
              <span className="font-semibold text-slateink">{TYPE_META[s.type].label}</span>
              {s.config?.heading && (
                <span className="truncate text-sm text-slate-500">— {s.config.heading}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add slide */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <h2 className="font-bold text-slateink">Add a slide</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(TYPE_META).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => setDraftType(key)}
              className={`rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-colors ${
                draftType === key
                  ? 'border-quorum-500 bg-quorum-50 text-quorum-700'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {meta.icon} {meta.label}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          {draftType === 'info' && (
            <>
              <input className={inputCls} placeholder="Heading" value={heading} onChange={(e) => setHeading(e.target.value)} />
              <textarea className={inputCls} rows={2} placeholder="Body (optional)" value={body} onChange={(e) => setBody(e.target.value)} />
            </>
          )}
          {draftType === 'poll' && (
            <>
              <input className={inputCls} placeholder="Poll question" value={question} onChange={(e) => setQuestion(e.target.value)} />
              <textarea className={inputCls} rows={3} placeholder="Options, comma or newline separated" value={optionsText} onChange={(e) => setOptionsText(e.target.value)} />
            </>
          )}
          {draftType === 'word_cloud' && (
            <>
              <input className={inputCls} placeholder="Word cloud prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
              <label className="block text-sm text-slate-600">
                Words per person: <span className="font-semibold text-quorum-600">{maxWords}</span>
                <input type="range" min="1" max="10" value={maxWords} onChange={(e) => setMaxWords(Number(e.target.value))} className="mt-1 w-full accent-quorum-500" />
              </label>
            </>
          )}
          {draftType === 'survey' && (
            <>
              <input className={inputCls} placeholder="Survey question" value={question} onChange={(e) => setQuestion(e.target.value)} />
              <div className="flex gap-2">
                {['rating', 'text'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSurveyMode(m)}
                    className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-colors ${
                      surveyMode === m ? 'border-quorum-500 bg-quorum-50 text-quorum-700' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    {m === 'rating' ? '⭐ Rating scale' : '💭 Open text'}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {error && <div className="mt-4 rounded-lg bg-rose-50 px-4 py-2.5 text-sm text-rose-600">{error}</div>}

        <button
          onClick={addSlide}
          disabled={busy}
          className="mt-5 w-full rounded-lg bg-slateink px-6 py-3 font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-60"
        >
          {busy ? 'Adding…' : '+ Add slide'}
        </button>
      </div>
    </div>
  );
}

export default PresentationEdit;
