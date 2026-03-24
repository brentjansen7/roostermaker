import { useState, useEffect } from 'react';
import { lokalenApi } from '../api/client.js';
import { toonToast } from '../components/Toast.jsx';

export default function LokalenLijst() {
  const [lokalen, setLokalen] = useState([]);
  const [nieuw, setNieuw] = useState({ code: '', naam: '', capaciteit: 30, type: 'normaal' });
  const [toonFormulier, setToonFormulier] = useState(false);

  useEffect(() => {
    lokalenApi.lijst().then(setLokalen).catch(() => {});
  }, []);

  async function opslaan(e) {
    e.preventDefault();
    try {
      const lokaal = await lokalenApi.aanmaken(nieuw);
      setLokalen(prev => [...prev, lokaal]);
      setNieuw({ code: '', naam: '', capaciteit: 30, type: 'normaal' });
      setToonFormulier(false);
      toonToast('Lokaal toegevoegd', 'succes');
    } catch (err) {
      toonToast(err.message, 'fout');
    }
  }

  const typeKleuren = {
    normaal: 'bg-slate-100 text-slate-700',
    gym: 'bg-green-100 text-green-700',
    lab: 'bg-purple-100 text-purple-700',
    aula: 'bg-yellow-100 text-yellow-700',
    ict: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lokalen</h1>
          <p className="text-slate-500 text-sm mt-1">{lokalen.length} lokalen</p>
        </div>
        <button
          onClick={() => setToonFormulier(!toonFormulier)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          + Lokaal toevoegen
        </button>
      </div>

      {toonFormulier && (
        <form onSubmit={opslaan} className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex gap-3 items-end flex-wrap">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Code *</label>
            <input value={nieuw.code} onChange={e => setNieuw(p => ({...p, code: e.target.value}))}
              placeholder="A01" className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-20" required />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Naam</label>
            <input value={nieuw.naam} onChange={e => setNieuw(p => ({...p, naam: e.target.value}))}
              placeholder="Lokaal A01" className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-36" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Capaciteit</label>
            <input type="number" value={nieuw.capaciteit} onChange={e => setNieuw(p => ({...p, capaciteit: parseInt(e.target.value)}))}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-20" min={1} />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Type</label>
            <select value={nieuw.type} onChange={e => setNieuw(p => ({...p, type: e.target.value}))}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="normaal">Normaal</option>
              <option value="gym">Gym</option>
              <option value="lab">Lab</option>
              <option value="aula">Aula</option>
              <option value="ict">ICT</option>
            </select>
          </div>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Opslaan</button>
          <button type="button" onClick={() => setToonFormulier(false)} className="text-slate-400 text-sm px-2">Annuleren</button>
        </form>
      )}

      <div className="grid grid-cols-3 gap-3">
        {lokalen.map(l => (
          <div key={l.id} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="font-bold text-slate-900">{l.code}</p>
              <span className={`text-xs px-2 py-0.5 rounded ${typeKleuren[l.type] || typeKleuren.normaal}`}>{l.type}</span>
            </div>
            {l.naam && <p className="text-sm text-slate-500">{l.naam}</p>}
            <p className="text-sm text-slate-600 mt-1">Capaciteit: <span className="font-medium">{l.capaciteit}</span></p>
          </div>
        ))}
      </div>
    </div>
  );
}
