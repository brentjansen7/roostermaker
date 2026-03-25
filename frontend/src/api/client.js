const BASIS_URL = '/api';

async function verzoek(pad, opties = {}) {
  const res = await fetch(`${BASIS_URL}${pad}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...opties.headers },
    ...opties,
  });

  if (res.status === 401) {
    window.location.href = '/login';
    return;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.fout || `Fout ${res.status}`);
  }

  return data;
}

export const api = {
  get: (pad) => verzoek(pad),
  post: (pad, body) => verzoek(pad, { method: 'POST', body: JSON.stringify(body) }),
  put: (pad, body) => verzoek(pad, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (pad) => verzoek(pad, { method: 'DELETE' }),
};

export const authApi = {
  login: (wachtwoord) => verzoek('/login', { method: 'POST', body: JSON.stringify({ wachtwoord }) }),
  logout: () => verzoek('/logout', { method: 'POST' }),
  status: () => verzoek('/auth-status'),
  setupStatus: () => verzoek('/setup-status'),
  setup: (data) => verzoek('/setup', { method: 'POST', body: JSON.stringify(data) }),
  wachtwoordWijzigen: (data) => api.put('/wachtwoord', data),
};

export const leerlingenApi = {
  lijst: (params) => api.get(`/leerlingen${params ? '?' + new URLSearchParams(params) : ''}`),
  ophalen: (id) => api.get(`/leerlingen/${id}`),
  aanmaken: (data) => api.post('/leerlingen', data),
  bewerken: (id, data) => api.put(`/leerlingen/${id}`, data),
  verwijderen: (id) => api.delete(`/leerlingen/${id}`),
  vakkenOpslaan: (id, vakIds) => api.put(`/leerlingen/${id}/vakken`, { vakIds }),
  klassen: () => api.get('/leerlingen/meta/klassen'),
};

export const docentenApi = {
  lijst: () => api.get('/docenten'),
  ophalen: (id) => api.get(`/docenten/${id}`),
  aanmaken: (data) => api.post('/docenten', data),
  bewerken: (id, data) => api.put(`/docenten/${id}`, data),
  verwijderen: (id) => api.delete(`/docenten/${id}`),
  vakkenOpslaan: (id, vakIds) => api.put(`/docenten/${id}/vakken`, { vakIds }),
};

export const vakkenApi = {
  lijst: () => api.get('/vakken'),
  aanmaken: (data) => api.post('/vakken', data),
  bewerken: (id, data) => api.put(`/vakken/${id}`, data),
  verwijderen: (id) => api.delete(`/vakken/${id}`),
};

export const lokalenApi = {
  lijst: () => api.get('/lokalen'),
  aanmaken: (data) => api.post('/lokalen', data),
  bewerken: (id, data) => api.put(`/lokalen/${id}`, data),
  verwijderen: (id) => api.delete(`/lokalen/${id}`),
};

export const seRoostersApi = {
  lijst: () => api.get('/se-roosters'),
  ophalen: (id) => api.get(`/se-roosters/${id}`),
  aanmaken: (data) => api.post('/se-roosters', data),
  bewerken: (id, data) => api.put(`/se-roosters/${id}`, data),
  verwijderen: (id) => api.delete(`/se-roosters/${id}`),
  inschrijvingToevoegen: (id, data) => api.post(`/se-roosters/${id}/inschrijvingen`, data),
  inschrijvingVerwijderen: (id, inschrijvingId) => api.delete(`/se-roosters/${id}/inschrijvingen/${inschrijvingId}`),
  inschrijvingenGenereer: (id, data) => api.post(`/se-roosters/${id}/inschrijvingen/genereer`, data),
  lesVerplaatsen: (id, lesId, data) => api.put(`/se-roosters/${id}/lessen/${lesId}`, data),
  runAlgoritme: (id) => api.post(`/se-roosters/${id}/algoritme/run`, {}),
  exportZermelo: (id) => `${BASIS_URL}/export/se-roosters/${id}/zermelo`,
};

export const toetsweekenApi = {
  lijst: () => api.get('/toetsweken'),
  ophalen: (id) => api.get(`/toetsweken/${id}`),
  aanmaken: (data) => api.post('/toetsweken', data),
  bewerken: (id, data) => api.put(`/toetsweken/${id}`, data),
  verwijderen: (id) => api.delete(`/toetsweken/${id}`),
  deelamesGenereer: (id, data) => api.post(`/toetsweken/${id}/deelnames/genereer`, data),
  lesVerplaatsen: (id, lesId, data) => api.put(`/toetsweken/${id}/lessen/${lesId}`, data),
  runAlgoritme: (id) => api.post(`/toetsweken/${id}/algoritme/run`, {}),
  exportZermelo: (id) => `${BASIS_URL}/export/toetsweken/${id}/zermelo`,
};

export const schoolroostersApi = {
  lijst: () => api.get('/schoolroosters'),
  ophalen: (id) => api.get(`/schoolroosters/${id}`),
  aanmaken: (data) => api.post('/schoolroosters', data),
  bewerken: (id, data) => api.put(`/schoolroosters/${id}`, data),
  verwijderen: (id) => api.delete(`/schoolroosters/${id}`),
  klasBewerken: (roosterId, klasId, data) => api.put(`/schoolroosters/${roosterId}/klassen/${klasId}`, data),
  slotVerplaatsen: (id, slotId, data) => api.put(`/schoolroosters/${id}/slots/${slotId}`, data),
  runAlgoritme: (id) => api.post(`/schoolroosters/${id}/algoritme/run`, {}),
  algoritmeStatus: (id) => api.get(`/schoolroosters/${id}/algoritme/status`),
  conflicten: (id) => api.get(`/schoolroosters/${id}/conflicten`),
  exportZermelo: (id) => `${BASIS_URL}/export/schoolroosters/${id}/zermelo`,
};

export const importApi = {
  auto: async (bestand) => {
    const form = new FormData();
    form.append('bestand', bestand);
    const res = await fetch(`${BASIS_URL}/import/auto`, { method: 'POST', credentials: 'include', body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.fout || 'Import mislukt');
    return data;
  },
  logs: () => api.get('/import/logs'),
};
