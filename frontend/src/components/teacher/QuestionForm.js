import React, { useState } from 'react';

// Shared add/edit form for a single question. Used by the Question Bank and
// the Quiz Builder (inline editing while choosing questions).
function QuestionForm({ initial, categories, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');

  const setOption = (i, v) =>
    setForm((f) => {
      const options = f.options.map((o, idx) => (idx === i ? v : o));
      const correctAnswer = f.correctAnswer === f.options[i] ? v : f.correctAnswer;
      return { ...f, options, correctAnswer };
    });

  const submit = () => {
    setError('');
    const options = form.options.map((o) => o.trim()).filter(Boolean);
    if (!form.question.trim()) return setError('Enter the question text.');
    if (options.length < 2) return setError('Enter at least 2 options.');
    if (!form.correctAnswer || !options.includes(form.correctAnswer))
      return setError('Pick which option is the correct answer.');
    if (!form.category.trim()) return setError('Choose or type a category.');
    onSave({ ...form, options });
  };

  const inputCls =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-slateink outline-none transition focus:border-quorum-500 focus:ring-2 focus:ring-quorum-100';

  return (
    <div className="rounded-2xl border-2 border-quorum-200 bg-quorum-50/40 p-5">
      <input
        className={inputCls}
        placeholder="Question text"
        value={form.question}
        onChange={(e) => setForm({ ...form, question: e.target.value })}
      />
      <div className="mt-3 space-y-2">
        {form.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              name="correct"
              checked={!!opt && form.correctAnswer === opt}
              onChange={() => setForm({ ...form, correctAnswer: opt })}
              className="h-4 w-4 accent-quorum-500"
              title="Mark as correct answer"
            />
            <input
              className={inputCls}
              placeholder={`Option ${i + 1}`}
              value={opt}
              onChange={(e) => setOption(i, e.target.value)}
            />
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">Select the radio next to the correct option.</p>

      <div className="mt-3">
        <input
          className={inputCls}
          list="cat-options"
          placeholder="Category (choose existing or type new)"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        />
        <datalist id="cat-options">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      {error && <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}

      <div className="mt-4 flex gap-2">
        <button
          onClick={submit}
          className="rounded-lg bg-quorum-500 px-5 py-2 font-semibold text-white transition-transform hover:scale-105"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-5 py-2 font-semibold text-slateink hover:bg-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default QuestionForm;
