import { useState } from 'react';
import { authApi } from '../api/client.js';
import { toonToast } from '../components/Toast.jsx';

export default function Login({ onInloggen }) {
  const [wachtwoord, setWachtwoord] = useState('');
  const [laden, setLaden] = useState(false);
  const [toonWachtwoord, setToonWachtwoord] = useState(false);

  async function verstuur(e) {
    e.preventDefault();
    setLaden(true);
    try {
      await authApi.login(wachtwoord);
      onInloggen?.();
    } catch (err) {
      toonToast(err.message || 'Verkeerd wachtwoord', 'fout');
    } finally {
      setLaden(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Roosterplanner</h1>
        <p className="text-slate-500 text-sm mb-6">Log in om verder te gaan</p>
        <form onSubmit={verstuur} className="flex flex-col gap-4">
          <div className="relative">
            <input
              type={toonWachtwoord ? 'text' : 'password'}
              placeholder="Wachtwoord"
              value={wachtwoord}
              onChange={e => setWachtwoord(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setToonWachtwoord(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs select-none"
            >
              {toonWachtwoord ? 'Verberg' : 'Toon'}
            </button>
          </div>
          <button
            type="submit"
            disabled={laden}
            className="bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {laden ? 'Bezig...' : 'Inloggen'}
          </button>
        </form>
        <p className="text-xs text-slate-400 mt-4 text-center">Wachtwoord: <strong>krimpen2026</strong></p>
      </div>
    </div>
  );
}
