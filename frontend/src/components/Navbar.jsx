import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { authApi } from '../api/client.js';
import { toonToast } from './Toast.jsx';

const LINKS = [
  { pad: '/', label: 'Dashboard' },
  { pad: '/import', label: 'Importeren' },
  { pad: '/se-roosters', label: 'SE Herkansingen' },
  { pad: '/toetsweken', label: 'Toetsweken' },
  { pad: '/schoolroosters', label: 'Schoolrooster' },
  { pad: '/leerlingen', label: 'Leerlingen' },
  { pad: '/docenten', label: 'Docenten' },
  { pad: '/vakken', label: 'Vakken' },
  { pad: '/lokalen', label: 'Lokalen' },
];

export default function Navbar() {
  const navigate = useNavigate();
  const [toonWachtwoordForm, setToonWachtwoordForm] = useState(false);
  const [wwForm, setWwForm] = useState({ huidig: '', nieuw: '', bevestig: '' });

  async function wijzigWachtwoord(e) {
    e.preventDefault();
    if (wwForm.nieuw !== wwForm.bevestig) {
      toonToast('Wachtwoorden komen niet overeen', 'fout');
      return;
    }
    try {
      await authApi.wachtwoordWijzigen({ huidig: wwForm.huidig, nieuw: wwForm.nieuw });
      toonToast('Wachtwoord gewijzigd', 'succes');
      setToonWachtwoordForm(false);
      setWwForm({ huidig: '', nieuw: '', bevestig: '' });
    } catch (err) {
      toonToast(err.message, 'fout');
    }
  }

  async function uitloggen() {
    await authApi.logout();
    navigate('/login');
  }

  return (
    <nav className="w-56 min-h-screen bg-slate-900 text-white flex flex-col py-6 px-3 shrink-0">
      <div className="mb-8 px-2">
        <h1 className="text-lg font-bold text-white">Roosterplanner</h1>
        <p className="text-xs text-slate-400 mt-0.5">Schoolrooster software</p>
      </div>

      <div className="flex-1 flex flex-col gap-0.5">
        {LINKS.map(link => (
          <NavLink
            key={link.pad}
            to={link.pad}
            end={link.pad === '/'}
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </div>

      <button
        onClick={() => setToonWachtwoordForm(!toonWachtwoordForm)}
        className="mt-1 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-left transition-colors"
      >
        Wachtwoord
      </button>

      {toonWachtwoordForm && (
        <form onSubmit={wijzigWachtwoord} className="bg-slate-800 rounded-lg p-3 mt-1 flex flex-col gap-2">
          <input
            type="password" placeholder="Huidig" value={wwForm.huidig}
            onChange={e => setWwForm(p => ({...p, huidig: e.target.value}))}
            className="bg-slate-700 text-white text-xs rounded px-2 py-1.5 placeholder-slate-400 focus:outline-none"
            required
          />
          <input
            type="password" placeholder="Nieuw (min. 6)" value={wwForm.nieuw}
            onChange={e => setWwForm(p => ({...p, nieuw: e.target.value}))}
            className="bg-slate-700 text-white text-xs rounded px-2 py-1.5 placeholder-slate-400 focus:outline-none"
            required minLength={6}
          />
          <input
            type="password" placeholder="Bevestig nieuw" value={wwForm.bevestig}
            onChange={e => setWwForm(p => ({...p, bevestig: e.target.value}))}
            className="bg-slate-700 text-white text-xs rounded px-2 py-1.5 placeholder-slate-400 focus:outline-none"
            required
          />
          <button type="submit" className="bg-blue-600 text-white text-xs rounded px-2 py-1.5 hover:bg-blue-700">
            Opslaan
          </button>
        </form>
      )}

      <button
        onClick={uitloggen}
        className="mt-4 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-left transition-colors"
      >
        Uitloggen
      </button>
    </nav>
  );
}
