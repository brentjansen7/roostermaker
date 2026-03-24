import { useState } from 'react';
import { toonToast } from './Toast.jsx';

export default function AlgoritmePanel({ onRun, type = 'standaard' }) {
  const [status, setStatus] = useState('idle'); // idle | bezig | klaar | fout
  const [resultaat, setResultaat] = useState(null);

  async function run() {
    setStatus('bezig');
    setResultaat(null);
    try {
      const res = await onRun();
      setResultaat(res);
      setStatus('klaar');
      if (res.aantalConflicten > 0) {
        toonToast(`Rooster ingepland — ${res.aantalConflicten} conflict(en) gevonden`, 'waarschuwing');
      } else {
        toonToast('Rooster succesvol ingepland!', 'succes');
      }
    } catch (err) {
      setStatus('fout');
      toonToast(err.message, 'fout');
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h2 className="font-semibold text-slate-900 mb-1">Automatisch inplannen</h2>
      <p className="text-sm text-slate-500 mb-4">
        Het algoritme plant alle {type === 'se' ? 'herkansingen' : type === 'toetsweek' ? 'toetsen' : 'lessen'} automatisch in.
        Je kunt daarna handmatig aanpassen via drag & drop.
      </p>

      <button
        onClick={run}
        disabled={status === 'bezig'}
        className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
      >
        {status === 'bezig' ? (
          <>
            <span className="animate-spin">⏳</span>
            <span>Bezig...</span>
          </>
        ) : (
          <>▶ Run algoritme</>
        )}
      </button>

      {status === 'klaar' && resultaat && (
        <div className={`mt-4 p-3 rounded-lg text-sm ${resultaat.aantalConflicten > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}`}>
          <p className="font-medium text-slate-800">
            {resultaat.aantalIngepland ?? resultaat.aantalVakken ?? resultaat.aantalSlots ?? 0} ingepland
            {resultaat.aantalConflicten > 0 && ` — ${resultaat.aantalConflicten} conflict(en)`}
          </p>
          {resultaat.conflicten?.length > 0 && (
            <ul className="mt-2 list-disc list-inside text-xs text-orange-700 flex flex-col gap-0.5">
              {resultaat.conflicten.map((c, i) => <li key={i}>{c.beschrijving}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
