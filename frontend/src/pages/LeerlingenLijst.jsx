import { useState, useEffect } from 'react';
import { leerlingenApi } from '../api/client.js';
import { toonToast } from '../components/Toast.jsx';

export default function LeerlingenLijst() {
  const [leerlingen, setLeerlingen] = useState([]);
  const [zoek, setZoek] = useState('');
  const [filterKlas, setFilterKlas] = useState('');
  const [klassen, setKlassen] = useState([]);

  useEffect(() => {
    leerlingenApi.lijst().then(setLeerlingen).catch(() => {});
    leerlingenApi.klassen().then(setKlassen).catch(() => {});
  }, []);

  const gefilterd = leerlingen.filter(l =>
    (!zoek || l.naam.toLowerCase().includes(zoek.toLowerCase())) &&
    (!filterKlas || l.klas === filterKlas)
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leerlingen</h1>
          <p className="text-slate-500 text-sm mt-1">{leerlingen.length} leerlingen</p>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Zoek op naam..."
          value={zoek}
          onChange={e => setZoek(e.target.value)}
          className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
        <select
          value={filterKlas}
          onChange={e => setFilterKlas(e.target.value)}
          className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Alle klassen</option>
          {klassen.map(k => (
            <option key={k.klas} value={k.klas}>{k.klas}</option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-2.5 text-slate-600 font-medium">Naam</th>
              <th className="text-left px-4 py-2.5 text-slate-600 font-medium">Klas</th>
              <th className="text-left px-4 py-2.5 text-slate-600 font-medium">Niveau</th>
              <th className="text-right px-4 py-2.5 text-slate-600 font-medium">Vakken</th>
              <th className="text-left px-4 py-2.5 text-slate-600 font-medium">Stamnummer</th>
            </tr>
          </thead>
          <tbody>
            {gefilterd.map(l => (
              <tr key={l.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium text-slate-800">{l.naam}</td>
                <td className="px-4 py-2.5 text-slate-600">{l.klas}</td>
                <td className="px-4 py-2.5">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    l.niveau === 'vwo' ? 'bg-purple-100 text-purple-700' :
                    l.niveau === 'havo' ? 'bg-blue-100 text-blue-700' :
                    'bg-green-100 text-green-700'
                  }`}>{l.niveau}</span>
                </td>
                <td className="px-4 py-2.5 text-right text-slate-500">{l._count?.vakken || 0}</td>
                <td className="px-4 py-2.5 text-slate-400 text-xs">{l.magisterNummer}</td>
              </tr>
            ))}
            {gefilterd.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Geen leerlingen gevonden</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
