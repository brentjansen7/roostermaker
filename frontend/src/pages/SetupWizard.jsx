import { useState } from 'react';
import { authApi, importApi } from '../api/client.js';
import { toonToast } from '../components/Toast.jsx';

export default function SetupWizard({ onKlaar }) {
  const [stap, setStap] = useState(1); // 1=schoolnaam, 2=csv, 3=klaar
  const [schoolnaam, setSchoolnaam] = useState('');
  const [wachtwoord, setWachtwoord] = useState('');
  const [laden, setLaden] = useState(false);
  const [importResultaat, setImportResultaat] = useState(null);

  async function stap1Verstuur(e) {
    e.preventDefault();
    if (!schoolnaam.trim()) { toonToast('Schoolnaam is verplicht', 'fout'); return; }
    setLaden(true);
    try {
      await authApi.setup({ schoolnaam: schoolnaam.trim(), wachtwoord: wachtwoord || undefined });
      setStap(2);
    } catch (err) {
      toonToast(err.message, 'fout');
    } finally {
      setLaden(false);
    }
  }

  async function csvUpload(e) {
    const bestand = e.target.files[0];
    if (!bestand) return;
    setLaden(true);
    try {
      const resultaat = await importApi.auto(bestand);
      setImportResultaat(resultaat);
      toonToast(`${resultaat.succes} ${resultaat.type} geïmporteerd`, 'succes');
    } catch (err) {
      toonToast(err.message, 'fout');
    } finally {
      setLaden(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 w-full max-w-lg">
        {/* Stappen indicator */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= stap ? 'bg-blue-600' : 'bg-slate-200'}`} />
          ))}
        </div>

        {stap === 1 && (
          <>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Welkom bij Roosterplanner</h1>
            <p className="text-slate-500 text-sm mb-6">Vul de naam van je school in om te beginnen.</p>
            <form onSubmit={stap1Verstuur} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Naam van de school</label>
                <input
                  type="text"
                  placeholder="bijv. Christelijk Lyceum Zeist"
                  value={schoolnaam}
                  onChange={e => setSchoolnaam(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Wachtwoord instellen (optioneel)</label>
                <input
                  type="password"
                  placeholder="Laat leeg voor standaard wachtwoord"
                  value={wachtwoord}
                  onChange={e => setWachtwoord(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-400 mt-1">Standaard: rooster2026</p>
              </div>
              <button
                type="submit"
                disabled={laden}
                className="bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {laden ? 'Bezig...' : 'Volgende →'}
              </button>
            </form>
          </>
        )}

        {stap === 2 && (
          <>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Importeer je data</h2>
            <p className="text-slate-500 text-sm mb-6">
              Upload een CSV exportbestand uit Magister. De software detecteert automatisch of het leerlingen, docenten of vakken zijn.
              Je kunt meerdere bestanden uploaden.
            </p>

            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center mb-4">
              <input
                type="file"
                accept=".csv,.txt"
                onChange={csvUpload}
                className="hidden"
                id="csv-upload"
                disabled={laden}
              />
              <label
                htmlFor="csv-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <div className="text-3xl">📄</div>
                <p className="text-sm font-medium text-slate-700">
                  {laden ? 'Bezig met importeren...' : 'Klik om CSV te uploaden'}
                </p>
                <p className="text-xs text-slate-400">Magister export (leerlingen, docenten of vakken)</p>
              </label>
            </div>

            {importResultaat && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm">
                <p className="font-medium text-green-800">
                  ✓ {importResultaat.succes} {importResultaat.type} geïmporteerd
                </p>
                {importResultaat.fouten > 0 && (
                  <p className="text-orange-600 text-xs mt-1">{importResultaat.fouten} regels overgeslagen</p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStap(3)}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Klaar, ga verder →
              </button>
              <button
                onClick={() => setStap(3)}
                className="text-slate-500 text-sm hover:text-slate-700 px-3"
              >
                Overslaan
              </button>
            </div>
          </>
        )}

        {stap === 3 && (
          <>
            <div className="text-center py-4">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Klaar om te beginnen!</h2>
              <p className="text-slate-500 text-sm mb-6">
                Je roosterplanner is ingesteld. Je kunt nu roosters aanmaken en het algoritme gebruiken.
              </p>
              <button
                onClick={onKlaar}
                className="bg-blue-600 text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Naar dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
