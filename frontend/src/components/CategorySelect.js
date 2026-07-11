import React from 'react';
import { useNavigate } from 'react-router-dom';

const categories = [
  { name: 'Sports', icon: '⚽', gradient: 'from-emerald-400 to-emerald-600' },
  { name: 'History', icon: '🏛️', gradient: 'from-amber-400 to-amber-600' },
  { name: 'Science', icon: '🔬', gradient: 'from-sky-400 to-sky-600' },
  { name: 'Cinema', icon: '🎬', gradient: 'from-rose-400 to-rose-600' },
];

function CategorySelect() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold tracking-tight text-slateink sm:text-4xl">
          Select a Category
        </h2>
        <p className="mt-2 text-slate-600">Pick a topic and test your knowledge.</p>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {categories.map((cat) => (
          <button
            key={cat.name}
            onClick={() => navigate(`/quiz/${cat.name}`)}
            className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-card transition-all hover:-translate-y-1 hover:border-quorum-300"
          >
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${cat.gradient} text-2xl shadow`}
            >
              {cat.icon}
            </span>
            <div>
              <div className="text-lg font-bold text-slateink group-hover:text-quorum-600">
                {cat.name}
              </div>
              <div className="text-sm text-slate-500">10 questions</div>
            </div>
            <span className="ml-auto text-2xl text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-quorum-500">
              →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default CategorySelect;
