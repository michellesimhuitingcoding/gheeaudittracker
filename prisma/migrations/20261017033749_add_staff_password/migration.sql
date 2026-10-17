/*
  Warnings:

  - Added the required column `passwordHash` to the `Staff` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "passwordHash" TEXT NOT NULL;
