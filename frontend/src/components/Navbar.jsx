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
        onClick={uitloggen}
        className="mt-4 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-left transition-colors"
      >
        Uitloggen
      </button>
    </nav>
  );
}
