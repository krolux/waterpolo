ALTER TABLE public.roster_submissions
ADD COLUMN IF NOT EXISTS verification_code text;

CREATE INDEX IF NOT EXISTS roster_submissions_verification_code_idx
ON public.roster_submissions (verification_code);
