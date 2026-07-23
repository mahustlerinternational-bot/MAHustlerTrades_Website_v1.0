-- Persist normalized certificate placeholder positions configured in the LMS
-- certificate editor. Coordinates are ratios so layouts remain proportional
-- for landscape templates with different pixel or PDF page dimensions.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS certificate_layout JSONB NOT NULL DEFAULT
  '{
    "certificate_title":{"x":0.5,"y":0.32,"align":"center","font_size":30},
    "member_name":{"x":0.5,"y":0.51,"align":"center","font_size":28},
    "course_title":{"x":0.5,"y":0.67,"align":"center","font_size":20},
    "issued_date":{"x":0.5,"y":0.78,"align":"center","font_size":10}
  }'::JSONB;

ALTER TABLE public.courses
  DROP CONSTRAINT IF EXISTS courses_certificate_layout_is_object;
ALTER TABLE public.courses
  ADD CONSTRAINT courses_certificate_layout_is_object
  CHECK (jsonb_typeof(certificate_layout) = 'object');
