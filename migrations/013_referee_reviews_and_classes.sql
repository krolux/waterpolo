-- Private referee evaluation module. Ratings are visible only to administrators.

CREATE TABLE IF NOT EXISTS public.referee_profiles (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  referee_class text NOT NULL DEFAULT 'Klasa 2' CHECK (referee_class IN ('Klasa 2','Klasa 1','Związkowy')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.referee_category_multipliers (
  competition_id uuid PRIMARY KEY REFERENCES public.competitions(id) ON DELETE CASCADE,
  multiplier numeric(6,3) NOT NULL DEFAULT 1 CHECK (multiplier > 0 AND multiplier <= 100),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.referee_difficulty_multipliers (
  difficulty text PRIMARY KEY CHECK (difficulty IN ('Bardzo łatwy','Łatwy','Średni','Trudny','Bardzo trudny')),
  multiplier numeric(6,3) NOT NULL DEFAULT 1 CHECK (multiplier > 0 AND multiplier <= 100),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

INSERT INTO public.referee_difficulty_multipliers(difficulty,multiplier) VALUES
  ('Bardzo łatwy',0.8),('Łatwy',0.9),('Średni',1),('Trudny',1.15),('Bardzo trudny',1.3)
ON CONFLICT (difficulty) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.match_referee_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  referee_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  score integer NOT NULL CHECK (score BETWEEN 1 AND 10),
  difficulty text NOT NULL CHECK (difficulty IN ('Bardzo łatwy','Łatwy','Średni','Trudny','Bardzo trudny')),
  reviewed_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(match_id, referee_profile_id)
);

ALTER TABLE public.referee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referee_category_multipliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referee_difficulty_multipliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_referee_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.referee_profiles, public.referee_category_multipliers, public.referee_difficulty_multipliers, public.match_referee_reviews FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_current_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND lower(role::text) LIKE '%admin%');
$$;

CREATE OR REPLACE FUNCTION public.can_view_match_protocol(target_match_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.can_access_match_protocol(target_match_id) OR EXISTS(
   SELECT 1 FROM public.matches m JOIN public.profiles p ON p.id=auth.uid()
   WHERE m.id=target_match_id AND p.display_name IN (m.referee1,m.referee2)
 );
$$;
DROP POLICY IF EXISTS match_protocols_authorized_select ON public.match_protocols;
CREATE POLICY match_protocols_authorized_select ON public.match_protocols FOR SELECT USING (public.can_view_match_protocol(match_id));

CREATE OR REPLACE FUNCTION public.submit_match_referee_reviews(target_match_id uuid, ratings jsonb, match_difficulty text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE item jsonb; referee_name text; referee_id uuid; caller_ok boolean;
BEGIN
  IF match_difficulty NOT IN ('Bardzo łatwy','Łatwy','Średni','Trudny','Bardzo trudny') THEN RAISE EXCEPTION 'Nieprawidłowa trudność meczu'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.profiles p JOIN public.matches m ON m.id=target_match_id WHERE p.id=auth.uid() AND (lower(p.role::text) LIKE '%admin%' OR p.display_name=m.delegate)) INTO caller_ok;
  IF NOT caller_ok THEN RAISE EXCEPTION 'Tylko administrator lub delegat meczu może oceniać sędziów'; END IF;
  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(ratings,'[]'::jsonb)) LOOP
    referee_name := btrim(item->>'name');
    IF (item->>'score')::integer NOT BETWEEN 1 AND 10 THEN RAISE EXCEPTION 'Ocena musi być od 1 do 10'; END IF;
    SELECT p.id INTO referee_id FROM public.profiles p JOIN public.matches m ON m.id=target_match_id WHERE p.display_name=referee_name AND referee_name IN (m.referee1,m.referee2) LIMIT 1;
    IF referee_id IS NULL THEN RAISE EXCEPTION 'Nie znaleziono sędziego %', referee_name; END IF;
    INSERT INTO public.match_referee_reviews(match_id,referee_profile_id,score,difficulty,reviewed_by)
    VALUES(target_match_id,referee_id,(item->>'score')::integer,match_difficulty,auth.uid())
    ON CONFLICT(match_id,referee_profile_id) DO UPDATE SET score=EXCLUDED.score,difficulty=EXCLUDED.difficulty,reviewed_by=auth.uid(),updated_at=now();
  END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION public.set_referee_class(target_profile_id uuid, target_class text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.is_current_admin() THEN RAISE EXCEPTION 'Brak uprawnień'; END IF;
 IF target_class NOT IN ('Klasa 2','Klasa 1','Związkowy') THEN RAISE EXCEPTION 'Nieprawidłowa klasa'; END IF;
 INSERT INTO public.referee_profiles(profile_id,referee_class,updated_by) VALUES(target_profile_id,target_class,auth.uid())
 ON CONFLICT(profile_id) DO UPDATE SET referee_class=EXCLUDED.referee_class,updated_by=auth.uid(),updated_at=now();
END; $$;

CREATE OR REPLACE FUNCTION public.set_referee_multiplier(multiplier_kind text, target_key text, target_multiplier numeric) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.is_current_admin() THEN RAISE EXCEPTION 'Brak uprawnień'; END IF;
 IF target_multiplier <= 0 OR target_multiplier > 100 THEN RAISE EXCEPTION 'Nieprawidłowy mnożnik'; END IF;
 IF multiplier_kind='difficulty' THEN
   INSERT INTO public.referee_difficulty_multipliers(difficulty,multiplier,updated_by) VALUES(target_key,target_multiplier,auth.uid()) ON CONFLICT(difficulty) DO UPDATE SET multiplier=EXCLUDED.multiplier,updated_by=auth.uid(),updated_at=now();
 ELSIF multiplier_kind='category' THEN
   INSERT INTO public.referee_category_multipliers(competition_id,multiplier,updated_by) VALUES(target_key::uuid,target_multiplier,auth.uid()) ON CONFLICT(competition_id) DO UPDATE SET multiplier=EXCLUDED.multiplier,updated_by=auth.uid(),updated_at=now();
 ELSE RAISE EXCEPTION 'Nieprawidłowy rodzaj mnożnika'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.get_referee_dashboard() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
WITH guard AS (SELECT public.is_current_admin() ok), refs AS (
 SELECT p.id,p.display_name,COALESCE(rp.referee_class,'Klasa 2') referee_class
 FROM public.profiles p LEFT JOIN public.referee_profiles rp ON rp.profile_id=p.id, guard
 WHERE guard.ok AND lower(p.role::text) LIKE '%referee%'
), assigned AS (
 SELECT r.id,r.display_name,r.referee_class,m.id match_id,m.date,m.home,m.away,m.result,c.id category_id,COALESCE(c.short_name,c.name,'Inna kategoria') category_name,
   review.score,review.difficulty,COALESCE(cm.multiplier,1) category_multiplier,COALESCE(dm.multiplier,1) difficulty_multiplier,
   (review.score*COALESCE(cm.multiplier,1)*COALESCE(dm.multiplier,1))::numeric(10,2) weighted_score
 FROM refs r JOIN public.matches m ON r.display_name IN(m.referee1,m.referee2)
 LEFT JOIN public.competition_seasons cs ON cs.id=m.competition_season_id LEFT JOIN public.competitions c ON c.id=cs.competition_id
 LEFT JOIN public.match_referee_reviews review ON review.match_id=m.id AND review.referee_profile_id=r.id
 LEFT JOIN public.referee_category_multipliers cm ON cm.competition_id=c.id LEFT JOIN public.referee_difficulty_multipliers dm ON dm.difficulty=review.difficulty
), summaries AS (
 SELECT r.id,r.display_name,r.referee_class,count(a.match_id)::int match_count,round(avg(a.weighted_score),2) average_score,
 COALESCE(jsonb_agg(jsonb_build_object('id',a.match_id,'date',a.date,'home',a.home,'away',a.away,'result',COALESCE(a.result,''),'categoryId',a.category_id,'categoryName',a.category_name,'rawScore',a.score,'difficulty',a.difficulty,'weightedScore',a.weighted_score) ORDER BY a.date DESC) FILTER(WHERE a.match_id IS NOT NULL),'[]'::jsonb) matches
 FROM refs r LEFT JOIN assigned a ON a.id=r.id GROUP BY r.id,r.display_name,r.referee_class
)
SELECT CASE WHEN public.is_current_admin() THEN jsonb_build_object(
 'referees',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'name',display_name,'class',referee_class,'matchCount',match_count,'averageScore',average_score,'matches',matches) ORDER BY display_name) FROM summaries),'[]'::jsonb),
 'categories',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',c.id,'name',COALESCE(c.short_name,c.name),'multiplier',COALESCE(cm.multiplier,1)) ORDER BY c.name) FROM public.competitions c LEFT JOIN public.referee_category_multipliers cm ON cm.competition_id=c.id),'[]'::jsonb),
 'difficulties',COALESCE((SELECT jsonb_agg(jsonb_build_object('name',difficulty,'multiplier',multiplier) ORDER BY CASE difficulty WHEN 'Bardzo łatwy' THEN 1 WHEN 'Łatwy' THEN 2 WHEN 'Średni' THEN 3 WHEN 'Trudny' THEN 4 ELSE 5 END) FROM public.referee_difficulty_multipliers),'[]'::jsonb)
) ELSE jsonb_build_object('referees','[]'::jsonb,'categories','[]'::jsonb,'difficulties','[]'::jsonb) END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_referee_class() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT CASE WHEN lower(p.role::text) LIKE '%referee%' OR lower(p.role::text) LIKE '%admin%' THEN COALESCE(rp.referee_class,'Klasa 2') ELSE NULL END
 FROM public.profiles p LEFT JOIN public.referee_profiles rp ON rp.profile_id=p.id WHERE p.id=auth.uid();
$$;

REVOKE ALL ON FUNCTION public.submit_match_referee_reviews(uuid,jsonb,text), public.set_referee_class(uuid,text), public.set_referee_multiplier(text,text,numeric), public.get_referee_dashboard(), public.get_my_referee_class() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_match_referee_reviews(uuid,jsonb,text), public.set_referee_class(uuid,text), public.set_referee_multiplier(text,text,numeric), public.get_referee_dashboard(), public.get_my_referee_class() TO authenticated;
