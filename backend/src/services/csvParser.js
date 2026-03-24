// CSV Parser met auto-detectie van kolomnamen (Magister export formaten)
// Magister exporteert vaak met kolomnamen in het Nederlands

// Bekende kolomnamen per entiteit (hoofdletter-onafhankelijk)
const KOLOM_MAP = {
  leerlingen: {
    magisterNummer: ['stamnummer', 'leerlingnummer', 'stam', 'nummer', 'id', 'leerling id'],
    naam: ['naam', 'volledige naam', 'leerlingnaam', 'name'],
    achternaam: ['achternaam', 'lastname', 'surname'],
    tussenvoegsel: ['tussenvoegsel', 'tv', 'prefix'],
    voornaam: ['voornaam', 'roepnaam', 'firstname'],
    klas: ['klas', 'klas/groep', 'groep', 'class'],
    leerjaar: ['leerjaar', 'jaar', 'year'],
    niveau: ['niveau', 'opleiding', 'richting', 'profiel', 'type'],
    email: ['email', 'e-mail', 'emailadres'],
  },
  docenten: {
    magisterCode: ['code', 'docentcode', 'afkorting', 'id'],
    naam: ['naam', 'docentnaam', 'volledige naam'],
    afkorting: ['afkorting', 'code', 'docentcode'],
    email: ['email', 'e-mail'],
  },
  vakken: {
    code: ['code', 'vakcode', 'vak code', 'afkorting'],
    naam: ['naam', 'vaknaam', 'vak naam', 'omschrijving'],
  },
};

// Detecteer welk type entiteit de CSV bevat op basis van de kolomnamen
export function detecteerType(headers) {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());

  // Controleer op leerlingnummer/stamnummer → leerlingen
  if (lowerHeaders.some(h => ['stamnummer', 'leerlingnummer', 'stam'].includes(h))) return 'leerlingen';

  // Controleer op docentcode → docenten
  if (lowerHeaders.some(h => ['docentcode', 'docentafkorting'].includes(h))) return 'docenten';

  // Controleer op vakcode → vakken
  if (lowerHeaders.some(h => ['vakcode', 'vak code'].includes(h))) return 'vakken';

  // Heuristiek op basis van aanwezige kolommen
  const leerlingScore = berekenScore(lowerHeaders, KOLOM_MAP.leerlingen);
  const docentScore = berekenScore(lowerHeaders, KOLOM_MAP.docenten);
  const vakScore = berekenScore(lowerHeaders, KOLOM_MAP.vakken);

  const max = Math.max(leerlingScore, docentScore, vakScore);
  if (max === 0) return 'onbekend';
  if (leerlingScore === max) return 'leerlingen';
  if (docentScore === max) return 'docenten';
  return 'vakken';
}

function berekenScore(headers, kolomMap) {
  let score = 0;
  for (const alternatieven of Object.values(kolomMap)) {
    if (headers.some(h => alternatieven.includes(h))) score++;
  }
  return score;
}

// Zoek de kolom in de CSV headers die overeenkomt met het gewenste veld
function vindKolom(headers, alternatieven) {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  for (const alt of alternatieven) {
    const idx = lowerHeaders.indexOf(alt.toLowerCase());
    if (idx !== -1) return headers[idx]; // return originele header
  }
  return null;
}

// Parse CSV tekst naar array van objecten
export function parseCSV(tekst) {
  const regels = tekst.split(/\r?\n/).filter(r => r.trim());
  if (regels.length < 2) return { headers: [], rijen: [] };

  // Detecteer separator (komma of puntkomma)
  const eersteRegel = regels[0];
  const separator = eersteRegel.includes(';') ? ';' : ',';

  const headers = parseRegel(eersteRegel, separator);
  const rijen = [];

  for (let i = 1; i < regels.length; i++) {
    const waarden = parseRegel(regels[i], separator);
    if (waarden.every(w => w === '')) continue; // lege rijen overslaan
    const rij = {};
    headers.forEach((h, idx) => {
      rij[h] = waarden[idx] || '';
    });
    rijen.push(rij);
  }

  return { headers, rijen };
}

function parseRegel(regel, sep) {
  const waarden = [];
  let huidig = '';
  let inQuotes = false;
  for (let i = 0; i < regel.length; i++) {
    const c = regel[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === sep && !inQuotes) {
      waarden.push(huidig.trim());
      huidig = '';
    } else {
      huidig += c;
    }
  }
  waarden.push(huidig.trim());
  return waarden;
}

// Maak leerling-objecten van CSV rijen
export function mapLeerlingen(rijen, headers) {
  const kolomMap = KOLOM_MAP.leerlingen;
  const naamKolom = vindKolom(headers, kolomMap.naam);
  const achternaamKolom = vindKolom(headers, kolomMap.achternaam);
  const tussenvoegselKolom = vindKolom(headers, kolomMap.tussenvoegsel);
  const voornaamKolom = vindKolom(headers, kolomMap.voornaam);
  const nummerKolom = vindKolom(headers, kolomMap.magisterNummer);
  const klasKolom = vindKolom(headers, kolomMap.klas);
  const leerjaarKolom = vindKolom(headers, kolomMap.leerjaar);
  const niveauKolom = vindKolom(headers, kolomMap.niveau);
  const emailKolom = vindKolom(headers, kolomMap.email);

  return rijen.map((rij, idx) => {
    let naam = naamKolom ? rij[naamKolom] : '';
    if (!naam && (achternaamKolom || voornaamKolom)) {
      const voornaam = voornaamKolom ? rij[voornaamKolom] : '';
      const tv = tussenvoegselKolom ? rij[tussenvoegselKolom] : '';
      const achternaam = achternaamKolom ? rij[achternaamKolom] : '';
      naam = [voornaam, tv, achternaam].filter(Boolean).join(' ');
    }

    const klas = klasKolom ? rij[klasKolom] : '';
    const niveauRaw = niveauKolom ? rij[niveauKolom].toLowerCase() : '';
    const niveau = detecteerNiveau(niveauRaw, klas);
    const leerjaar = detecteerLeerjaar(leerjaarKolom ? rij[leerjaarKolom] : '', klas);

    return {
      magisterNummer: nummerKolom ? rij[nummerKolom] : `AUTO_${idx + 1}`,
      naam: naam || 'Onbekend',
      klas: klas || 'Onbekend',
      leerjaar,
      niveau,
      email: emailKolom ? rij[emailKolom] : null,
    };
  }).filter(l => l.naam !== 'Onbekend' || l.klas !== 'Onbekend');
}

// Maak docent-objecten van CSV rijen
export function mapDocenten(rijen, headers) {
  const kolomMap = KOLOM_MAP.docenten;
  const naamKolom = vindKolom(headers, kolomMap.naam);
  const codeKolom = vindKolom(headers, kolomMap.magisterCode);
  const afkortingKolom = vindKolom(headers, kolomMap.afkorting);
  const emailKolom = vindKolom(headers, kolomMap.email);

  return rijen.map(rij => {
    const naam = naamKolom ? rij[naamKolom] : '';
    const code = codeKolom ? rij[codeKolom] : (afkortingKolom ? rij[afkortingKolom] : '');
    const afkorting = afkortingKolom ? rij[afkortingKolom] : code;
    return { magisterCode: code || afkorting, naam, afkorting, email: emailKolom ? rij[emailKolom] : null };
  }).filter(d => d.naam);
}

// Maak vak-objecten van CSV rijen
export function mapVakken(rijen, headers) {
  const kolomMap = KOLOM_MAP.vakken;
  const codeKolom = vindKolom(headers, kolomMap.code);
  const naamKolom = vindKolom(headers, kolomMap.naam);

  return rijen.map(rij => ({
    code: codeKolom ? rij[codeKolom].toUpperCase() : '',
    naam: naamKolom ? rij[naamKolom] : '',
  })).filter(v => v.code && v.naam);
}

// Detecteer niveau uit tekst of klasnaam
function detecteerNiveau(tekst, klas) {
  const lower = tekst.toLowerCase() + klas.toLowerCase();
  if (lower.includes('vwo') || lower.includes('vw')) return 'vwo';
  if (lower.includes('havo') || lower.includes('ha')) return 'havo';
  if (lower.includes('mavo') || lower.includes('ma') || lower.includes('vmbo')) return 'mavo';
  return 'havo'; // standaard
}

// Detecteer leerjaar uit tekst of klasnaam
function detecteerLeerjaar(tekst, klas) {
  const match = (tekst + klas).match(/\d/);
  if (match) {
    const jaar = parseInt(match[0]);
    if (jaar >= 1 && jaar <= 6) return jaar;
  }
  return 1;
}
