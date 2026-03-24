import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { seRoostersApi } from '../api/client.js';
import { toonToast } from '../components/Toast.jsx';
import RoosterGrid from '../components/RoosterGrid.jsx';
import AlgoritmePanel from '../components/AlgoritmePanel.jsx';

const TABBLADEN = ['Inschrijvingen', 'Rooster', 'Exporteren'];
const DAGEN_NAMEN = { 1: 'Maandag', 2: 'Dinsdag', 3: 'Woensdag', 4: 'Donderdag', 5: 'Vrijdag' };

export default function SERoosterDetail() {
  const { id } = useParams();
  const [rooster, setRooster] = useState(null);
  const [actieveTab, setActieveTab] = useState('Rooster');

  useEffect(() => {
    laadRooster();
  }, [id]);

  async function laadRooster() {
    try {
      const r = await seRoostersApi.ophalen(id);
      setRooster(r);
    } catch (err) {
      toonToast(err.message, 'fout');
    }
  }

  async function runAlgoritme() {
    const res = await seRoostersApi.runAlgoritme(id);
    await laadRooster();
    return res;
  }

  async function slotVerplaats(lesId, dag, uur) {
    try {
      await seRoostersApi.lesVerplaatsen(id, lesId, { dag, uur });
      await laadRooster();
    } catch (err) {
      toonToast(err.message, 'fout');
    }
  }

  if (!rooster) return <div className="p-8 text-slate-400">Laden...</div>;

  // Maak slots array voor RoosterGrid (SE lessen → unified format)
  const slots = rooster.lessen
    .filter(l => l.dag && l.uur)
    .map(l => ({
      id: l.id,
      dag: l.dag,
      uur: l.uur,
      vakCode: l.vak?.code,
      docentAfkorting: l.docent?.afkorting,
      lokaalCode: l.lokaal?.code,
      klasNaam: l.inschrijvingen?.length ? `${l.inschrijvingen.length} leerlingen` : '—',
    }));

  // Groepeer inschrijvingen per vak
  const perVak = {};
  for (const inschrijving of rooster.inschrijvingen) {
    const key = inschrijving.vak?.code || inschrijving.vakId;
    if (!perVak[key]) perVak[key] = { naam: inschrijving.vak?.naam, leerlingen: [], ingepland: 0, conflict: 0 };
    perVak[key].leerlingen.push(inschrijving);
    if (inschrijving.status === 'ingepland') perVak[key].ingepland++;
    if (inschrijving.status === 'conflict') perVak[key].conflict++;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{rooster.naam}</h1>
        <p className="text-slate-500 text-sm mt-1">{rooster.schooljaar} · {rooster.inschrijvingen.length} inschrijvingen · {rooster.lessen.length} toetsmomenten</p>
      </div>

      {/* Tabbladen */}
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

      {actieveTab === 'Inschrijvingen' && (
        <div className="flex gap-6">
          <div className="flex-1">
            <h2 className="font-semibold text-slate-900 mb-3">Inschrijvingen per vak</h2>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-slate-600 font-medium">Vak</th>
                    <th className="text-right px-4 py-2.5 text-slate-600 font-medium">Totaal</th>
                    <th className="text-right px-4 py-2.5 text-slate-600 font-medium">Ingepland</th>
                    <th className="text-right px-4 py-2.5 text-slate-600 font-medium">Conflict</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(perVak).map(([code, info]) => (
                    <tr key={code} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-2.5">
                        <span className="font-mono font-semibold">{code}</span>
                        {info.naam && <span className="text-slate-400 text-xs ml-2">{info.naam}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right">{info.leerlingen.length}</td>
                      <td className="px-4 py-2.5 text-right text-green-600">{info.ingepland}</td>
                      <td className="px-4 py-2.5 text-right text-red-500">{info.conflict}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="w-80">
            <AlgoritmePanel onRun={runAlgoritme} type="se" />
          </div>
        </div>
      )}

      {actieveTab === 'Rooster' && (
        <div className="flex gap-6">
          <div className="flex-1">
            <RoosterGrid slots={slots} onSlotVerplaats={slotVerplaats} />
          </div>
          <div className="w-72 shrink-0">
            <AlgoritmePanel onRun={runAlgoritme} type="se" />

            {rooster.lessen.filter(l => l.dag).length > 0 && (
              <div className="mt-4 bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="font-medium text-slate-900 mb-3 text-sm">Per dag</h3>
                {[1,2,3,4,5].map(dag => {
                  const lessenOpDag = rooster.lessen.filter(l => l.dag === dag);
                  if (!lessenOpDag.length) return null;
                  return (
                    <div key={dag} className="mb-2">
                      <p className="text-xs font-medium text-slate-600">{DAGEN_NAMEN[dag]}</p>
                      <div className="flex flex-col gap-1 mt-1">
                        {lessenOpDag.map(l => (
                          <div key={l.id} className="text-xs text-slate-500">
                            Uur {l.uur}: <span className="font-medium">{l.vak?.code}</span> · {l.inschrijvingen?.length || 0} leerlingen · {l.lokaal?.code}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {actieveTab === 'Exporteren' && (
        <div className="max-w-md">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="font-semibold text-slate-900 mb-2">Exporteren naar Zermelo</h2>
            <p className="text-sm text-slate-500 mb-4">
              Download het rooster als Zermelo-compatible XML bestand. Je kunt dit importeren in Zermelo via Beheer → Importeren.
            </p>
            <a
              href={seRoostersApi.exportZermelo(id)}
              download
              className="inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              ⬇ Download Zermelo XML
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
