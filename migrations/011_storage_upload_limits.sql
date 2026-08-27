-- Enforce file restrictions at the Storage layer as well as in the browser.
UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'article-images';

UPDATE storage.buckets
SET file_size_limit = 20971520,
    allowed_mime_types = ARRAY['application/pdf']
WHERE id = 'ktpw-documents';

UPDATE storage.buckets
SET file_size_limit = 20971520,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
WHERE id = 'docs2';
