-- AlterTable
ALTER TABLE "Module" ADD COLUMN     "allowAudio" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowImages" BOOLEAN NOT NULL DEFAULT false;
