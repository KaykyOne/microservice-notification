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
    "originId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "forAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_originId_fkey" FOREIGN KEY ("originId") REFERENCES "Origin" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("createdAt", "forAt", "id", "originId", "phone", "status", "text", "type", "webhook") SELECT "createdAt", "forAt", "id", "originId", "phone", "status", "text", "type", "webhook" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
