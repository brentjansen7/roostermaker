import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toetsweekenApi } from '../api/client.js';
import { toonToast } from '../components/Toast.jsx';
import RoosterGrid from '../components/RoosterGrid.jsx';
import AlgoritmePanel from '../components/AlgoritmePanel.jsx';

const TABBLADEN = ['Deelnames', 'Rooster', 'Exporteren'];
const DAGEN_NAMEN = { 1: 'Maandag', 2: 'Dinsdag', 3: 'Woensdag', 4: 'Donderdag', 5: 'Vrijdag' };

export default function ToetsweekDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [toetsweek, setToetsweek] = useState(null);
  const [actieveTab, setActieveTab] = useState('Rooster');

  useEffect(() => { laad(); }, [id]);

  async function laad() {
    try {
      const tw = await toetsweekenApi.ophalen(id);
      setToetsweek(tw);
    } catch (err) {
      toonToast(err.message, 'fout');
    }
  }

  async function runAlgoritme() {
    const res = await toetsweekenApi.runAlgoritme(id);
    await laad();
    return res;
  }

  async function genereerDeelnames() {
    try {
      const res = await toetsweekenApi.deelamesGenereer(id, {});
      toonToast(`${res.aangemaakt} deelnames gegenereerd`, 'succes');
      await laad();
    } catch (err) {
      toonToast(err.message, 'fout');
    }
  }

  async function slotVerplaats(lesId, dag, uur) {
    try {
      await toetsweekenApi.lesVerplaatsen(id, lesId, { dag, uur });
      await laad();
    } catch (err) {
      toonToast(err.message, 'fout');
    }
  }

  if (!toetsweek) return <div className="p-8 text-slate-400">Laden...</div>;

  const slots = toetsweek.lessen
    .filter(l => l.dag && l.uur)
    .map(l => ({
      id: l.id,
      dag: l.dag,
      uur: l.uur,
      vakCode: l.vak?.code,
      docentAfkorting: l.docent?.afkorting,
      lokaalCode: l.lokaal?.code,
      klasNaam: l.deelnames?.length ? `${l.deelnames.length} leerlingen` : '—',
    }));

  // Bereken per dag hoeveel toetsen een leerling heeft (voor kleurcodering)
  const leerlingDagTelling = {};
  for (const les of toetsweek.lessen.filter(l => l.dag)) {
    for (const deelname of les.deelnames || []) {
      const key = `${deelname.leerlingId}_${les.dag}`;
      leerlingDagTelling[key] = (leerlingDagTelling[key] || 0) + 1;
    }
  }
  const maxToetsenPerDag = Math.max(0, ...Object.values(leerlingDagTelling));

  // Groepeer deelnames per vak voor de deelnames-tab
  const perVak = {};
  for (const deelname of toetsweek.deelnames) {
    const code = deelname.vak?.code || deelname.vakId;
    if (!perVak[code]) perVak[code] = { naam: deelname.vak?.naam, code, leerlingen: [] };
    perVak[code].leerlingen.push(deelname);
  }
  for (const les of toetsweek.lessen) {
    const code = les.vak?.code || les.vakId;
    if (perVak[code]) perVak[code].les = les;
  }

  return (
    <div className="p-8">
      <button onClick={() => navigate('/toetsweken')} className="text-sm text-slate-400 hover:text-slate-600 mb-4 flex items-center gap-1">
        ← Terug
      </button>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{toetsweek.naam}</h1>
        <p className="text-slate-500 text-sm mt-1">
          {toetsweek.schooljaar} · {toetsweek.deelnames.length} deelnames · {toetsweek.lessen.length} toetsmomenten
          {maxToetsenPerDag > 2 && <span className="ml-2 text-orange-500">⚠ max {maxToetsenPerDag} toetsen op 1 dag</span>}
        </p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {TABBLADEN.map(tab => (
          <button key={tab} onClick={() => setActieveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              actieveTab === tab ? 'bg-white border border-b-white border-slate-200 text-blue-600 -mb-px' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {actieveTab === 'Deelnames' && (
        <div className="flex gap-6">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-900">Deelnames per vak</h2>
              <button onClick={genereerDeelnames}
                className="text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                ↺ Genereer vanuit leerling-vakken
              </button>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-slate-600 font-medium">Vak</th>
                    <th className="text-right px-4 py-2.5 text-slate-600 font-medium">Deelnemers</th>
                    <th className="text-left px-4 py-2.5 text-slate-600 font-medium">Ingepland</th>
                    <th className="text-left px-4 py-2.5 text-slate-600 font-medium">Tijdstip</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(perVak).map(([code, info]) => (
                    <tr key={code} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-2.5 font-mono font-semibold">{code}</td>
                      <td className="px-4 py-2.5 text-right">{info.leerlingen.length}</td>
                      <td className="px-4 py-2.5">
                        {info.les?.dag ? (
                          <span className="text-green-600 text-xs">✓ Ingepland</span>
                        ) : (
                          <span className="text-orange-500 text-xs">Niet ingepland</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs">
                        {info.les?.dag ? `${DAGEN_NAMEN[info.les.dag]} uur ${info.les.uur}` : '—'}
                      </td>
                    </tr>
                  ))}
                  {Object.keys(perVak).length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Nog geen deelnames — klik op "Genereer vanuit leerling-vakken"</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="w-80">
            <AlgoritmePanel onRun={runAlgoritme} type="toetsweek" />
          </div>
        </div>
      )}

      {actieveTab === 'Rooster' && (
        <div className="flex gap-6">
          <div className="flex-1">
            <RoosterGrid slots={slots} onSlotVerplaats={slotVerplaats} />
          </div>
          <div className="w-72 shrink-0">
            <AlgoritmePanel onRun={runAlgoritme} type="toetsweek" />
          </div>
        </div>
      )}

      {actieveTab === 'Exporteren' && (
        <div className="max-w-md">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="font-semibold text-slate-900 mb-2">Exporteren naar Zermelo</h2>
            <p className="text-sm text-slate-500 mb-4">Download het toetsweek rooster als Zermelo XML.</p>
            <a href={toetsweekenApi.exportZermelo(id)} download
              className="inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
              ⬇ Download Zermelo XML
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
