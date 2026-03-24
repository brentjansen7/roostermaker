import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { authApi } from './api/client.js';
import Navbar from './components/Navbar.jsx';
import ToastContainer from './components/Toast.jsx';
import Login from './pages/Login.jsx';
import SetupWizard from './pages/SetupWizard.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ImportPagina from './pages/ImportPagina.jsx';
import LeerlingenLijst from './pages/LeerlingenLijst.jsx';
import DocentenLijst from './pages/DocentenLijst.jsx';
import VakkenLijst from './pages/VakkenLijst.jsx';
import LokalenLijst from './pages/LokalenLijst.jsx';
import SERoosterLijst from './pages/SERoosterLijst.jsx';
import SERoosterDetail from './pages/SERoosterDetail.jsx';
import ToetsweekLijst from './pages/ToetsweekLijst.jsx';
import ToetsweekDetail from './pages/ToetsweekDetail.jsx';
import SchoolroosterLijst from './pages/SchoolroosterLijst.jsx';
import SchoolroosterDetail from './pages/SchoolroosterDetail.jsx';

function Layout() {
  return (
    <div className="flex min-h-screen">
      <Navbar />
      <main className="flex-1 overflow-auto bg-slate-50">
        <Outlet />
      </main>
    </div>
  );
}

function PrivateRoute({ ingelogd, laden }) {
  if (laden) return <div className="min-h-screen flex items-center justify-center text-slate-400">Laden...</div>;
  if (!ingelogd) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export default function App() {
  const [ingelogd, setIngelogd] = useState(false);
  const [laden, setLaden] = useState(true);
  const [setupNodig, setSetupNodig] = useState(false);

  useEffect(() => {
    Promise.all([authApi.status(), authApi.setupStatus()])
      .then(([auth, setup]) => {
        setIngelogd(auth?.ingelogd || false);
        setSetupNodig(!setup?.klaar);
      })
      .catch(() => {})
      .finally(() => setLaden(false));
  }, []);

  if (laden) return <div className="min-h-screen flex items-center justify-center text-slate-400">Laden...</div>;

  // Eerste keer setup
  if (setupNodig) {
    return (
      <BrowserRouter>
        <ToastContainer />
        <SetupWizard onKlaar={() => { setSetupNodig(false); setIngelogd(true); }} />
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/login" element={<Login onInloggen={() => setIngelogd(true)} />} />
        <Route element={<PrivateRoute ingelogd={ingelogd} laden={false} />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/import" element={<ImportPagina />} />
            <Route path="/leerlingen" element={<LeerlingenLijst />} />
            <Route path="/docenten" element={<DocentenLijst />} />
            <Route path="/vakken" element={<VakkenLijst />} />
            <Route path="/lokalen" element={<LokalenLijst />} />
            <Route path="/se-roosters" element={<SERoosterLijst />} />
            <Route path="/se-roosters/:id" element={<SERoosterDetail />} />
            <Route path="/toetsweken" element={<ToetsweekLijst />} />
            <Route path="/toetsweken/:id" element={<ToetsweekDetail />} />
            <Route path="/schoolroosters" element={<SchoolroosterLijst />} />
            <Route path="/schoolroosters/:id" element={<SchoolroosterDetail />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
