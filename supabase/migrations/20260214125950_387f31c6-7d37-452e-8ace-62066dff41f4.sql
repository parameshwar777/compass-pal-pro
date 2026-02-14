
-- Add a 'label' column to location_logs so users can tag locations (home, office, gym, etc.)
ALTER TABLE public.location_logs ADD COLUMN IF NOT EXISTS label text;
