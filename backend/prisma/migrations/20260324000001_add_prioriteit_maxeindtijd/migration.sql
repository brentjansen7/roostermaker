-- Prioriteit per vak (1=hoog voor examens, 2=normaal, 3=laag)
ALTER TABLE "vakken" ADD COLUMN "prioriteit" INTEGER NOT NULL DEFAULT 2;

-- Maximale eindtijd per klas (bijv. "15:30")
ALTER TABLE "klassen" ADD COLUMN "maxEindtijd" TEXT;
