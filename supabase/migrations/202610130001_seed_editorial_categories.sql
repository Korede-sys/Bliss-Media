-- Seed the initial public sections used by the Bliss Media article composer.
-- Safe to re-run: existing category slugs are updated, not duplicated.
insert into public.categories (name, slug, description)
values
  ('Technology', 'technology', 'Technology, science, digital culture, and innovation.'),
  ('Entertainment', 'entertainment', 'Film, television, music, creators, and popular culture.'),
  ('Lifestyle', 'lifestyle', 'Living, wellbeing, style, food, travel, and everyday culture.'),
  ('Business', 'business', 'Companies, entrepreneurship, markets, careers, and the economy.'),
  ('News', 'news', 'Important developments and perspectives on the world around us.')
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    updated_at = now();
