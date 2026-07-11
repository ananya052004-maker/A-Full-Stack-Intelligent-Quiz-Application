import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import features from '../data/features';

function Home() {
  const navigate = useNavigate();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slateink via-slateink-800 to-slateink-900 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-quorum-500/20 blur-3xl" />
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
          <p className="animate-fade-up text-sm font-semibold uppercase tracking-[0.2em] text-quorum-400">
            Test Yourself Today
          </p>
          <h1 className="animate-fade-up mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            Welcome to <span className="text-quorum-400">Quorum</span>
          </h1>
          <p className="animate-fade-up mx-auto mt-5 max-w-2xl text-lg text-slate-300">
            Test your knowledge with exciting general knowledge questions. Quorum records your
            answers, gives instant feedback, and calculates your final score — so you can challenge
            yourself and sharpen your skills in a fun, engaging way.
          </p>
          <div className="animate-fade-up mt-8 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => navigate('/category')}
              className="rounded-lg bg-quorum-500 px-8 py-3 text-lg font-semibold text-white shadow-card transition-transform hover:scale-105"
            >
              Start Quiz
            </button>
            <Link
              to="/features/poll"
              className="rounded-lg border border-slate-500 px-8 py-3 text-lg font-semibold text-white transition-colors hover:bg-white/10"
            >
              Explore features
            </Link>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slateink">
            One platform, every kind of interaction
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            Quizzes today — polls, word clouds, surveys, and live Q&amp;A coming soon. All in one
            place, all in real time.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Link
              key={f.key}
              to={f.path}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition-all hover:-translate-y-1 hover:border-quorum-300"
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl">{f.icon}</span>
                {f.ready ? (
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase text-green-700">
                    Live
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase text-slate-500">
                    Soon
                  </span>
                )}
              </div>
              <h3 className="mt-4 text-lg font-bold text-slateink group-hover:text-quorum-600">
                {f.name}
              </h3>
              <p className="mt-1 text-sm text-slate-500">{f.tagline}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Home;
