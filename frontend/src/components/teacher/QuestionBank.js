import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import QuestionForm from './QuestionForm';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const empty = { question: '', options: ['', '', '', ''], correctAnswer: '', category: '' };

function QuestionBank() {
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [questions, setQuestions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

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

  const createQ = async (data) => {
    await axios.post(`${API}/teacher/questions`, data, { withCredentials: true });
    setAdding(false);
    if (data.category !== category) {
      await loadCategories();
      setCategory(data.category);
    } else {
      loadQuestions();
    }
  };

  const updateQ = async (id, data) => {
    await axios.put(`${API}/teacher/questions/${id}`, data, { withCredentials: true });
    setEditingId(null);
    loadCategories();
    loadQuestions();
  };

  const deleteQ = async (id) => {
    if (!window.confirm('Delete this question?')) return;
    await axios.delete(`${API}/teacher/questions/${id}`, { withCredentials: true });
    loadQuestions();
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/teacher" className="text-sm font-semibold text-quorum-600">
            ← Dashboard
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight text-slateink">Question Bank</h1>
        </div>
        <button
          onClick={() => {
            setAdding(true);
            setEditingId(null);
          }}
          className="rounded-lg bg-quorum-500 px-5 py-2.5 font-semibold text-white shadow-card transition-transform hover:scale-105"
        >
          + Add question
        </button>
      </div>

      {/* Topic filter */}
      <div className="mt-6 flex items-center gap-3">
        <label className="text-sm font-semibold text-slateink">Topic:</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-slateink outline-none focus:border-quorum-500"
        >
          {categories.length === 0 && <option value="">No categories yet</option>}
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="text-sm text-slate-500">{questions.length} questions</span>
      </div>

      {error && <div className="mt-4 rounded-lg bg-rose-50 px-4 py-2.5 text-sm text-rose-600">{error}</div>}

      {adding && (
        <div className="mt-6">
          <QuestionForm
            initial={{ ...empty, category }}
            categories={categories}
            onSave={createQ}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {/* Question list */}
      <div className="mt-6 space-y-3">
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
              onSave={(data) => updateQ(q.id, data)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-slateink">
                  {idx + 1}. {q.question}
                </h3>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => {
                      setEditingId(q.id);
                      setAdding(false);
                    }}
                    className="rounded-md px-3 py-1 text-sm font-semibold text-quorum-600 hover:bg-quorum-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteQ(q.id)}
                    className="rounded-md px-3 py-1 text-sm text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                {q.options.map((opt) => (
                  <li
                    key={opt}
                    className={`rounded-lg px-3 py-1.5 text-sm ${
                      opt === q.correctAnswer
                        ? 'bg-green-50 font-semibold text-green-700'
                        : 'bg-slate-50 text-slate-600'
                    }`}
                  >
                    {opt === q.correctAnswer ? '✓ ' : ''}
                    {opt}
                  </li>
                ))}
              </ul>
            </div>
          )
        )}
        {questions.length === 0 && !adding && (
          <p className="py-10 text-center text-slate-400">No questions in this topic yet.</p>
        )}
      </div>
    </div>
  );
}

export default QuestionBank;
