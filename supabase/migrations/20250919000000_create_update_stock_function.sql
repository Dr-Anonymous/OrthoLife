CREATE OR REPLACE FUNCTION update_stock(items_to_update JSONB)
RETURNS VOID AS $$
DECLARE
    item JSONB;
BEGIN
    FOR item IN SELECT * FROM jsonb_array_elements(items_to_update)
    LOOP
        UPDATE medicines
        SET stock_count = stock_count - (item->>'quantity')::INT,
            in_stock = (stock_count - (item->>'quantity')::INT) > 0
        WHERE id = item->>'id';
    END LOOP;
END;
$$ LANGUAGE plpgsql;
