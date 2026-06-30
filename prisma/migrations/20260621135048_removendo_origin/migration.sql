/*
  Warnings:

  - You are about to drop the `Origin` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `originId` on the `Message` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Origin_key_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Origin";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "webhook" TEXT,
    "webhookSent" BOOLEAN NOT NULL DEFAULT false,
    "webhookSentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "forAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Message" ("createdAt", "forAt", "id", "phone", "status", "text", "type", "webhook", "webhookSent", "webhookSentAt") SELECT "createdAt", "forAt", "id", "phone", "status", "text", "type", "webhook", "webhookSent", "webhookSentAt" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
