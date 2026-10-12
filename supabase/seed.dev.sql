-- Local development/demo fixtures only. Never run this file against production.
-- Existing rows are preserved; conflicts are intentionally ignored.
insert into public.categories (name, slug, description) values
  ('Technology', 'technology', 'Ideas and tools shaping tomorrow.'),
  ('Entertainment', 'entertainment', 'The people and stories moving culture.'),
  ('Lifestyle', 'lifestyle', 'Thoughtful living, design and wellbeing.'),
  ('Business', 'business', 'Work, leadership and new ways to build.'),
  ('News', 'news', 'Context for the moments that matter.')
on conflict do nothing;

insert into public.tags (name, slug) values
  ('Artificial intelligence', 'artificial-intelligence'),
  ('Culture', 'culture'),
  ('Design', 'design'),
  ('Leadership', 'leadership'),
  ('Wellbeing', 'wellbeing')
on conflict do nothing;
