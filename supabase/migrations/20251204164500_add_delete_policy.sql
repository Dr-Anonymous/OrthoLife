-- Add DELETE policy for pharmacy_items
CREATE POLICY "Allow public delete access to pharmacy_items"
ON public.pharmacy_items FOR DELETE
TO public
USING (true);
