-- AlterTable
ALTER TABLE "Module" ADD COLUMN     "copiedFromId" TEXT;

-- CreateTable
CREATE TABLE "HiddenModule" (
    "psychologistId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HiddenModule_pkey" PRIMARY KEY ("psychologistId","moduleId")
);

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_copiedFromId_fkey" FOREIGN KEY ("copiedFromId") REFERENCES "Module"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HiddenModule" ADD CONSTRAINT "HiddenModule_psychologistId_fkey" FOREIGN KEY ("psychologistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HiddenModule" ADD CONSTRAINT "HiddenModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
