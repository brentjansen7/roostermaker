import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { schoolroostersApi } from '../api/client.js';
import { toonToast } from '../components/Toast.jsx';
import RoosterGrid from '../components/RoosterGrid.jsx';

const TIJDOPTIES = ['', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '15:30', '16:00'];

const TABBLADEN = ['Klassen & Lessen', 'Rooster', 'Conflicten', 'Exporteren'];

export default function SchoolroosterDetail() {
  const { id } = useParams();
  const [rooster, setRooster] = useState(null);
  const [actieveTab, setActieveTab] = useState('Rooster');
  const [algoritmeStatus, setAlgoritmeStatus] = useState({ status: 'idle', percent: 0 });
  const [conflicten, setConflicten] = useState([]);
  const [klasEindtijden, setKlasEindtijden] = useState({}); // klasId -> tijdstring
  const pollingRef = useRef(null);

  useEffect(() => {
    laad();
    return () => clearInterval(pollingRef.current);
  }, [id]);

  async function laad() {
    try {
      const r = await schoolroostersApi.ophalen(id);
      setRooster(r);
      // Initialiseer eindtijden vanuit geladen data
      const tijden = {};
      for (const k of r.klassen) tijden[k.id] = k.maxEindtijd || '';
      setKlasEindtijden(tijden);
      // Laad conflicten
      const c = await schoolroostersApi.conflicten(id).catch(() => []);
      setConflicten(c);
    } catch (err) {
      toonToast(err.message, 'fout');
    }
  }

  async function slaEindtijdOp(klasId) {
    try {
      await schoolroostersApi.klasBewerken(id, klasId, { maxEindtijd: klasEindtijden[klasId] || null });
      toonToast('Eindtijd opgeslagen', 'succes');
    } catch (err) {
      toonToast(err.message, 'fout');
    }
  }

  async function runAlgoritme() {
    await schoolroostersApi.runAlgoritme(id);
    setAlgoritmeStatus({ status: 'bezig', percent: 5 });

    // Poll status
    pollingRef.current = setInterval(async () => {
      const status = await schoolroostersApi.algoritmeStatus(id);
      setAlgoritmeStatus(status);
      if (status.status === 'klaar' || status.status === 'fout') {
        clearInterval(pollingRef.current);
        await laad();
        if (status.status === 'klaar') {
          toonToast(`Rooster ingepland! ${status.conflicten?.length || 0} conflicten`, status.conflicten?.length ? 'waarschuwing' : 'succes');
        }
      }
    }, 1000);
  }

  async function slotVerplaats(slotId, dag, uur) {
    try {
      const res = await schoolroostersApi.slotVerplaatsen(id, slotId, { dag, uur });
      // Update lokaal in state zonder full reload
      setRooster(prev => ({
        ...prev,
        slots: prev.slots.map(s => s.id === slotId ? { ...s, dag, uur } : s),
      }));
      if (res.conflicten?.length > 0) {
        toonToast(`Conflict gedetecteerd: ${res.conflicten[0].beschrijving}`, 'waarschuwing');
        await laad(); // refresh voor correcte conflict highlights
      }
    } catch (err) {
      toonToast(err.message, 'fout');
    }
  }

  if (!rooster) return <div className="p-8 text-slate-400">Laden...</div>;

  const slots = rooster.slots.map(s => ({
    id: s.id,
    dag: s.dag,
    uur: s.uur,
    vakCode: s.les?.vak?.code,
    docentAfkorting: s.docent?.afkorting,
    lokaalCode: s.lokaal?.code,
    klasNaam: s.les?.klas?.naam,
  }));

  // Conflict map: slotId -> conflicten[]
  const conflictenMap = {};
  for (const c of conflicten) {
    if (!conflictenMap[c.slotId]) conflictenMap[c.slotId] = [];
    conflictenMap[c.slotId].push(c);
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{rooster.naam}</h1>
        <p className="text-slate-500 text-sm mt-1">
          {rooster.schooljaar} · {rooster.klassen.length} klassen · {rooster.slots.length} ingeplande lessen
          {conflicten.length > 0 && <span className="ml-2 text-red-500">{conflicten.length} conflicten</span>}
        </p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {TABBLADEN.map(tab => (
          <button key={tab} onClick={() => setActieveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              actieveTab === tab ? 'bg-white border border-b-white border-slate-200 text-blue-600 -mb-px' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {tab}
            {tab === 'Conflicten' && conflicten.length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{conflicten.length}</span>
            )}
          </button>
        ))}
      </div>

      {actieveTab === 'Klassen & Lessen' && (
        <div className="grid gap-4">
          {rooster.klassen.map(klas => (
            <div key={klas.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div>
                  <span className="font-bold text-slate-900">{klas.naam}</span>
                  <span className="ml-2 text-sm text-slate-400">{klas.niveau} · {klas.aantalLeerlingen} leerlingen</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <label className="text-slate-500 text-xs">Max. eindtijd:</label>
                  <select
                    value={klasEindtijden[klas.id] ?? ''}
                    onChange={e => setKlasEindtijden(prev => ({ ...prev, [klas.id]: e.target.value }))}
                    className="border border-slate-300 rounded px-2 py-1 text-xs"
                  >
                    <option value="">Geen limiet</option>
                    {TIJDOPTIES.filter(Boolean).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => slaEindtijdOp(klas.id)}
                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                  >
                    Opslaan
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {klas.lessen.map(les => (
                  <div key={les.id} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm">
                    <span className="font-mono font-medium">{les.vak?.code}</span>
                    <span className="text-slate-400 ml-1">{les.aantalUurPerWeek}u/w</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {rooster.klassen.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <p>Nog geen klassen. Import klassen via CSV of voeg ze handmatig toe.</p>
            </div>
          )}
        </div>
      )}

      {actieveTab === 'Rooster' && (
        <div className="flex gap-6">
          <div className="flex-1">
            <RoosterGrid slots={slots} onSlotVerplaats={slotVerplaats} conflictenMap={conflictenMap} />
          </div>
          <div className="w-72 shrink-0">
            {/* Algoritme panel */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
              <h2 className="font-semibold text-slate-900 mb-1">Automatisch inplannen</h2>
              <p className="text-sm text-slate-500 mb-4">Het algoritme genereert een volledig weekrooster voor alle klassen.</p>

              <button onClick={runAlgoritme}
                disabled={algoritmeStatus.status === 'bezig'}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {algoritmeStatus.status === 'bezig' ? '⏳ Bezig...' : '▶ Run algoritme'}
              </button>

              {algoritmeStatus.status === 'bezig' && (
                <div className="mt-3">
                  <div className="bg-slate-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${algoritmeStatus.percent}%` }} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1 text-right">{algoritmeStatus.percent}%</p>
                </div>
              )}
            </div>

            {conflicten.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <h3 className="font-medium text-red-800 text-sm mb-2">{conflicten.length} conflicten</h3>
                <ul className="flex flex-col gap-1">
                  {conflicten.slice(0, 5).map(c => (
                    <li key={c.id} className="text-xs text-red-700">{c.beschrijving}</li>
                  ))}
                  {conflicten.length > 5 && <li className="text-xs text-red-500">+{conflicten.length - 5} meer...</li>}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {actieveTab === 'Conflicten' && (
        <div>
          {conflicten.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-4xl mb-3">✅</p>
              <p>Geen conflicten gevonden!</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-slate-600 font-medium">Type</th>
                    <th className="text-left px-4 py-2.5 text-slate-600 font-medium">Beschrijving</th>
                    <th className="text-left px-4 py-2.5 text-slate-600 font-medium">Klas/Vak</th>
                  </tr>
                </thead>
                <tbody>
                  {conflicten.map(c => (
                    <tr key={c.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-2.5">
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">{c.type}</span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{c.beschrijving}</td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs">
                        {c.slot?.les?.klas?.naam} · {c.slot?.les?.vak?.code}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {actieveTab === 'Exporteren' && (
        <div className="max-w-md">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="font-semibold text-slate-900 mb-2">Exporteren naar Zermelo</h2>
            <p className="text-sm text-slate-500 mb-4">Download het weekrooster als Zermelo-compatible XML.</p>
            <a href={schoolroostersApi.exportZermelo(id)} download
              className="inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
              ⬇ Download Zermelo XML
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
