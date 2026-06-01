-- CreateTable
CREATE TABLE "users" (
    "user_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hashed_password" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "max_tasks_per_day" INTEGER,
    "preferred_sleep_time" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "task_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "estimated_duration" INTEGER NOT NULL,
    "priority_level" INTEGER NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("task_id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "recommendation_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "suggested_start" TIMESTAMP(3) NOT NULL,
    "suggested_end" TIMESTAMP(3) NOT NULL,
    "feedback" TEXT,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("recommendation_id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "log_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "actual_start_time" TIMESTAMP(3) NOT NULL,
    "actual_end_time" TIMESTAMP(3) NOT NULL,
    "deviation_coefficient" DOUBLE PRECISION,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateIndex
CREATE INDEX "tasks_deadline_idx" ON "tasks"("deadline");

-- CreateIndex
CREATE INDEX "recommendations_suggested_start_suggested_end_idx" ON "recommendations"("suggested_start", "suggested_end");

-- CreateIndex
CREATE INDEX "activity_logs_actual_start_time_actual_end_time_idx" ON "activity_logs"("actual_start_time", "actual_end_time");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("task_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("task_id") ON DELETE CASCADE ON UPDATE CASCADE;
