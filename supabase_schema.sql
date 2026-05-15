-- SIMPLIFIED SCHEMA FOR GSO SYSTEM
-- Drop existing tables to start clean and avoid case mismatch
DROP TABLE IF EXISTS line_items CASCADE;
DROP TABLE IF EXISTS "GSOID" CASCADE;
DROP TABLE IF EXISTS gsoid CASCADE;
DROP TABLE IF EXISTS inventory_master CASCADE;
DROP TABLE IF EXISTS delivery_receipts CASCADE;
DROP TABLE IF EXISTS ris_requests CASCADE;

-- Root table for all PRs and RIS
CREATE TABLE gsoid (
    id TEXT PRIMARY KEY, -- GSOIDMMDDYYXXX
    pr TEXT,
    budget TEXT,
    bac TEXT,
    department TEXT NOT NULL,
    date DATE NOT NULL,
    requested_by TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, COMPLETE, DISCREPANCY
    type TEXT NOT NULL, -- PR or RIS
    remarks TEXT,
    admin_remarks TEXT,
    is_linked BOOLEAN DEFAULT FALSE,
    linked_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Line items linked to GSOID
CREATE TABLE line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gsoid_id TEXT REFERENCES gsoid(id) ON DELETE CASCADE,
    section TEXT,
    stock_no TEXT,
    unit TEXT NOT NULL,
    item_description TEXT NOT NULL,
    qty NUMERIC NOT NULL DEFAULT 0,
    unit_cost NUMERIC NOT NULL DEFAULT 0,
    total_cost NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Global inventory tracking
CREATE TABLE inventory_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_description TEXT UNIQUE NOT NULL,
    unit TEXT NOT NULL,
    quantity_on_hand NUMERIC DEFAULT 0 CHECK (quantity_on_hand >= 0),
    unit_cost NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Delivery Receipts for Warehouse
CREATE TABLE delivery_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gsoid TEXT NOT NULL REFERENCES gsoid(id),
    actual_items_received NUMERIC NOT NULL,
    inspection_status TEXT NOT NULL CHECK (inspection_status IN ('COMPLETE', 'DISCREPANCY')),
    warehouse_remarks TEXT,
    inspected_by TEXT NOT NULL,
    inspection_date DATE NOT NULL,
    dr_number TEXT UNIQUE NOT NULL, -- Auto-generated DR-YYYYMM-XXX
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RIS database as requested in gais251805.txt
CREATE TABLE ris_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gsoid TEXT NOT NULL REFERENCES gsoid(id) ON DELETE CASCADE,
    department TEXT NOT NULL,
    date DATE NOT NULL,
    requested_by TEXT NOT NULL,
    item_description TEXT NOT NULL,
    unit TEXT NOT NULL,
    qty NUMERIC NOT NULL DEFAULT 0,
    section TEXT,
    stock_no TEXT,
    remarks TEXT,
    status TEXT DEFAULT 'PENDING',
    approved_by TEXT,
    actual_received NUMERIC,
    is_issued BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_gsoid_status ON gsoid(status);
CREATE INDEX IF NOT EXISTS idx_gsoid_type ON gsoid(type);
CREATE INDEX IF NOT EXISTS idx_line_items_gsoid ON line_items(gsoid_id);
CREATE INDEX IF NOT EXISTS idx_ris_requests_gsoid ON ris_requests(gsoid);
CREATE INDEX IF NOT EXISTS idx_ris_requests_item ON ris_requests(item_description);
CREATE INDEX IF NOT EXISTS idx_dr_gsoid ON delivery_receipts(gsoid);

-- Enable RLS
ALTER TABLE gsoid ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE ris_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_receipts ENABLE ROW LEVEL SECURITY;

-- Clear existing policies and create new ones
DO $$ 
BEGIN
    -- Drop old policies
    DROP POLICY IF EXISTS "Allow anon insert to gsoid" ON gsoid;
    DROP POLICY IF EXISTS "Allow anon insert to line_items" ON line_items;
    DROP POLICY IF EXISTS "Allow anon select from gsoid" ON gsoid;
    DROP POLICY IF EXISTS "Allow anon select from line_items" ON line_items;
    DROP POLICY IF EXISTS "Allow anon select from inventory_master" ON inventory_master;
    DROP POLICY IF EXISTS "Public Insert Inventory" ON inventory_master;
    DROP POLICY IF EXISTS "Public Insert RIS" ON ris_requests;
    DROP POLICY IF EXISTS "Public Select RIS" ON ris_requests;
    DROP POLICY IF EXISTS "Public Insert DR" ON delivery_receipts;
    DROP POLICY IF EXISTS "Public Select DR" ON delivery_receipts;
    
    -- GSOID Policies
    CREATE POLICY "Public Insert GSOID" ON gsoid FOR INSERT TO public WITH CHECK (true);
    CREATE POLICY "Public Select GSOID" ON gsoid FOR SELECT TO public USING (true);
    CREATE POLICY "Public Update GSOID" ON gsoid FOR UPDATE TO public USING (true) WITH CHECK (true);

    -- Line Items Policies
    CREATE POLICY "Public Insert Line Items" ON line_items FOR INSERT TO public WITH CHECK (true);
    CREATE POLICY "Public Select Line Items" ON line_items FOR SELECT TO public USING (true);
    CREATE POLICY "Public Update Line Items" ON line_items FOR UPDATE TO public USING (true) WITH CHECK (true);

    -- Inventory Policies
    CREATE POLICY "Public Insert Inventory" ON inventory_master FOR INSERT TO public WITH CHECK (true);
    CREATE POLICY "Public Select Inventory" ON inventory_master FOR SELECT TO public USING (true);
    CREATE POLICY "Public Update Inventory" ON inventory_master FOR UPDATE TO public USING (true) WITH CHECK (true);

    -- RIS Policies
    CREATE POLICY "Public Insert RIS" ON ris_requests FOR INSERT TO public WITH CHECK (true);
    CREATE POLICY "Public Select RIS" ON ris_requests FOR SELECT TO public USING (true);
    CREATE POLICY "Public Update RIS" ON ris_requests FOR UPDATE TO public USING (true) WITH CHECK (true);

    -- Delivery Receipts Policies
    CREATE POLICY "Public Insert DR" ON delivery_receipts FOR INSERT TO public WITH CHECK (true);
    CREATE POLICY "Public Select DR" ON delivery_receipts FOR SELECT TO public USING (true);
END $$;

-- Enable Realtime
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE gsoid;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'gsoid publication exists';
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE line_items;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'line_items publication exists';
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE inventory_master;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'inventory_master publication exists';
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE ris_requests;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'ris_requests publication exists';
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE delivery_receipts;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'delivery_receipts publication exists';
END $$;

-- Inventory Auto-Update Trigger
CREATE OR REPLACE FUNCTION update_inventory_on_dr_complete()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.inspection_status = 'COMPLETE' THEN
        -- Aggregate items with same description before inserting
        INSERT INTO inventory_master (item_description, unit, quantity_on_hand, unit_cost)
        SELECT 
            li.item_description,
            li.unit,
            SUM(li.qty) as total_qty,
            AVG(li.unit_cost) as avg_cost
        FROM line_items li
        WHERE li.gsoid_id = NEW.gsoid
        GROUP BY li.item_description, li.unit
        ON CONFLICT (item_description) 
        DO UPDATE SET 
            quantity_on_hand = inventory_master.quantity_on_hand + EXCLUDED.quantity_on_hand,
            unit_cost = EXCLUDED.unit_cost,
            updated_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

-- Inventory Deduction Trigger for RIS
CREATE OR REPLACE FUNCTION reduce_inventory_on_ris_issue()
RETURNS TRIGGER AS $$
DECLARE
    issued_qty NUMERIC;
BEGIN
    -- Deduct stock only when is_issued becomes true
    IF NEW.is_issued = true AND (OLD.is_issued = false OR OLD.is_issued IS NULL) THEN
        -- Use actual_received if present, otherwise use requested qty
        issued_qty := COALESCE(NEW.actual_received, NEW.qty);
        
        UPDATE inventory_master
        SET 
            quantity_on_hand = quantity_on_hand - issued_qty,
            updated_at = CURRENT_TIMESTAMP
        WHERE TRIM(UPPER(item_description)) = TRIM(UPPER(NEW.item_description));
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_inventory_after_dr ON delivery_receipts;
CREATE TRIGGER trg_update_inventory_after_dr
AFTER INSERT ON delivery_receipts
FOR EACH ROW
EXECUTE FUNCTION update_inventory_on_dr_complete();

DROP TRIGGER IF EXISTS trg_reduce_inventory_on_ris_issue ON ris_requests;
CREATE TRIGGER trg_reduce_inventory_on_ris_issue
AFTER UPDATE ON ris_requests
FOR EACH ROW
EXECUTE FUNCTION reduce_inventory_on_ris_issue();
