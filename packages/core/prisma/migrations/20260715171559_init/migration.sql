-- CreateTable
CREATE TABLE "TaxUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pan" TEXT NOT NULL,
    "dateOfBirth" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "TaxUser_pan_key" ON "TaxUser"("pan");
