import { useState, useEffect } from 'react';
import { importApi } from '../api/client.js';
import { toonToast } from '../components/Toast.jsx';

export default function ImportPagina() {
  const [logs, setLogs] = useState([]);
  const [laden, setLaden] = useState(false);
  const [resultaat, setResultaat] = useState(null);

  useEffect(() => {
    importApi.logs().then(setLogs).catch(() => {});
  }, []);

  async function handleUpload(e) {
    const bestand = e.target.files[0];
    if (!bestand) return;
    e.target.value = ''; // reset input
    setLaden(true);
    setResultaat(null);
    try {
      const res = await importApi.auto(bestand);
      setResultaat(res);
      toonToast(`${res.succes} ${res.type} geïmporteerd!`, 'succes');
      const nieuweLog = await importApi.logs();
      setLogs(nieuweLog);
    } catch (err) {
      toonToast(err.message, 'fout');
    } finally {
      setLaden(false);
    }
  }

  const typeLabels = { leerlingen: '👨‍🎓 Leerlingen', docenten: '👨‍🏫 Docenten', vakken: '📚 Vakken' };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Data importeren</h1>
      <p className="text-slate-500 text-sm mb-8">Upload een CSV exportbestand uit Magister. Type wordt automatisch gedetecteerd.</p>

      {/* Upload zone */}
      <div className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-10 text-center mb-6 hover:border-blue-400 transition-colors">
        <input type="file" accept=".csv,.txt" onChange={handleUpload} className="hidden" id="csv-upload" disabled={laden} />
        <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center gap-3">
          <div className="text-4xl">{laden ? '⏳' : '📤'}</div>
          <div>
            <p className="font-semibold text-slate-700">{laden ? 'Importeren...' : 'Klik om CSV te uploaden'}</p>
            <p className="text-sm text-slate-400 mt-1">Magister export van leerlingen, docenten of vakken</p>
          </div>
        </label>
      </div>

      {/* Resultaat */}
      {resultaat && (
        <div className={`rounded-xl p-4 mb-6 border ${resultaat.fouten > 0 ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
          <p className="font-semibold text-slate-800 mb-1">
            {typeLabels[resultaat.type] || resultaat.type} geïmporteerd
          </p>
          <p className="text-sm text-slate-600">{resultaat.succes} rijen succesvol, {resultaat.fouten} fouten</p>
          {resultaat.foutDetails?.length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-red-600 cursor-pointer">Toon fouten</summary>
              <ul className="text-xs text-red-700 mt-1 list-disc list-inside">
                {resultaat.foutDetails.slice(0, 5).map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
        <p className="font-medium text-blue-900 text-sm mb-2">Tips voor Magister CSV export</p>
        <ul className="text-xs text-blue-700 list-disc list-inside flex flex-col gap-1">
          <li>Exporteer leerlingen vanuit Magister → Leerlingen → Exporteren als CSV</li>
          <li>De kolom "Stamnummer" of "Leerlingnummer" wordt automatisch herkend</li>
          <li>Upload meerdere bestanden achter elkaar (leerlingen, dan docenten, dan vakken)</li>
          <li>Gebruik puntkomma (;) of komma (,) als separator — beide werken</li>
        </ul>
      </div>

      {/* Import logs */}
      {logs.length > 0 && (
        <div>
          <h2 className="font-semibold text-slate-900 mb-3">Eerdere imports</h2>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-2 text-slate-600 font-medium">Bestand</th>
                  <th className="text-left px-4 py-2 text-slate-600 font-medium">Type</th>
                  <th className="text-right px-4 py-2 text-slate-600 font-medium">Succes</th>
                  <th className="text-right px-4 py-2 text-slate-600 font-medium">Fouten</th>
                  <th className="text-left px-4 py-2 text-slate-600 font-medium">Datum</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2 text-slate-700">{log.bestandsnaam}</td>
                    <td className="px-4 py-2">{typeLabels[log.type] || log.type}</td>
                    <td className="px-4 py-2 text-right text-green-600">{log.succes}</td>
                    <td className="px-4 py-2 text-right text-red-500">{log.fouten}</td>
                    <td className="px-4 py-2 text-slate-400 text-xs">{new Date(log.aangemaaktOp).toLocaleDateString('nl')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
