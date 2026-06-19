-- CreateTable
CREATE TABLE "Mini" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "faction" TEXT,
    "isPainted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mini_pkey" PRIMARY KEY ("id")
);
