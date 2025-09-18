CREATE TABLE medicines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    price NUMERIC(10, 2) DEFAULT 0.00,
    original_price NUMERIC(10, 2) DEFAULT 0.00,
    discount NUMERIC(5, 2) DEFAULT 0.00,
    stock_count INTEGER DEFAULT 0,
    in_stock BOOLEAN DEFAULT TRUE,
    prescription_required BOOLEAN DEFAULT FALSE,
    pack_size TEXT,
    manufacturer TEXT,
    dosage TEXT,
    is_grouped BOOLEAN DEFAULT FALSE,
    sizes JSONB,
    individual TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
