import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

function ChooseRole() {
  const { user, chooseRole } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async (role) => {
    setBusy(true);
    setError('');
    try {
      await chooseRole(role);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save your role. Try again.');
      setBusy(false);
    }
  };

  const card = (role, icon, title, desc) => (
    <button
      onClick={() => pick(role)}
      disabled={busy}
      className="group flex-1 rounded-2xl border-2 border-slate-200 bg-white p-8 text-center transition-all hover:-translate-y-1 hover:border-quorum-400 hover:shadow-card disabled:opacity-60"
    >
      <div className="text-5xl">{icon}</div>
      <h3 className="mt-4 text-xl font-bold text-slateink group-hover:text-quorum-600">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{desc}</p>
    </button>
  );

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-14">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-slateink sm:text-4xl">
          Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
        </h1>
        <p className="mt-3 text-slate-600">
          One quick thing — how will you be using Quorum? You can't change this later without an
          admin, so pick the one that fits.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          {card('teacher', '🧑‍🏫', 'Teacher', 'Manage the question bank and build quizzes to share.')}
          {card('student', '🎓', 'Student', 'Take quizzes shared with you and track your scores.')}
        </div>

        {error && <p className="mt-6 text-sm text-rose-600">{error}</p>}
      </div>
    </div>
  );
}

export default ChooseRole;
