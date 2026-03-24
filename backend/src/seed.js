import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  // schoolnaam NIET vooraf aanmaken — SetupWizard doet dat bij eerste gebruik

  // Standaard lokalen aanmaken als de database leeg is
  const aantalLokalen = await prisma.lokaal.count();
  if (aantalLokalen === 0) {
    const standaardLokalen = [
      { code: 'A01', naam: 'Lokaal A01', capaciteit: 32, type: 'normaal' },
      { code: 'A02', naam: 'Lokaal A02', capaciteit: 32, type: 'normaal' },
      { code: 'A03', naam: 'Lokaal A03', capaciteit: 32, type: 'normaal' },
      { code: 'B01', naam: 'Lokaal B01', capaciteit: 30, type: 'normaal' },
      { code: 'B02', naam: 'Lokaal B02', capaciteit: 30, type: 'normaal' },
      { code: 'ICT1', naam: 'Computerlokaal 1', capaciteit: 30, type: 'ict' },
      { code: 'NAT1', naam: 'Natuurkunde lab', capaciteit: 28, type: 'lab' },
      { code: 'AULA', naam: 'Aula', capaciteit: 150, type: 'aula' },
    ];
    for (const lokaal of standaardLokalen) {
      await prisma.lokaal.create({ data: lokaal });
    }
    console.log('Standaard lokalen aangemaakt');
  }

  console.log('Seed klaar');
  await prisma.$disconnect();
}

seed().catch(err => {
  console.error('Seed fout:', err);
  process.exit(1);
});
