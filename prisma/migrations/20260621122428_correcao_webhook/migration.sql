/*
  Warnings:

  - You are about to drop the column `webhook` on the `Origin` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Message" ADD COLUMN "webhook" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Origin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "key" TEXT NOT NULL
);
INSERT INTO "new_Origin" ("createdAt", "id", "key", "name", "status") SELECT "createdAt", "id", "key", "name", "status" FROM "Origin";
DROP TABLE "Origin";
ALTER TABLE "new_Origin" RENAME TO "Origin";
CREATE UNIQUE INDEX "Origin_key_key" ON "Origin"("key");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
