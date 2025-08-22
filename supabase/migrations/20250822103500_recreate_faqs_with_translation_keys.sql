-- Drop the existing faqs table to redefine its structure
DROP TABLE IF EXISTS faqs;

-- Recreate the faqs table with translation keys
CREATE TABLE faqs (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    question_key TEXT NOT NULL,
    answer_key TEXT NOT NULL,
    category_id BIGINT REFERENCES categories(id)
);

-- RLS policies for faqs
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public faqs are viewable by everyone." ON faqs FOR SELECT USING (true);
CREATE POLICY "Admins can insert faqs." ON faqs FOR INSERT WITH CHECK (true); -- In a real app, you would check for an admin role
CREATE POLICY "Admins can update faqs." ON faqs FOR UPDATE USING (true); -- In a real app, you would check for an admin role
CREATE POLICY "Admins can delete faqs." ON faqs FOR DELETE USING (true); -- In a real app, you would check for an admin role


-- Insert the FAQs using translation keys
INSERT INTO faqs (category_id, question_key, answer_key) VALUES
((SELECT id FROM categories WHERE name = 'Appointments'), 'faq.q1.question', 'faq.q1.answer'),
((SELECT id FROM categories WHERE name = 'Appointments'), 'faq.q2.question', 'faq.q2.answer'),
((SELECT id FROM categories WHERE name = 'Appointments'), 'faq.q12.question', 'faq.q12.answer'),
((SELECT id FROM categories WHERE name = 'Surgery'), 'faq.q3.question', 'faq.q3.answer'),
((SELECT id FROM categories WHERE name = 'Surgery'), 'faq.q4.question', 'faq.q4.answer'),
((SELECT id FROM categories WHERE name = 'Recovery'), 'faq.q5.question', 'faq.q5.answer'),
((SELECT id FROM categories WHERE name = 'Recovery'), 'faq.q6.question', 'faq.q6.answer'),
((SELECT id FROM categories WHERE name = 'Insurance'), 'faq.q7.question', 'faq.q7.answer'),
((SELECT id FROM categories WHERE name = 'Insurance'), 'faq.q8.question', 'faq.q8.answer'),
((SELECT id FROM categories WHERE name = 'Pain Management'), 'faq.q9.question', 'faq.q9.answer'),
((SELECT id FROM categories WHERE name = 'Physical Therapy'), 'faq.q10.question', 'faq.q10.answer'),
((SELECT id FROM categories WHERE name = 'Physical Therapy'), 'faq.q11.question', 'faq.q11.answer');
