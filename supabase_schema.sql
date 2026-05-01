-- SIMPLIFIED SCHEMA FOR GSO SYSTEM
-- Drop existing tables to start clean and avoid case mismatch
DROP TABLE IF EXISTS line_items CASCADE;
DROP TABLE IF EXISTS "GSOID" CASCADE;
DROP TABLE IF EXISTS gsoid CASCADE;
DROP TABLE IF EXISTS inventory_master CASCADE;

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
    quantity_on_hand NUMERIC DEFAULT 0,
    unit_cost NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RIS database as requested in gais251805.txt
CREATE TABLE ris_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gsoid TEXT NOT NULL,
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

-- Enable RLS
ALTER TABLE gsoid ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE ris_requests ENABLE ROW LEVEL SECURITY;

-- Clear existing policies to avoid conflicts with older versions
DO $$ 
BEGIN
    -- Drop old policies if they exist (using common names from previous iterations)
    DROP POLICY IF EXISTS "Allow anon insert to gsoid" ON gsoid;
    DROP POLICY IF EXISTS "Allow anon insert to line_items" ON line_items;
    DROP POLICY IF EXISTS "Allow anon select from gsoid" ON gsoid;
    DROP POLICY IF EXISTS "Allow anon select from line_items" ON line_items;
    DROP POLICY IF EXISTS "Allow anon select from inventory_master" ON inventory_master;
    DROP POLICY IF EXISTS "Public Insert RIS" ON ris_requests;
    DROP POLICY IF EXISTS "Public Select RIS" ON ris_requests;
    
    -- GSOID Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Insert GSOID') THEN
        CREATE POLICY "Public Insert GSOID" ON gsoid FOR INSERT TO public WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Select GSOID') THEN
        CREATE POLICY "Public Select GSOID" ON gsoid FOR SELECT TO public USING (true);
    END IF;

    -- Line Items Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Insert Line Items') THEN
        CREATE POLICY "Public Insert Line Items" ON line_items FOR INSERT TO public WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Select Line Items') THEN
        CREATE POLICY "Public Select Line Items" ON line_items FOR SELECT TO public USING (true);
    END IF;

    -- Inventory Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Select Inventory') THEN
        CREATE POLICY "Public Select Inventory" ON inventory_master FOR SELECT TO public USING (true);
    END IF;

    -- RIS Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Insert RIS') THEN
        CREATE POLICY "Public Insert RIS" ON ris_requests FOR INSERT TO public WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Select RIS') THEN
        CREATE POLICY "Public Select RIS" ON ris_requests FOR SELECT TO public USING (true);
    END IF;
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
