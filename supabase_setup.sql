-- Supabase Setup Script for GSO Procurement System
-- Execute this script in your Supabase SQL Editor if you encounter "schema cache" errors.

-- 1. Create the PR 'gsoid' and 'line_items' tables if they don't exist
CREATE TABLE IF NOT EXISTS public.gsoid (
  id text PRIMARY KEY,
  pr text,
  budget text,
  bac text,
  department text,
  date text,
  requested_by text,
  remarks text,
  type text,
  status text
);

CREATE TABLE IF NOT EXISTS public.line_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  gsoid_id text REFERENCES public.gsoid(id) ON DELETE CASCADE,
  section text,
  stock_no text,
  unit text,
  item_description text,
  qty numeric,
  unit_cost numeric,
  total_cost numeric
);

-- 2. Create the 'ris_requests' table for the RIS Module (Guest Phase Path A & B)
CREATE TABLE IF NOT EXISTS public.ris_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  gsoid text,
  department text,
  date text,
  requested_by text,
  item_description text,
  unit text,
  qty numeric,
  section text,
  stock_no text,
  remarks text,
  status text DEFAULT 'PENDING',
  approved_by text,
  actual_received numeric,
  is_issued boolean DEFAULT false
);

-- 3. Setup basic RLS (Allowing all for demonstration purposes as per generic unauthenticated setups)
-- NOTE: In a real-world production environment, adapt these RLS policies to authenticated users!
ALTER TABLE public.gsoid ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ris_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read all gsoid" ON public.gsoid FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert gsoid" ON public.gsoid FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update gsoid" ON public.gsoid FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous read all line_items" ON public.line_items FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert line_items" ON public.line_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update line_items" ON public.line_items FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous read all ris_requests" ON public.ris_requests FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert ris_requests" ON public.ris_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update ris_requests" ON public.ris_requests FOR UPDATE USING (true);
