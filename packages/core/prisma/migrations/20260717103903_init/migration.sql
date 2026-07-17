-- CreateTable
CREATE TABLE "TaxUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pan" TEXT NOT NULL,
    "dob" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "TaxUser_pan_key" ON "TaxUser"("pan");
