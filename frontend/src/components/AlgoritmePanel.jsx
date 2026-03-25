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
          <p className="font-semibold text-slate-800 mb-2">
            {resultaat.aantalConflicten === 0 ? '✓ Geen conflicten' : `⚠ ${resultaat.aantalConflicten} conflict(en) gevonden`}
          </p>
          <div className="flex flex-col gap-1">
            {(resultaat.aantalIngepland ?? resultaat.aantalVakken ?? resultaat.aantalSlots) != null && (
              <p className="text-xs text-green-700">
                ✓ {resultaat.aantalIngepland ?? resultaat.aantalVakken ?? resultaat.aantalSlots} ingepland
                {resultaat.aantalLessen ? ` (${resultaat.aantalLessen} lessen)` : ''}
              </p>
            )}
            {resultaat.leerlingDubbel > 0 && (
              <p className="text-xs text-red-600">✗ {resultaat.leerlingDubbel} leerling(en) op 2 plekken tegelijk</p>
            )}
            {resultaat.docentDubbel > 0 && (
              <p className="text-xs text-red-600">✗ {resultaat.docentDubbel} docent(en) dubbel bezet</p>
            )}
            {resultaat.lokaalDubbel > 0 && (
              <p className="text-xs text-red-600">✗ {resultaat.lokaalDubbel} lokaal/lokalen dubbel geboekt</p>
            )}
            {resultaat.nietIngepland > 0 && (
              <p className="text-xs text-orange-600">⚠ {resultaat.nietIngepland} niet ingepland (geen vrij slot)</p>
            )}
          </div>
          {resultaat.conflicten?.length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-orange-600 cursor-pointer">Toon details</summary>
              <ul className="mt-1 list-disc list-inside text-xs text-orange-700 flex flex-col gap-0.5">
                {resultaat.conflicten.map((c, i) => <li key={i}>{c.beschrijving}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
