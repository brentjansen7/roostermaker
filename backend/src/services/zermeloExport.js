// Zermelo XML export
// Genereert Zermelo-compatible XML voor import in Zermelo

const DAGEN_NAMEN = { 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday' };

// Standaard lesuur tijden (aanpasbaar via instellingen)
const LESUUR_TIJDEN = {
  1: { begin: '0830', eind: '0920' },
  2: { begin: '0930', eind: '1020' },
  3: { begin: '1030', eind: '1120' },
  4: { begin: '1130', eind: '1220' },
  5: { begin: '1300', eind: '1350' },
  6: { begin: '1400', eind: '1450' },
  7: { begin: '1500', eind: '1550' },
  8: { begin: '1600', eind: '1650' },
};

export function genereerSEZermeloXml(seLessen) {
  const appointments = seLessen
    .filter(les => les.dag && les.uur)
    .map((les, idx) => {
      const tijden = LESUUR_TIJDEN[les.uur] || LESUUR_TIJDEN[1];
      const klassen = [...new Set(les.inschrijvingen?.map(i => i.leerling?.klas).filter(Boolean) || [])];

      return `  <appointment>
    <id>${10000 + idx}</id>
    <startTimeSlot>${les.uur}</startTimeSlot>
    <endTimeSlot>${les.uur}</endTimeSlot>
    <startTime>${tijden.begin}</startTime>
    <endTime>${tijden.eind}</endTime>
    <day>${DAGEN_NAMEN[les.dag] || 'monday'}</day>
    <subjects><subject>${escapeXml(les.vak?.code || '')}</subject></subjects>
    <teachers>${les.docent ? `<teacher>${escapeXml(les.docent.afkorting)}</teacher>` : ''}</teachers>
    <locations>${les.lokaal ? `<location>${escapeXml(les.lokaal.code)}</location>` : ''}</locations>
    <groups>${klassen.map(k => `<group>${escapeXml(k)}</group>`).join('')}</groups>
    <type>exam</type>
    <valid>true</valid>
  </appointment>`;
    }).join('\n');

  return zermeloWrapper(appointments);
}

export function genereerToetsweekZermeloXml(toetsLessen) {
  const appointments = toetsLessen
    .filter(les => les.dag && les.uur)
    .map((les, idx) => {
      const tijden = LESUUR_TIJDEN[les.uur] || LESUUR_TIJDEN[1];
      const leerlingKlassen = [...new Set(les.deelnames?.map(d => d.leerling?.klas).filter(Boolean) || [])];

      return `  <appointment>
    <id>${20000 + idx}</id>
    <startTimeSlot>${les.uur}</startTimeSlot>
    <endTimeSlot>${les.uur}</endTimeSlot>
    <startTime>${tijden.begin}</startTime>
    <endTime>${tijden.eind}</endTime>
    <day>${DAGEN_NAMEN[les.dag] || 'monday'}</day>
    <subjects><subject>${escapeXml(les.vak?.code || '')}</subject></subjects>
    <teachers>${les.docent ? `<teacher>${escapeXml(les.docent.afkorting)}</teacher>` : ''}</teachers>
    <locations>${les.lokaal ? `<location>${escapeXml(les.lokaal.code)}</location>` : ''}</locations>
    <groups>${leerlingKlassen.map(k => `<group>${escapeXml(k)}</group>`).join('')}</groups>
    <type>exam</type>
    <valid>true</valid>
  </appointment>`;
    }).join('\n');

  return zermeloWrapper(appointments);
}

export function genereerSchoolroosterZermeloXml(slots) {
  const appointments = slots
    .filter(slot => slot.dag && slot.uur)
    .map((slot, idx) => {
      const tijden = LESUUR_TIJDEN[slot.uur] || LESUUR_TIJDEN[1];

      return `  <appointment>
    <id>${30000 + idx}</id>
    <startTimeSlot>${slot.uur}</startTimeSlot>
    <endTimeSlot>${slot.uur}</endTimeSlot>
    <startTime>${tijden.begin}</startTime>
    <endTime>${tijden.eind}</endTime>
    <day>${DAGEN_NAMEN[slot.dag] || 'monday'}</day>
    <subjects><subject>${escapeXml(slot.les?.vak?.code || '')}</subject></subjects>
    <teachers>${slot.docent ? `<teacher>${escapeXml(slot.docent.afkorting)}</teacher>` : ''}</teachers>
    <locations>${slot.lokaal ? `<location>${escapeXml(slot.lokaal.code)}</location>` : ''}</locations>
    <groups><group>${escapeXml(slot.les?.klas?.naam || '')}</group></groups>
    <type>lesson</type>
    <valid>true</valid>
  </appointment>`;
    }).join('\n');

  return zermeloWrapper(appointments);
}

function zermeloWrapper(appointments) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<zermelo>
  <response>
    <status>200</status>
    <data>
${appointments}
    </data>
  </response>
</zermelo>`;
}

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
