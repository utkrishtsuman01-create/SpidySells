ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS opening_hours text
  NOT NULL
  DEFAULT 'Open 4:00 PM – 7:30 PM · Closed Tuesdays & Fridays';

UPDATE public.branches
SET opening_hours = 'Open 4:00 PM – 7:30 PM · Closed Tuesdays & Fridays'
WHERE opening_hours IS NULL OR btrim(opening_hours) = '';
