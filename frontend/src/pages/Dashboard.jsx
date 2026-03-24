import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { leerlingenApi, docentenApi, vakkenApi, seRoostersApi, toetsweekenApi, schoolroostersApi } from '../api/client.js';

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.all([
      leerlingenApi.lijst().then(l => l.length).catch(() => 0),
      docentenApi.lijst().then(d => d.length).catch(() => 0),
      vakkenApi.lijst().then(v => v.length).catch(() => 0),
      seRoostersApi.lijst().then(r => r.length).catch(() => 0),
      toetsweekenApi.lijst().then(t => t.length).catch(() => 0),
      schoolroostersApi.lijst().then(s => s.length).catch(() => 0),
    ]).then(([leerlingen, docenten, vakken, seRoosters, toetsweken, schoolroosters]) => {
      setStats({ leerlingen, docenten, vakken, seRoosters, toetsweken, schoolroosters });
    });
  }, []);

  const kaarten = [
    { label: 'Leerlingen', waarde: stats?.leerlingen, pad: '/leerlingen', kleur: 'bg-blue-50 border-blue-200', tekstKleur: 'text-blue-700' },
    { label: 'Docenten', waarde: stats?.docenten, pad: '/docenten', kleur: 'bg-purple-50 border-purple-200', tekstKleur: 'text-purple-700' },
    { label: 'Vakken', waarde: stats?.vakken, pad: '/vakken', kleur: 'bg-green-50 border-green-200', tekstKleur: 'text-green-700' },
    { label: 'SE Roosters', waarde: stats?.seRoosters, pad: '/se-roosters', kleur: 'bg-orange-50 border-orange-200', tekstKleur: 'text-orange-700' },
    { label: 'Toetsweken', waarde: stats?.toetsweken, pad: '/toetsweken', kleur: 'bg-rose-50 border-rose-200', tekstKleur: 'text-rose-700' },
    { label: 'Schoolroosters', waarde: stats?.schoolroosters, pad: '/schoolroosters', kleur: 'bg-teal-50 border-teal-200', tekstKleur: 'text-teal-700' },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Dashboard</h1>
      <p className="text-slate-500 text-sm mb-8">Overzicht van alle roosters en data</p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {kaarten.map(k => (
          <Link key={k.pad} to={k.pad} className={`border ${k.kleur} rounded-xl p-5 hover:shadow-md transition-shadow`}>
            <p className="text-sm text-slate-500 mb-1">{k.label}</p>
            <p className={`text-3xl font-bold ${k.tekstKleur}`}>{stats ? k.waarde : '—'}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold text-slate-900 mb-3">Snel starten</h2>
          <div className="flex flex-col gap-2">
            <Link to="/import" className="text-blue-600 text-sm hover:underline">📤 Data importeren uit Magister CSV</Link>
            <Link to="/se-roosters" className="text-blue-600 text-sm hover:underline">📝 SE herkansingen plannen</Link>
            <Link to="/toetsweken" className="text-blue-600 text-sm hover:underline">📋 Toetsweek plannen</Link>
            <Link to="/schoolroosters" className="text-blue-600 text-sm hover:underline">🗓 Schoolrooster aanmaken</Link>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-semibold text-slate-900 mb-3">Hoe werkt het?</h2>
          <ol className="list-decimal list-inside flex flex-col gap-1 text-sm text-slate-600">
            <li>Importeer leerlingen, docenten en vakken via CSV</li>
            <li>Maak een SE rooster of toetsweek aan</li>
            <li>Klik op "Run algoritme" — klaar!</li>
            <li>Pas handmatig aan waar nodig via drag & drop</li>
            <li>Exporteer naar Zermelo XML</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
