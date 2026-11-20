
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

-- ============ SCHOOLS ============
CREATE TABLE public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  district text NOT NULL DEFAULT 'West Des Moines Community Schools',
  grades_supported int[] NOT NULL DEFAULT '{}',
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.schools TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.schools TO authenticated;
GRANT ALL ON public.schools TO service_role;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- ============ COURSES ============
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_name text NOT NULL,
  subject text NOT NULL DEFAULT 'Other',
  grades int[] NOT NULL DEFAULT '{}',
  school text,
  description text,
  active boolean NOT NULL DEFAULT true,
  is_custom boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX courses_grades_idx ON public.courses USING gin (grades);
CREATE INDEX courses_subject_idx ON public.courses (subject);
GRANT SELECT ON public.courses TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- ============ ROLES ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone reads active schools" ON public.schools FOR SELECT TO anon, authenticated
  USING (active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage schools" ON public.schools FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Read catalog and own custom courses" ON public.courses FOR SELECT TO anon, authenticated
  USING ((active AND NOT is_custom) OR created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Students add custom courses" ON public.courses FOR INSERT TO authenticated
  WITH CHECK (is_custom AND created_by = auth.uid());
CREATE POLICY "Admins manage courses" ON public.courses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ SETTINGS ============
CREATE TABLE public.app_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  allowed_email_domains text[] NOT NULL DEFAULT '{}',
  require_admin_approval boolean NOT NULL DEFAULT false,
  admin_emails text[] NOT NULL DEFAULT '{}',
  ai_enabled boolean NOT NULL DEFAULT true,
  ai_hourly_limit int NOT NULL DEFAULT 60,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.app_settings (id) VALUES (1);
GRANT SELECT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read settings" ON public.app_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update settings" ON public.app_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  email text NOT NULL,
  grade int,
  requested_grade int,
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  eligibility_status text NOT NULL DEFAULT 'pending' CHECK (eligibility_status IN ('pending','approved','rejected')),
  eligibility_note text,
  guardian_consent boolean NOT NULL DEFAULT false,
  guardian_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Students cannot change protected fields
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.email := OLD.email;
    NEW.grade := OLD.grade;
    NEW.eligibility_status := OLD.eligibility_status;
    NEW.eligibility_note := OLD.eligibility_note;
    IF NEW.requested_grade IS NOT NULL AND (NEW.requested_grade < 7 OR NEW.requested_grade > 12) THEN
      RAISE EXCEPTION 'Only grades 7 through 12 are supported';
    END IF;
    IF NEW.school_id IS DISTINCT FROM OLD.school_id AND NEW.school_id IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM public.schools s WHERE s.id = NEW.school_id AND s.active AND OLD.grade = ANY(s.grades_supported)) THEN
        RAISE EXCEPTION 'That school does not serve your grade';
      END IF;
    END IF;
  END IF;
  IF NEW.grade IS NOT NULL AND (NEW.grade < 7 OR NEW.grade > 12) THEN
    RAISE EXCEPTION 'Only grades 7 through 12 are supported';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER protect_profile_fields BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

CREATE OR REPLACE FUNCTION public.is_approved(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND eligibility_status = 'approved')
$$;

-- ============ ELIGIBILITY CHECK (callable before sign-up) ============
CREATE OR REPLACE FUNCTION public.check_signup_eligibility(_email text, _grade int, _school_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.app_settings;
  domain text := lower(split_part(coalesce(_email,''), '@', 2));
BEGIN
  SELECT * INTO s FROM public.app_settings WHERE id = 1;
  IF lower(coalesce(_email,'')) = ANY (SELECT lower(x) FROM unnest(s.admin_emails) x) THEN
    RETURN 'ok';
  END IF;
  IF _grade IS NULL OR _grade < 7 OR _grade > 12 THEN
    RETURN 'ClassPilot AI is only available to WDMCS students in grades 7 through 12.';
  END IF;
  IF array_length(s.allowed_email_domains, 1) > 0
     AND NOT (domain = ANY (SELECT lower(x) FROM unnest(s.allowed_email_domains) x)) THEN
    RETURN 'Please use your WDMCS school email address (' || array_to_string(s.allowed_email_domains, ', ') || ').';
  END IF;
  IF _school_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.schools WHERE id = _school_id AND active AND _grade = ANY(grades_supported)) THEN
    RETURN 'Please choose a WDMCS school that serves your grade.';
  END IF;
  RETURN 'ok';
END $$;
GRANT EXECUTE ON FUNCTION public.check_signup_eligibility(text, int, uuid) TO anon, authenticated;

-- ============ STUDENT COURSES ============
CREATE TABLE public.student_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, course_id)
);
CREATE INDEX student_courses_student_idx ON public.student_courses (student_id);
GRANT SELECT, INSERT, DELETE ON public.student_courses TO authenticated;
GRANT ALL ON public.student_courses TO service_role;
ALTER TABLE public.student_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own courses select" ON public.student_courses FOR SELECT TO authenticated
  USING (student_id = auth.uid());
CREATE POLICY "Own courses insert" ON public.student_courses FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() AND public.is_approved(auth.uid()));
CREATE POLICY "Own courses delete" ON public.student_courses FOR DELETE TO authenticated
  USING (student_id = auth.uid());

-- ============ NEW USER TRIGGER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  meta jsonb := coalesce(NEW.raw_user_meta_data, '{}'::jsonb);
  s public.app_settings;
  v_grade int;
  v_school uuid;
  v_check text;
  v_is_admin boolean;
  v_course text;
  v_custom text;
  v_new_course uuid;
BEGIN
  SELECT * INTO s FROM public.app_settings WHERE id = 1;
  v_is_admin := lower(NEW.email) = ANY (SELECT lower(x) FROM unnest(s.admin_emails) x);
  BEGIN v_grade := nullif(meta->>'grade','')::int; EXCEPTION WHEN others THEN v_grade := NULL; END;
  BEGIN v_school := nullif(meta->>'school_id','')::uuid; EXCEPTION WHEN others THEN v_school := NULL; END;

  IF NOT v_is_admin THEN
    v_check := public.check_signup_eligibility(NEW.email, v_grade, v_school);
    IF v_check <> 'ok' THEN
      RAISE EXCEPTION 'ELIGIBILITY: %', v_check;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, first_name, last_name, email, grade, school_id, eligibility_status, guardian_consent, guardian_email)
  VALUES (
    NEW.id,
    left(coalesce(meta->>'first_name',''), 80),
    left(coalesce(meta->>'last_name',''), 80),
    NEW.email,
    v_grade,
    v_school,
    CASE WHEN v_is_admin OR NOT s.require_admin_approval THEN 'approved' ELSE 'pending' END,
    coalesce((meta->>'guardian_consent')::boolean, false),
    nullif(left(coalesce(meta->>'guardian_email',''), 200), '')
  );

  IF v_is_admin THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student') ON CONFLICT DO NOTHING;

  IF jsonb_typeof(meta->'course_ids') = 'array' THEN
    FOR v_course IN SELECT jsonb_array_elements_text(meta->'course_ids') LOOP
      BEGIN
        INSERT INTO public.student_courses (student_id, course_id)
        SELECT NEW.id, c.id FROM public.courses c
        WHERE c.id = v_course::uuid AND c.active AND NOT c.is_custom
        ON CONFLICT DO NOTHING;
      EXCEPTION WHEN others THEN NULL;
      END;
    END LOOP;
  END IF;

  IF jsonb_typeof(meta->'custom_courses') = 'array' THEN
    FOR v_custom IN SELECT jsonb_array_elements_text(meta->'custom_courses') LIMIT 10 LOOP
      IF length(trim(v_custom)) BETWEEN 2 AND 120 THEN
        INSERT INTO public.courses (course_name, subject, grades, is_custom, created_by)
        VALUES (trim(v_custom), 'Other', ARRAY[v_grade], true, NEW.id)
        RETURNING id INTO v_new_course;
        INSERT INTO public.student_courses (student_id, course_id) VALUES (NEW.id, v_new_course) ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ GENERIC STUDENT-OWNED TABLES ============
CREATE TABLE public.folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Untitled note',
  topic text,
  content text NOT NULL DEFAULT '',
  content_text text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notes_student_idx ON public.notes (student_id, updated_at DESC);
CREATE INDEX notes_course_idx ON public.notes (course_id);

CREATE TABLE public.recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  note_id uuid REFERENCES public.notes(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Lesson recording',
  audio_path text NOT NULL,
  transcript text,
  duration int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX recordings_student_idx ON public.recordings (student_id, created_at DESC);

CREATE TABLE public.study_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  note_id uuid REFERENCES public.notes(id) ON DELETE SET NULL,
  title text NOT NULL,
  topic text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX study_guides_student_idx ON public.study_guides (student_id, created_at DESC);

CREATE TABLE public.worksheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  note_id uuid REFERENCES public.notes(id) ON DELETE SET NULL,
  title text NOT NULL,
  topic text,
  difficulty text NOT NULL DEFAULT 'medium',
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  answers jsonb,
  results jsonb,
  score numeric,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX worksheets_student_idx ON public.worksheets (student_id, created_at DESC);

CREATE TABLE public.flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  note_id uuid REFERENCES public.notes(id) ON DELETE SET NULL,
  title text NOT NULL,
  topic text,
  cards jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX flashcards_student_idx ON public.flashcards (student_id, created_at DESC);

CREATE TABLE public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  note_id uuid REFERENCES public.notes(id) ON DELETE SET NULL,
  title text NOT NULL,
  topic text,
  difficulty text NOT NULL DEFAULT 'medium',
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  answers jsonb,
  results jsonb,
  score numeric,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quizzes_student_idx ON public.quizzes (student_id, created_at DESC);

CREATE TABLE public.tutor_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'New conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tutor_threads_student_idx ON public.tutor_threads (student_id, updated_at DESC);

CREATE TABLE public.tutor_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.tutor_threads(id) ON DELETE CASCADE,
  student_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (thread_id, message_id)
);
CREATE INDEX tutor_messages_thread_idx ON public.tutor_messages (thread_id, created_at);

CREATE TABLE public.saved_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  topic text,
  title text NOT NULL,
  url text NOT NULL,
  description text,
  source text,
  kind text NOT NULL DEFAULT 'article',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid,
  activity_type text NOT NULL,
  description text NOT NULL,
  ref_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_student_idx ON public.activity (student_id, created_at DESC);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['folders','notes','recordings','study_guides','worksheets','flashcards','quizzes','tutor_threads','tutor_messages','saved_resources','activity'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Owner select" ON public.%I FOR SELECT TO authenticated USING (student_id = auth.uid() AND public.is_approved(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "Owner insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid() AND public.is_approved(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "Owner update" ON public.%I FOR UPDATE TO authenticated USING (student_id = auth.uid() AND public.is_approved(auth.uid())) WITH CHECK (student_id = auth.uid())', t);
    EXECUTE format('CREATE POLICY "Owner delete" ON public.%I FOR DELETE TO authenticated USING (student_id = auth.uid())', t);
  END LOOP;
END $$;

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
CREATE TRIGGER notes_touch BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER study_guides_touch BEFORE UPDATE ON public.study_guides FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER flashcards_touch BEFORE UPDATE ON public.flashcards FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER tutor_threads_touch BEFORE UPDATE ON public.tutor_threads FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- activity logging
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE label text; kind text;
BEGIN
  kind := CASE TG_TABLE_NAME
    WHEN 'notes' THEN 'note' WHEN 'recordings' THEN 'recording' WHEN 'study_guides' THEN 'study_guide'
    WHEN 'worksheets' THEN 'worksheet' WHEN 'flashcards' THEN 'flashcards' WHEN 'quizzes' THEN 'quiz' ELSE TG_TABLE_NAME END;
  IF TG_OP = 'INSERT' THEN
    label := CASE kind
      WHEN 'note' THEN 'Created note "' || NEW.title || '"'
      WHEN 'recording' THEN 'Saved recording "' || NEW.title || '"'
      WHEN 'study_guide' THEN 'Generated study guide "' || NEW.title || '"'
      WHEN 'worksheet' THEN 'Created worksheet "' || NEW.title || '"'
      WHEN 'flashcards' THEN 'Generated flashcards "' || NEW.title || '"'
      WHEN 'quiz' THEN 'Created practice test "' || NEW.title || '"'
      ELSE 'Created ' || kind END;
    INSERT INTO public.activity (student_id, course_id, activity_type, description, ref_id)
    VALUES (NEW.student_id, NEW.course_id, kind, left(label, 300), NEW.id);
  ELSIF TG_OP = 'UPDATE' AND kind IN ('worksheet','quiz') THEN
    IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS DISTINCT FROM NEW.completed_at THEN
      INSERT INTO public.activity (student_id, course_id, activity_type, description, ref_id)
      VALUES (NEW.student_id, NEW.course_id, kind || '_completed',
        left('Completed "' || NEW.title || '" — scored ' || coalesce(round(NEW.score)::text, '?') || '%', 300), NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER notes_activity AFTER INSERT ON public.notes FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER recordings_activity AFTER INSERT ON public.recordings FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER study_guides_activity AFTER INSERT ON public.study_guides FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER worksheets_activity AFTER INSERT OR UPDATE ON public.worksheets FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER flashcards_activity AFTER INSERT ON public.flashcards FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER quizzes_activity AFTER INSERT OR UPDATE ON public.quizzes FOR EACH ROW EXECUTE FUNCTION public.log_activity();

-- ============ ISSUE REPORTS ============
CREATE TABLE public.issue_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved')),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.issue_reports TO authenticated;
GRANT ALL ON public.issue_reports TO service_role;
ALTER TABLE public.issue_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Report own issues" ON public.issue_reports FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() AND length(subject) <= 200 AND length(message) <= 5000);
CREATE POLICY "Read own or admin" ON public.issue_reports FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update issues" ON public.issue_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ AI USAGE / RATE LIMIT ============
CREATE TABLE public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_usage_student_idx ON public.ai_usage (student_id, created_at DESC);
GRANT SELECT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own usage" ON public.ai_usage FOR SELECT TO authenticated USING (student_id = auth.uid());

CREATE OR REPLACE FUNCTION public.consume_ai_quota(_feature text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.app_settings; used int;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 'Please sign in.'; END IF;
  IF NOT public.is_approved(auth.uid()) THEN RETURN 'Your account is not approved yet.'; END IF;
  SELECT * INTO s FROM public.app_settings WHERE id = 1;
  IF NOT s.ai_enabled THEN RETURN 'AI features are temporarily turned off by an administrator.'; END IF;
  SELECT count(*) INTO used FROM public.ai_usage WHERE student_id = auth.uid() AND created_at > now() - interval '1 hour';
  IF used >= s.ai_hourly_limit THEN
    RETURN 'You have reached the hourly AI limit. Take a short break and try again soon.';
  END IF;
  INSERT INTO public.ai_usage (student_id, feature) VALUES (auth.uid(), left(_feature, 40));
  RETURN 'ok';
END $$;
GRANT EXECUTE ON FUNCTION public.consume_ai_quota(text) TO authenticated;

-- ============ ADMIN STATS ============
CREATE OR REPLACE FUNCTION public.admin_platform_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN jsonb_build_object(
    'students', (SELECT count(*) FROM public.profiles),
    'approved', (SELECT count(*) FROM public.profiles WHERE eligibility_status = 'approved'),
    'pending', (SELECT count(*) FROM public.profiles WHERE eligibility_status = 'pending'),
    'notes', (SELECT count(*) FROM public.notes),
    'recordings', (SELECT count(*) FROM public.recordings),
    'study_guides', (SELECT count(*) FROM public.study_guides),
    'worksheets', (SELECT count(*) FROM public.worksheets),
    'flashcards', (SELECT count(*) FROM public.flashcards),
    'quizzes', (SELECT count(*) FROM public.quizzes),
    'ai_requests_7d', (SELECT count(*) FROM public.ai_usage WHERE created_at > now() - interval '7 days'),
    'open_issues', (SELECT count(*) FROM public.issue_reports WHERE status <> 'resolved'),
    'by_grade', (SELECT coalesce(jsonb_object_agg(g, c), '{}'::jsonb) FROM (SELECT grade::text g, count(*) c FROM public.profiles WHERE grade IS NOT NULL GROUP BY grade) x)
  );
END $$;
GRANT EXECUTE ON FUNCTION public.admin_platform_stats() TO authenticated;
