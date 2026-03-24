import { useState, useEffect } from 'react';
import { docentenApi } from '../api/client.js';

export default function DocentenLijst() {
  const [docenten, setDocenten] = useState([]);

  useEffect(() => {
    docentenApi.lijst().then(setDocenten).catch(() => {});
  }, []);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Docenten</h1>
        <p className="text-slate-500 text-sm mt-1">{docenten.length} docenten</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-2.5 text-slate-600 font-medium">Naam</th>
              <th className="text-left px-4 py-2.5 text-slate-600 font-medium">Afkorting</th>
              <th className="text-left px-4 py-2.5 text-slate-600 font-medium">Vakken</th>
              <th className="text-left px-4 py-2.5 text-slate-600 font-medium">Email</th>
            </tr>
          </thead>
          <tbody>
            {docenten.map(d => (
              <tr key={d.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium text-slate-800">{d.naam}</td>
                <td className="px-4 py-2.5 font-mono text-slate-600 text-xs bg-slate-50 rounded">{d.afkorting}</td>
                <td className="px-4 py-2.5 text-slate-500 text-xs">
                  {d.vakken?.map(dv => dv.vak?.code).filter(Boolean).join(', ') || '—'}
                </td>
                <td className="px-4 py-2.5 text-slate-400 text-xs">{d.email || '—'}</td>
              </tr>
            ))}
            {docenten.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Geen docenten — importeer via CSV</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
