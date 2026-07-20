import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function QuizList() {
  const { isTeacher } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API}/quizzes`)
      .then((res) => setQuizzes(res.data))
      .catch(() => setQuizzes([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slateink sm:text-4xl">Quizzes</h1>
          <p className="mt-1 text-slate-600">Take a quiz created by a teacher, or practice by topic.</p>
        </div>
        {isTeacher && (
          <Link
            to="/teacher/quizzes/new"
            className="rounded-lg bg-quorum-500 px-5 py-2.5 font-semibold text-white shadow-card transition-transform hover:scale-105"
          >
            + Build a Quiz
          </Link>
        )}
      </div>

      {/* Teacher-created quizzes */}
      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Available quizzes
      </h2>
      {loading ? (
        <p className="mt-4 text-slate-500">Loading…</p>
      ) : quizzes.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center">
          <p className="text-slate-500">No quizzes have been created yet.</p>
          {isTeacher && (
            <Link
              to="/teacher/quizzes/new"
              className="mt-4 inline-block rounded-lg bg-quorum-500 px-6 py-3 font-semibold text-white"
            >
              Build the first quiz
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((q) => (
            <div key={q.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <span className="w-fit rounded-full bg-quorum-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase text-quorum-600">
                {q.category}
              </span>
              <h3 className="mt-3 text-lg font-bold text-slateink">{q.title}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {q.question_count} question{q.question_count === 1 ? '' : 's'}
                {q.creator ? ` · by ${q.creator}` : ''}
              </p>
              <div className="mt-4 flex gap-2">
                <Link
                  to={`/take/${q.id}`}
                  className="flex-1 rounded-lg bg-quorum-500 px-4 py-2 text-center text-sm font-semibold text-white transition-transform hover:scale-105"
                >
                  Take quiz
                </Link>
                <Link
                  to={`/take/${q.id}?tab=leaderboard`}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slateink hover:bg-slate-50"
                >
                  🏆
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Practice mode */}
      <h2 className="mt-14 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Practice by topic
      </h2>
      <Link
        to="/category"
        className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition-all hover:-translate-y-1 hover:border-quorum-300"
      >
        <div>
          <h3 className="text-lg font-bold text-slateink">Quick practice</h3>
          <p className="text-sm text-slate-500">
            Jump into a set of questions by topic — Sports, History, Science, and more.
          </p>
        </div>
        <span className="text-2xl text-quorum-500">→</span>
      </Link>
    </div>
  );
}

export default QuizList;
