import { useState, useEffect } from 'react';
import { vakkenApi } from '../api/client.js';

export default function VakkenLijst() {
  const [vakken, setVakken] = useState([]);

  useEffect(() => {
    vakkenApi.lijst().then(setVakken).catch(() => {});
  }, []);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Vakken</h1>
        <p className="text-slate-500 text-sm mt-1">{vakken.length} vakken</p>
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
              </tr>
            ))}
            {vakken.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Geen vakken — importeer via CSV</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
