/*
  Warnings:

  - You are about to drop the column `preferred_sleep_time` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "end_time" TIMESTAMP(3),
ADD COLUMN     "start_time" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" DROP COLUMN "preferred_sleep_time",
ADD COLUMN     "sleep_end_minutes" INTEGER,
ADD COLUMN     "sleep_start_minutes" INTEGER;
