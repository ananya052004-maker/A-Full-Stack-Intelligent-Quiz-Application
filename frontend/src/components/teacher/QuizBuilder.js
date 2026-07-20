import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import QuestionForm from './QuestionForm';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function QuizBuilder() {
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [questions, setQuestions] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [title, setTitle] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [createdId, setCreatedId] = useState(null);
  const [copied, setCopied] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/teacher/categories`, { withCredentials: true });
      setCategories(res.data);
      if (res.data.length && !category) setCategory(res.data[0]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load categories.');
    }
  }, [category]);

  const loadQuestions = useCallback(async () => {
    if (!category) return;
    try {
      const res = await axios.get(`${API}/teacher/questions`, {
        params: { category },
        withCredentials: true,
      });
      setQuestions(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load questions.');
    }
  }, [category]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);
  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const saveEdit = async (id, data) => {
    await axios.put(`${API}/teacher/questions/${id}`, data, { withCredentials: true });
    setEditingId(null);
    loadQuestions();
  };

  const create = async () => {
    setError('');
    if (!title.trim()) return setError('Give your quiz a title.');
    if (selected.size === 0) return setError('Select at least one question.');
    try {
      const res = await axios.post(
        `${API}/teacher/quizzes`,
        { title: title.trim(), category, questionIds: [...selected] },
        { withCredentials: true }
      );
      setCreatedId(res.data.id);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create quiz.');
    }
  };

  const shareLink = createdId ? `${window.location.origin}/take/${createdId}` : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  // Success state
  if (createdId) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
        <div className="text-5xl">🎉</div>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slateink">Quiz created!</h1>
        <p className="mt-2 text-slate-600">Share this link — students and guests can take it.</p>
        <div className="mt-6 flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2">
          <input readOnly value={shareLink} className="w-full bg-transparent px-2 text-sm text-slate-600 outline-none" />
          <button onClick={copy} className="shrink-0 rounded-md bg-quorum-500 px-4 py-2 text-sm font-semibold text-white">
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <div className="mt-8 flex justify-center gap-3">
          <Link to={`/take/${createdId}`} className="rounded-lg border border-slate-300 px-5 py-2.5 font-semibold text-slateink hover:bg-white">
            Preview quiz
          </Link>
          <Link to="/teacher" className="rounded-lg bg-slateink px-5 py-2.5 font-semibold text-white">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <Link to="/teacher" className="text-sm font-semibold text-quorum-600">
        ← Dashboard
      </Link>
      <h1 className="text-3xl font-extrabold tracking-tight text-slateink">Build a Quiz</h1>
      <p className="mt-1 text-slate-600">Choose a topic, pick questions from the bank, and share.</p>

      {/* Quiz meta */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <input
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-slateink outline-none focus:border-quorum-500 focus:ring-2 focus:ring-quorum-100"
          placeholder="Quiz title (e.g. Chapter 3 Review)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setSelected(new Set());
          }}
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-slateink outline-none focus:border-quorum-500"
        >
          {categories.length === 0 && <option value="">No categories yet</option>}
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="mt-4 rounded-lg bg-rose-50 px-4 py-2.5 text-sm text-rose-600">{error}</div>}

      {/* Selectable questions */}
      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Questions in {category || '—'}
        </h2>
        <span className="text-sm font-semibold text-quorum-600">{selected.size} selected</span>
      </div>

      <div className="mt-3 space-y-2">
        {questions.length === 0 && (
          <p className="rounded-lg bg-slate-50 py-8 text-center text-slate-400">
            No questions in this topic.{' '}
            <Link to="/teacher/questions" className="font-semibold text-quorum-600">
              Add some in the Question Bank.
            </Link>
          </p>
        )}
        {questions.map((q, idx) =>
          editingId === q.id ? (
            <QuestionForm
              key={q.id}
              initial={{
                question: q.question,
                options: [...q.options, '', '', '', ''].slice(0, 4),
                correctAnswer: q.correctAnswer,
                category: q.category,
              }}
              categories={categories}
              onSave={(data) => saveEdit(q.id, data)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <label
              key={q.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                selected.has(q.id) ? 'border-quorum-400 bg-quorum-50' : 'border-slate-200 bg-white'
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(q.id)}
                onChange={() => toggle(q.id)}
                className="mt-1 h-4 w-4 shrink-0 accent-quorum-500"
              />
              <div className="flex-1">
                <p className="font-semibold text-slateink">
                  {idx + 1}. {q.question}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Correct: <span className="font-medium text-green-600">{q.correctAnswer}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setEditingId(q.id);
                }}
                className="shrink-0 rounded-md px-3 py-1 text-sm font-semibold text-quorum-600 hover:bg-quorum-100"
              >
                Edit
              </button>
            </label>
          )
        )}
      </div>

      {/* Create */}
      <div className="sticky bottom-4 mt-8">
        <button
          onClick={create}
          disabled={selected.size === 0 || !title.trim()}
          className="w-full rounded-lg bg-quorum-500 px-6 py-3 text-lg font-semibold text-white shadow-card transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Create quiz with {selected.size} question{selected.size === 1 ? '' : 's'}
        </button>
      </div>
    </div>
  );
}

export default QuizBuilder;
