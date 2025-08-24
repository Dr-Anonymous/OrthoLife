-- Add new categories for FAQs
INSERT INTO categories (name)
VALUES ('Appointments'), ('Insurance')
ON CONFLICT (name) DO NOTHING;

-- Create the faqs table
CREATE TABLE faqs (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category_id BIGINT REFERENCES categories(id)
);

-- Insert the FAQs
INSERT INTO faqs (category_id, question, answer) VALUES
((SELECT id FROM categories WHERE name = 'Appointments'), 'How do I book an appointment?', 'You can book an appointment through our website on the appointments page, or by calling our clinic directly. We also offer online booking through our patient portal.'),
((SELECT id FROM categories WHERE name = 'Appointments'), 'What should I bring to my first appointment?', 'Please bring your photo ID, insurance card, any referral letters, and a list of your current medications. If you have recent X-rays or medical records, please bring those as well.'),
((SELECT id FROM categories WHERE name = 'Appointments'), 'How can I cancel or reschedule my appointment?', 'You can cancel or reschedule your appointment by calling our office at least 24 hours in advance. You can also manage your appointments through our online patient portal.'),
((SELECT id FROM categories WHERE name = 'Surgery'), 'How should I prepare for my surgery?', 'Your surgeon will provide you with specific instructions, but generally, you should not eat or drink after midnight the night before your surgery. Arrange for someone to drive you home and stay with you for the first 24 hours.'),
((SELECT id FROM categories WHERE name = 'Surgery'), 'What is the typical recovery time for orthopedic surgery?', 'Recovery time varies greatly depending on the type of surgery. Your surgeon will give you a personalized recovery timeline. Physical therapy is often a crucial part of a successful recovery.'),
((SELECT id FROM categories WHERE name = 'Recovery'), 'What kind of support will I need at home after surgery?', 'Depending on your surgery, you may need help with daily activities like cooking, cleaning, and personal care. It is also important to have someone to help you with your prescribed exercises.'),
((SELECT id FROM categories WHERE name = 'Recovery'), 'When can I return to work or sports?', 'This depends on your job, the sport you play, and the type of surgery you had. Your surgeon will provide guidance on when it is safe to return to your normal activities.'),
((SELECT id FROM categories WHERE name = 'Insurance'), 'Do you accept my insurance?', 'We accept a wide range of insurance plans. Please visit our Insurance page or call our office to verify if we are in-network with your provider.'),
((SELECT id FROM categories WHERE name = 'Insurance'), 'What if my insurance does not cover the full cost?', 'You will be responsible for any co-payments, deductibles, or non-covered services. We offer payment plans and can provide you with an estimated cost of your treatment.'),
((SELECT id FROM categories WHERE name = 'Pain Management'), 'What are my options for pain management?', 'We offer a variety of pain management options, including medication, physical therapy, injections, and minimally invasive procedures. Your doctor will work with you to create a personalized pain management plan.'),
((SELECT id FROM categories WHERE name = 'Physical Therapy'), 'Why is physical therapy important?', 'Physical therapy helps to restore strength, flexibility, and function after an injury or surgery. It is a key component of a successful recovery and can help prevent future injuries.'),
((SELECT id FROM categories WHERE name = 'Physical Therapy'), 'How long will I need physical therapy?', 'The duration of physical therapy depends on your specific condition and recovery goals. Your therapist will create a customized treatment plan and and adjust it as you progress.');
