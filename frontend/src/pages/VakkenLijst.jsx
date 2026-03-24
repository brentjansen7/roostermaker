import { useState, useEffect } from 'react';
import { vakkenApi } from '../api/client.js';
import { toonToast } from '../components/Toast.jsx';

const PRIORITEIT_LABELS = { 1: 'Hoog', 2: 'Normaal', 3: 'Laag' };
const PRIORITEIT_KLEUREN = {
  1: 'bg-red-100 text-red-700',
  2: 'bg-slate-100 text-slate-600',
  3: 'bg-slate-50 text-slate-400',
};

export default function VakkenLijst() {
  const [vakken, setVakken] = useState([]);
  const [bewerkId, setBewerkId] = useState(null);
  const [bewerkPrioriteit, setBewerkPrioriteit] = useState(2);

  useEffect(() => {
    vakkenApi.lijst().then(setVakken).catch(() => {});
  }, []);

  async function slaOpPrioriteit(vak) {
    try {
      await vakkenApi.bewerken(vak.id, { code: vak.code, naam: vak.naam, isSeVak: vak.isSeVak, prioriteit: bewerkPrioriteit });
      setVakken(prev => prev.map(v => v.id === vak.id ? { ...v, prioriteit: bewerkPrioriteit } : v));
      setBewerkId(null);
      toonToast('Prioriteit opgeslagen', 'succes');
    } catch (err) {
      toonToast(err.message, 'fout');
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Vakken</h1>
        <p className="text-slate-500 text-sm mt-1">{vakken.length} vakken · klik op prioriteit om te wijzigen</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-2.5 text-slate-600 font-medium">Code</th>
              <th className="text-left px-4 py-2.5 text-slate-600 font-medium">Naam</th>
              <th className="text-left px-4 py-2.5 text-slate-600 font-medium">Docenten</th>
              <th className="text-right px-4 py-2.5 text-slate-600 font-medium">Leerlingen</th>
              <th className="text-left px-4 py-2.5 text-slate-600 font-medium">SE</th>
              <th className="text-left px-4 py-2.5 text-slate-600 font-medium">Prioriteit</th>
            </tr>
          </thead>
          <tbody>
            {vakken.map(v => (
              <tr key={v.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2.5 font-mono font-semibold text-slate-800">{v.code}</td>
                <td className="px-4 py-2.5 text-slate-700">{v.naam}</td>
                <td className="px-4 py-2.5 text-xs text-slate-500">
                  {v.docenten?.map(dv => dv.docent?.afkorting).filter(Boolean).join(', ') || '—'}
                </td>
                <td className="px-4 py-2.5 text-right text-slate-500">{v._count?.leerlingen || 0}</td>
                <td className="px-4 py-2.5">
                  {v.isSeVak && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">SE</span>}
                </td>
                <td className="px-4 py-2.5">
                  {bewerkId === v.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={bewerkPrioriteit}
                        onChange={e => setBewerkPrioriteit(parseInt(e.target.value))}
                        className="text-xs border border-slate-300 rounded px-2 py-1"
                        autoFocus
                      >
                        <option value={1}>1 — Hoog (examens)</option>
                        <option value={2}>2 — Normaal</option>
                        <option value={3}>3 — Laag</option>
                      </select>
                      <button onClick={() => slaOpPrioriteit(v)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded">OK</button>
                      <button onClick={() => setBewerkId(null)} className="text-xs text-slate-400 px-1">✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setBewerkId(v.id); setBewerkPrioriteit(v.prioriteit ?? 2); }}
                      className={`text-xs px-2 py-0.5 rounded font-medium ${PRIORITEIT_KLEUREN[v.prioriteit ?? 2]}`}
                    >
                      {PRIORITEIT_LABELS[v.prioriteit ?? 2]}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {vakken.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Geen vakken — importeer via CSV</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-slate-400">
        Prioriteit 1 (Hoog) = wordt als eerste ingepland op de beste tijdslots. Gebruik dit voor examens en HAVO 5 SE-vakken.
      </div>
    </div>
  );
}
