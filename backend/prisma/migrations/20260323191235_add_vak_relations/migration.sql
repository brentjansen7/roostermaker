-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_se_inschrijvingen" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "roosterId" INTEGER NOT NULL,
    "leerlingId" INTEGER NOT NULL,
    "vakId" INTEGER NOT NULL,
    "lesId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ingeschreven',
    CONSTRAINT "se_inschrijvingen_roosterId_fkey" FOREIGN KEY ("roosterId") REFERENCES "se_roosters" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "se_inschrijvingen_leerlingId_fkey" FOREIGN KEY ("leerlingId") REFERENCES "leerlingen" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "se_inschrijvingen_vakId_fkey" FOREIGN KEY ("vakId") REFERENCES "vakken" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "se_inschrijvingen_lesId_fkey" FOREIGN KEY ("lesId") REFERENCES "se_lessen" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_se_inschrijvingen" ("id", "leerlingId", "lesId", "roosterId", "status", "vakId") SELECT "id", "leerlingId", "lesId", "roosterId", "status", "vakId" FROM "se_inschrijvingen";
DROP TABLE "se_inschrijvingen";
ALTER TABLE "new_se_inschrijvingen" RENAME TO "se_inschrijvingen";
CREATE UNIQUE INDEX "se_inschrijvingen_roosterId_leerlingId_vakId_key" ON "se_inschrijvingen"("roosterId", "leerlingId", "vakId");
CREATE TABLE "new_toets_deelnames" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "toetsweekId" INTEGER NOT NULL,
    "leerlingId" INTEGER NOT NULL,
    "vakId" INTEGER NOT NULL,
    "toetsLesId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ingepland',
    CONSTRAINT "toets_deelnames_toetsweekId_fkey" FOREIGN KEY ("toetsweekId") REFERENCES "toetsweken" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "toets_deelnames_leerlingId_fkey" FOREIGN KEY ("leerlingId") REFERENCES "leerlingen" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "toets_deelnames_vakId_fkey" FOREIGN KEY ("vakId") REFERENCES "vakken" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "toets_deelnames_toetsLesId_fkey" FOREIGN KEY ("toetsLesId") REFERENCES "toets_lessen" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_toets_deelnames" ("id", "leerlingId", "status", "toetsLesId", "toetsweekId", "vakId") SELECT "id", "leerlingId", "status", "toetsLesId", "toetsweekId", "vakId" FROM "toets_deelnames";
DROP TABLE "toets_deelnames";
ALTER TABLE "new_toets_deelnames" RENAME TO "toets_deelnames";
CREATE UNIQUE INDEX "toets_deelnames_toetsweekId_leerlingId_vakId_key" ON "toets_deelnames"("toetsweekId", "leerlingId", "vakId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
