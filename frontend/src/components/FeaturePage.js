import React from 'react';
import { Link } from 'react-router-dom';
import features from '../data/features';

function FeaturePage({ feature }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      {/* Hero for this feature */}
      <div className="animate-fade-up text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-quorum-400 to-quorum-600 text-4xl shadow-card">
          {feature.icon}
        </div>
        <span className="mt-6 inline-block rounded-full bg-quorum-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-quorum-600">
          Coming soon
        </span>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slateink sm:text-5xl">
          {feature.name}
        </h1>
        <p className="mt-3 text-lg font-medium text-quorum-600">{feature.tagline}</p>
        <p className="mx-auto mt-4 max-w-xl text-slate-600">{feature.description}</p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/category"
            className="rounded-lg bg-quorum-500 px-6 py-3 font-semibold text-white shadow-card transition-transform hover:scale-105"
          >
            Try the live Quiz today
          </Link>
          <Link
            to="/"
            className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slateink transition-colors hover:bg-white"
          >
            Back home
          </Link>
        </div>
      </div>

      {/* Explore other features */}
      <div className="mt-16">
        <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-slate-400">
          Explore what Quorum can do
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const active = f.key === feature.key;
            return (
              <Link
                key={f.key}
                to={f.path}
                className={`group rounded-xl border p-5 transition-all hover:-translate-y-1 hover:shadow-card ${
                  active
                    ? 'border-quorum-400 bg-quorum-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{f.icon}</span>
                  {f.ready ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-green-700">
                      Live
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                      Soon
                    </span>
                  )}
                </div>
                <h3 className="mt-3 font-bold text-slateink">{f.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{f.tagline}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default FeaturePage;
