-- CreateTable
CREATE TABLE "leerlingen" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "magisterNummer" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "klas" TEXT NOT NULL,
    "leerjaar" INTEGER NOT NULL,
    "niveau" TEXT NOT NULL,
    "email" TEXT,
    "aangemaaktOp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "docenten" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "magisterCode" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "afkorting" TEXT NOT NULL,
    "email" TEXT,
    "aangemaaktOp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "vakken" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "naam" TEXT NOT NULL,
    "isSeVak" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "docent_vakken" (
    "docentId" INTEGER NOT NULL,
    "vakId" INTEGER NOT NULL,

    PRIMARY KEY ("docentId", "vakId"),
    CONSTRAINT "docent_vakken_docentId_fkey" FOREIGN KEY ("docentId") REFERENCES "docenten" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "docent_vakken_vakId_fkey" FOREIGN KEY ("vakId") REFERENCES "vakken" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "leerling_vakken" (
    "leerlingId" INTEGER NOT NULL,
    "vakId" INTEGER NOT NULL,

    PRIMARY KEY ("leerlingId", "vakId"),
    CONSTRAINT "leerling_vakken_leerlingId_fkey" FOREIGN KEY ("leerlingId") REFERENCES "leerlingen" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "leerling_vakken_vakId_fkey" FOREIGN KEY ("vakId") REFERENCES "vakken" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lokalen" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "naam" TEXT,
    "capaciteit" INTEGER NOT NULL DEFAULT 30,
    "type" TEXT NOT NULL DEFAULT 'normaal',
    "beschikbaar" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "se_roosters" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "naam" TEXT NOT NULL,
    "schooljaar" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'concept',
    "aangemaaktOp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bijgewerktOp" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "se_lessen" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "roosterId" INTEGER NOT NULL,
    "vakId" INTEGER NOT NULL,
    "docentId" INTEGER,
    "lokaalId" INTEGER,
    "dag" INTEGER,
    "uur" INTEGER,
    "datum" TEXT,
    "maxAantal" INTEGER NOT NULL DEFAULT 30,
    "handmatigGezet" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "se_lessen_roosterId_fkey" FOREIGN KEY ("roosterId") REFERENCES "se_roosters" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "se_lessen_vakId_fkey" FOREIGN KEY ("vakId") REFERENCES "vakken" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "se_lessen_docentId_fkey" FOREIGN KEY ("docentId") REFERENCES "docenten" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "se_lessen_lokaalId_fkey" FOREIGN KEY ("lokaalId") REFERENCES "lokalen" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "se_inschrijvingen" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "roosterId" INTEGER NOT NULL,
    "leerlingId" INTEGER NOT NULL,
    "vakId" INTEGER NOT NULL,
    "lesId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ingeschreven',
    CONSTRAINT "se_inschrijvingen_roosterId_fkey" FOREIGN KEY ("roosterId") REFERENCES "se_roosters" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "se_inschrijvingen_leerlingId_fkey" FOREIGN KEY ("leerlingId") REFERENCES "leerlingen" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "se_inschrijvingen_lesId_fkey" FOREIGN KEY ("lesId") REFERENCES "se_lessen" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "toetsweken" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "naam" TEXT NOT NULL,
    "schooljaar" TEXT NOT NULL,
    "datumVan" TEXT,
    "datumTot" TEXT,
    "status" TEXT NOT NULL DEFAULT 'concept',
    "aangemaaktOp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bijgewerktOp" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "toets_lessen" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "toetsweekId" INTEGER NOT NULL,
    "vakId" INTEGER NOT NULL,
    "docentId" INTEGER,
    "lokaalId" INTEGER,
    "dag" INTEGER,
    "uur" INTEGER,
    "handmatigGezet" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "toets_lessen_toetsweekId_fkey" FOREIGN KEY ("toetsweekId") REFERENCES "toetsweken" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "toets_lessen_vakId_fkey" FOREIGN KEY ("vakId") REFERENCES "vakken" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "toets_lessen_docentId_fkey" FOREIGN KEY ("docentId") REFERENCES "docenten" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "toets_lessen_lokaalId_fkey" FOREIGN KEY ("lokaalId") REFERENCES "lokalen" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "toets_deelnames" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "toetsweekId" INTEGER NOT NULL,
    "leerlingId" INTEGER NOT NULL,
    "vakId" INTEGER NOT NULL,
    "toetsLesId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ingepland',
    CONSTRAINT "toets_deelnames_toetsweekId_fkey" FOREIGN KEY ("toetsweekId") REFERENCES "toetsweken" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "toets_deelnames_leerlingId_fkey" FOREIGN KEY ("leerlingId") REFERENCES "leerlingen" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "toets_deelnames_toetsLesId_fkey" FOREIGN KEY ("toetsLesId") REFERENCES "toets_lessen" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "schoolroosters" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "naam" TEXT NOT NULL,
    "schooljaar" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'concept',
    "aangemaaktOp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bijgewerktOp" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "klassen" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "roosterId" INTEGER NOT NULL,
    "naam" TEXT NOT NULL,
    "leerjaar" INTEGER NOT NULL,
    "niveau" TEXT NOT NULL,
    "aantalLeerlingen" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "klassen_roosterId_fkey" FOREIGN KEY ("roosterId") REFERENCES "schoolroosters" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lessen" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "klasId" INTEGER NOT NULL,
    "vakId" INTEGER NOT NULL,
    "aantalUurPerWeek" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "lessen_klasId_fkey" FOREIGN KEY ("klasId") REFERENCES "klassen" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lessen_vakId_fkey" FOREIGN KEY ("vakId") REFERENCES "vakken" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "rooster_slots" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "roosterId" INTEGER NOT NULL,
    "lesId" INTEGER,
    "docentId" INTEGER,
    "lokaalId" INTEGER,
    "dag" INTEGER NOT NULL,
    "uur" INTEGER NOT NULL,
    "handmatigGezet" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "rooster_slots_roosterId_fkey" FOREIGN KEY ("roosterId") REFERENCES "schoolroosters" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "rooster_slots_lesId_fkey" FOREIGN KEY ("lesId") REFERENCES "lessen" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "rooster_slots_docentId_fkey" FOREIGN KEY ("docentId") REFERENCES "docenten" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "rooster_slots_lokaalId_fkey" FOREIGN KEY ("lokaalId") REFERENCES "lokalen" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "leerling_slots" (
    "leerlingId" INTEGER NOT NULL,
    "slotId" INTEGER NOT NULL,

    PRIMARY KEY ("leerlingId", "slotId"),
    CONSTRAINT "leerling_slots_leerlingId_fkey" FOREIGN KEY ("leerlingId") REFERENCES "leerlingen" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "leerling_slots_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "rooster_slots" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "conflicten" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slotId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "beschrijving" TEXT NOT NULL,
    "opgelost" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "conflicten_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "rooster_slots" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "instellingen" (
    "sleutel" TEXT NOT NULL PRIMARY KEY,
    "waarde" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "import_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bestandsnaam" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "aantalRijen" INTEGER NOT NULL,
    "succes" INTEGER NOT NULL,
    "fouten" INTEGER NOT NULL,
    "foutDetails" TEXT,
    "aangemaaktOp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "leerlingen_magisterNummer_key" ON "leerlingen"("magisterNummer");

-- CreateIndex
CREATE UNIQUE INDEX "docenten_magisterCode_key" ON "docenten"("magisterCode");

-- CreateIndex
CREATE UNIQUE INDEX "vakken_code_key" ON "vakken"("code");

-- CreateIndex
CREATE UNIQUE INDEX "lokalen_code_key" ON "lokalen"("code");

-- CreateIndex
CREATE UNIQUE INDEX "se_inschrijvingen_roosterId_leerlingId_vakId_key" ON "se_inschrijvingen"("roosterId", "leerlingId", "vakId");

-- CreateIndex
CREATE UNIQUE INDEX "toets_deelnames_toetsweekId_leerlingId_vakId_key" ON "toets_deelnames"("toetsweekId", "leerlingId", "vakId");
