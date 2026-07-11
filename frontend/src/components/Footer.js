import React from 'react';
import { Link } from 'react-router-dom';
import features from '../data/features';

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto bg-slateink text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row sm:items-start">
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-quorum-400 to-quorum-600 text-sm font-black text-white">
                Q
              </span>
              <span className="text-lg font-extrabold text-white">Quorum</span>
            </div>
            <p className="mt-2 max-w-xs text-sm text-slate-400">
              Live, interactive sessions where the whole room takes part.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {features.map((f) => (
              <Link
                key={f.key}
                to={f.path}
                className="text-sm text-slate-300 transition-colors hover:text-white"
              >
                {f.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-slateink-700 pt-4 text-center text-xs text-slate-500">
          © {year} Quorum. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default Footer;
