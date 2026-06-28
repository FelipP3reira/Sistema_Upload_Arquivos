-- CreateTable
CREATE TABLE "arquivos" (
    "id" UUID NOT NULL,
    "chave" TEXT NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "donoId" TEXT NOT NULL,
    "thumbnailChave" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arquivos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "arquivos_chave_key" ON "arquivos"("chave");

-- CreateIndex
CREATE INDEX "arquivos_donoId_idx" ON "arquivos"("donoId");
