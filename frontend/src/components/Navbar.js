import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import features from '../data/features';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, loading, isTeacher, login, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinkClass = ({ isActive }) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-quorum-500 text-white'
        : 'text-slate-200 hover:text-white hover:bg-slateink-700'
    }`;

  const topLinks = [
    { key: 'home', name: 'Home', path: '/' },
    ...features,
    ...(isTeacher ? [{ key: 'teacher', name: 'Teacher', path: '/teacher' }] : []),
  ];

  const RoleBadge = () =>
    user?.role ? (
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
          isTeacher ? 'bg-amber-400 text-slateink' : 'bg-quorum-400 text-white'
        }`}
      >
        {user.role}
      </span>
    ) : null;

  const authArea = (
    <>
      {loading ? (
        <span className="text-sm text-slate-300">Loading…</span>
      ) : user ? (
        <div className="flex items-center gap-3">
          <div className="text-right leading-tight">
            <div className="flex items-center justify-end gap-2">
              <span className="text-sm font-semibold text-white">{user.name}</span>
              <RoleBadge />
            </div>
            <div className="text-xs text-slate-400">{user.email}</div>
          </div>
          <button
            onClick={logout}
            className="rounded-md border border-slate-500 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-white hover:text-white"
          >
            Logout
          </button>
        </div>
      ) : (
        <button
          onClick={login}
          className="rounded-md bg-white px-4 py-1.5 text-sm font-semibold text-slateink transition-transform hover:scale-105"
        >
          Sign In
        </button>
      )}
    </>
  );

  return (
    <nav className="sticky top-0 z-50 bg-slateink shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-quorum-400 to-quorum-600 text-lg font-black text-white">
            Q
          </span>
          <span className="text-xl font-extrabold tracking-tight text-white">Quorum</span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {topLinks.map((item) => (
            <NavLink key={item.key} to={item.path} end={item.path === '/'} className={navLinkClass}>
              {item.name}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center lg:flex">{authArea}</div>

        <button
          className="rounded-md p-2 text-slate-200 hover:bg-slateink-700 lg:hidden"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
            />
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-slateink-700 px-4 pb-4 lg:hidden">
          <div className="flex flex-col gap-1 pt-2">
            {topLinks.map((item) => (
              <NavLink
                key={item.key}
                to={item.path}
                end={item.path === '/'}
                className={navLinkClass}
                onClick={() => setMenuOpen(false)}
              >
                {item.name}
              </NavLink>
            ))}
          </div>
          <div className="mt-3 border-t border-slateink-700 pt-3">{authArea}</div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
