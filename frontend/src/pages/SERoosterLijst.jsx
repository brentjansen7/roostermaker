import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { seRoostersApi } from '../api/client.js';
import { toonToast } from '../components/Toast.jsx';

export default function SERoosterLijst() {
  const [roosters, setRoosters] = useState([]);
  const [nieuwNaam, setNieuwNaam] = useState('');
  const [toonFormulier, setToonFormulier] = useState(false);

  useEffect(() => {
    seRoostersApi.lijst().then(setRoosters).catch(() => {});
  }, []);

  async function aanmaken(e) {
    e.preventDefault();
    if (!nieuwNaam.trim()) return;
    try {
      const rooster = await seRoostersApi.aanmaken({ naam: nieuwNaam.trim() });
      setRoosters(prev => [rooster, ...prev]);
      setNieuwNaam('');
      setToonFormulier(false);
      toonToast('SE Rooster aangemaakt', 'succes');
    } catch (err) {
      toonToast(err.message, 'fout');
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">SE Herkansingen</h1>
          <p className="text-slate-500 text-sm mt-1">{roosters.length} roosters</p>
        </div>
        <button onClick={() => setToonFormulier(!toonFormulier)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
          + Nieuw rooster
        </button>
      </div>

      {toonFormulier && (
        <form onSubmit={aanmaken} className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex gap-3">
          <input value={nieuwNaam} onChange={e => setNieuwNaam(e.target.value)}
            placeholder="bijv. SE Herkansingen Januari 2026"
            className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Aanmaken</button>
        </form>
      )}

      <div className="grid gap-3">
        {roosters.map(r => (
          <Link key={r.id} to={`/se-roosters/${r.id}`}
            className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900">{r.naam}</p>
              <p className="text-sm text-slate-400 mt-0.5">{r.schooljaar}</p>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span>{r._count?.inschrijvingen || 0} inschrijvingen</span>
              <span>{r._count?.lessen || 0} lessen</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                r.status === 'gepubliceerd' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
              }`}>{r.status}</span>
              <span className="text-blue-600">→</span>
            </div>
          </Link>
        ))}
        {roosters.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <p className="text-4xl mb-3">📝</p>
            <p>Nog geen SE roosters. Maak er een aan!</p>
          </div>
        )}
      </div>
    </div>
  );
}
