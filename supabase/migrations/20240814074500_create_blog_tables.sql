-- Create the categories table
CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- Create the posts table
CREATE TABLE posts (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    title TEXT NOT NULL,
    excerpt TEXT,
    content TEXT,
    image_url TEXT,
    read_time_minutes INT,
    category_id BIGINT REFERENCES categories(id)
);

-- Insert seed data into the categories table
INSERT INTO categories (name) VALUES
('Bone Health'),
('Osteoporosis'),
('Surgery Recovery'),
('Pain Management'),
('Physical Therapy');

-- Insert seed data into the posts table
INSERT INTO posts (title, excerpt, content, image_url, read_time_minutes, category_id) VALUES
(
    '5 Essential Tips for Maintaining Healthy Bones',
    'Learn about the key nutrients and exercises that keep your bones strong and healthy throughout life.',
    'Learn about the key nutrients and exercises that keep your bones strong and healthy throughout life. This includes getting enough calcium and vitamin D, engaging in weight-bearing exercises, and avoiding smoking and excessive alcohol consumption.',
    'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=500&h=300&fit=crop',
    5,
    (SELECT id FROM categories WHERE name = 'Bone Health')
),
(
    'Understanding Osteoporosis: Prevention and Treatment',
    'A comprehensive guide to understanding osteoporosis, its risk factors, and modern treatment approaches.',
    'A comprehensive guide to understanding osteoporosis, its risk factors, and modern treatment approaches. We will cover the role of diet, exercise, and medication in managing this condition.',
    'https/images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=500&h=300&fit=crop',
    8,
    (SELECT id FROM categories WHERE name = 'Osteoporosis')
),
(
    'Post-Surgery Recovery: What to Expect',
    'Essential information about the recovery process after orthopedic surgery and how to optimize healing.',
    'Essential information about the recovery process after orthopedic surgery and how to optimize healing. This post will guide you through the different stages of recovery, from the hospital to your home.',
    'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=500&h=300&fit=crop',
    6,
    (SELECT id FROM categories WHERE name = 'Surgery Recovery')
),
(
    'Managing Chronic Joint Pain Naturally',
    'Discover natural methods and lifestyle changes that can help reduce chronic joint pain and inflammation.',
    'Discover natural methods and lifestyle changes that can help reduce chronic joint pain and inflammation. We will explore various techniques, from acupuncture to anti-inflammatory diets.',
    'https://images.unsplash.com/photo-1594824369069-c9a3dd6e2019?w=500&h=300&fit=crop',
    7,
    (SELECT id FROM categories WHERE name = 'Pain Management')
),
(
    'The Role of Physical Therapy in Recovery',
    'Understanding how physical therapy accelerates healing and prevents future injuries.',
    'Understanding how physical therapy accelerates healing and prevents future injuries. This post will detail the benefits of physical therapy and what to expect from a session.',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&h=300&fit=crop',
    5,
    (SELECT id FROM categories WHERE name = 'Physical Therapy')
);
