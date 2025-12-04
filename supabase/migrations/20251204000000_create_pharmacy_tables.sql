-- Create pharmacy_items table
CREATE TABLE IF NOT EXISTS public.pharmacy_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    category TEXT,
    description TEXT,
    pack_size TEXT,
    prescription_required BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create pharmacy_inventory table
CREATE TABLE IF NOT EXISTS public.pharmacy_inventory (
    item_id UUID PRIMARY KEY REFERENCES public.pharmacy_items(id) ON DELETE CASCADE,
    sale_price NUMERIC NOT NULL DEFAULT 0,
    original_price NUMERIC DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    discount_percentage NUMERIC DEFAULT 0,
    is_individual BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.pharmacy_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_inventory ENABLE ROW LEVEL SECURITY;

-- Create policies for pharmacy_items
CREATE POLICY "Allow public read access to pharmacy_items"
ON public.pharmacy_items FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow public insert access to pharmacy_items"
ON public.pharmacy_items FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow public update access to pharmacy_items"
ON public.pharmacy_items FOR UPDATE
TO public
USING (true);

-- Create policies for pharmacy_inventory
CREATE POLICY "Allow public read access to pharmacy_inventory"
ON public.pharmacy_inventory FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow public insert access to pharmacy_inventory"
ON public.pharmacy_inventory FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow public update access to pharmacy_inventory"
ON public.pharmacy_inventory FOR UPDATE
TO public
USING (true);

-- Create indexes for performance
CREATE INDEX idx_pharmacy_items_name ON public.pharmacy_items(name);
CREATE INDEX idx_pharmacy_items_category ON public.pharmacy_items(category);
