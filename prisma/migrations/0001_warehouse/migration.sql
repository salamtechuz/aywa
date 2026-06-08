-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorageCategory" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER,
    "maxWeight" DOUBLE PRECISION,
    "allowNew" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorageCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INTERNAL',
    "code" TEXT NOT NULL,
    "warehouseId" TEXT,
    "storageCategoryId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationType" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'RECEIPT',
    "code" TEXT NOT NULL,
    "warehouseId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitOfMeasure" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'UNIT',
    "factor" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "referenceUnit" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitOfMeasure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Warehouse_workspaceId_active_idx" ON "Warehouse"("workspaceId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_workspaceId_code_key" ON "Warehouse"("workspaceId", "code");

-- CreateIndex
CREATE INDEX "StorageCategory_workspaceId_active_idx" ON "StorageCategory"("workspaceId", "active");

-- CreateIndex
CREATE INDEX "Location_workspaceId_type_idx" ON "Location"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "Location_workspaceId_warehouseId_idx" ON "Location"("workspaceId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "Location_workspaceId_code_key" ON "Location"("workspaceId", "code");

-- CreateIndex
CREATE INDEX "OperationType_workspaceId_type_idx" ON "OperationType"("workspaceId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "OperationType_workspaceId_code_key" ON "OperationType"("workspaceId", "code");

-- CreateIndex
CREATE INDEX "UnitOfMeasure_workspaceId_category_idx" ON "UnitOfMeasure"("workspaceId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "UnitOfMeasure_workspaceId_name_key" ON "UnitOfMeasure"("workspaceId", "name");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_storageCategoryId_fkey" FOREIGN KEY ("storageCategoryId") REFERENCES "StorageCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationType" ADD CONSTRAINT "OperationType_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

