-- CreateTable
CREATE TABLE "Founder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "companyWebsite" TEXT NOT NULL,
    "companyPhase" TEXT NOT NULL,
    "industry" TEXT,
    "industryEnriched" BOOLEAN NOT NULL DEFAULT false,
    "lookingFor" TEXT NOT NULL,
    "offering" TEXT NOT NULL,
    "availableSlots" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MatchSuggestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "founderAId" TEXT NOT NULL,
    "founderBId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "suggestedSlot" TEXT NOT NULL,
    "reasonForA" TEXT NOT NULL,
    "reasonForB" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'suggested',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" DATETIME,
    CONSTRAINT "MatchSuggestion_founderAId_fkey" FOREIGN KEY ("founderAId") REFERENCES "Founder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MatchSuggestion_founderBId_fkey" FOREIGN KEY ("founderBId") REFERENCES "Founder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchSuggestion_founderAId_founderBId_key" ON "MatchSuggestion"("founderAId", "founderBId");
