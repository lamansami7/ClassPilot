import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, GraduationCap, Loader2, MailCheck, School as SchoolIcon, ShieldAlert, UserRound, BookMarked, ClipboardCheck } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CoursePicker, type CoursePickerValue } from "@/components/courses/CoursePicker";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery, schoolsQuery } from "@/lib/queries";
import { GRADES, gradeLabel } from "@/lib/subjects";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your account — ClassPilot AI" },
      { name: "description", content: "Sign up for ClassPilot AI in five quick steps: your info, grade, school and classes." },
      { property: "og:title", content: "Create your account — ClassPilot AI" },
      { property: "og:description", content: "Join ClassPilot AI — built for WDMCS students in grades 7–12." },
    ],
  }),
  component: SignupPage,
});

const STEPS = [
  { label: "You", icon: UserRound },
  { label: "Eligibility", icon: ShieldAlert },
  { label: "School", icon: SchoolIcon },
  { label: "Classes", icon: BookMarked },
  { label: "Review", icon: ClipboardCheck },
];

function Stepper({ step }: { step: number }) {
  return (
    <ol className="mb-8 flex items-center gap-1.5">
      {STEPS.map((s, i) => (
        <li key={s.label} className="flex flex-1 flex-col gap-2">
          <div className={cn("h-1.5 rounded-full transition-colors", i <= step ? "bg-electric" : "bg-muted")} />
          <span className={cn("hidden text-xs font-medium sm:block", i === step ? "text-electric" : "text-muted-foreground")}>
            {i + 1}. {s.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

function SignupPage() {
  const [step, setStep] = useState(0);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [grade, setGrade] = useState<number | null>(null);
  const [consent, setConsent] = useState(false);
  const [guardianEmail, setGuardianEmail] = useState("");
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [classes, setClasses] = useState<CoursePickerValue>({ courseIds: [], customCourses: [] });
  const [error, setError] = useState<string | null>(null);
  const [ineligible, setIneligible] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const { data: schools = [] } = useQuery(schoolsQuery);
  const gradeSchools = useMemo(() => schools.filter((s) => grade && s.grades_supported.includes(grade)), [schools, grade]);
  const school = schools.find((s) => s.id === schoolId);

  const { data: catalog = [] } = useQuery(catalogQuery(grade, school?.name));

  const next = async () => {
    setError(null);
    if (step === 0) {
      if (!first.trim() || !last.trim()) return setError("Please enter your first and last name.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Please enter a valid email address.");
      if (password.length < 8) return setError("Your password needs at least 8 characters.");
      if (password !== confirm) return setError("Passwords don't match.");
    }
    if (step === 1) {
      if (!grade) return setError("Please choose your grade.");
      if (!consent) return setError("Please confirm the age and guardian statement to continue.");
    }
    if (step === 2) {
      if (!schoolId) return setError("Please choose your school.");
      setBusy(true);
      const { data, error } = await supabase.rpc("check_signup_eligibility", { _email: email.trim(), _grade: grade!, _school_id: schoolId });
      setBusy(false);
      if (error) return setError("We couldn't check eligibility right now. Please try again.");
      if (data !== "ok") {
        setIneligible(String(data));
        return;
      }
    }
    if (step === 3 && classes.courseIds.length + classes.customCourses.length === 0) {
      return setError("Pick at least one class — you can change them later in Settings.");
    }
    setStep((s) => s + 1);
  };

  const complete = async () => {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          first_name: first.trim(),
          last_name: last.trim(),
          grade,
          school_id: schoolId,
          course_ids: classes.courseIds,
          custom_courses: classes.customCourses,
          guardian_consent: consent,
          guardian_email: guardianEmail.trim() || null,
        },
      },
    });
    setBusy(false);
    if (error) {
      setError(
        /already registered|already exists/i.test(error.message)
          ? "An account with this email already exists. Try logging in instead."
          : /database error/i.test(error.message)
            ? "We couldn't confirm your eligibility. ClassPilot AI is only for WDMCS students in grades 7–12 using their school email."
            : error.message,
      );
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <AuthLayout>
        <div className="text-center animate-rise">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-electric-soft text-electric">
            <MailCheck className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-3xl font-bold text-navy">Check your school email</h1>
          <p className="mt-3 text-muted-foreground">
            We sent a verification link to <span className="font-semibold text-foreground">{email}</span>. Click it to activate your account — then you'll land on your personal dashboard.
          </p>
          <Button asChild variant="outline" className="mt-8">
            <Link to="/login">Go to log in</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (ineligible) {
    return (
      <AuthLayout>
        <div className="text-center animate-rise">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-warning/20 text-warning-foreground">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-navy">ClassPilot AI isn't available for this account yet</h1>
          <p className="mt-3 text-muted-foreground">{ineligible}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            ClassPilot AI is currently only open to West Des Moines Community Schools students in grades 7–12.
          </p>
          <Button variant="outline" className="mt-8" onClick={() => { setIneligible(null); setStep(0); }}>
            <ArrowLeft /> Go back and edit
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Stepper step={step} />
      <div key={step} className="animate-rise">
        {step === 0 && (
          <>
            <h1 className="text-3xl font-bold text-navy">Let's get you set up</h1>
            <p className="mt-2 text-muted-foreground">Start with your name and school email.</p>
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <Field id="first" label="First name" value={first} onChange={setFirst} autoComplete="given-name" />
              <Field id="last" label="Last name" value={last} onChange={setLast} autoComplete="family-name" />
              <div className="sm:col-span-2">
                <Field id="email" label="School email address" type="email" value={email} onChange={setEmail} autoComplete="email" placeholder="you@wdmcs.org" />
                <p className="mt-1.5 text-xs text-muted-foreground">Use your WDMCS student email. We'll send a link to verify it.</p>
              </div>
              <Field id="pw" label="Password" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
              <Field id="pw2" label="Confirm password" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="text-3xl font-bold text-navy">Check your eligibility</h1>
            <p className="mt-2 text-muted-foreground">ClassPilot AI is for students in grades 7–12.</p>
            <div className="mt-8 space-y-6">
              <div>
                <Label>School district</Label>
                <div className="mt-2 flex items-center gap-3 rounded-xl border-2 border-electric bg-electric-soft p-4">
                  <Building2 className="h-5 w-5 text-electric" />
                  <div>
                    <div className="font-semibold">West Des Moines Community Schools (WDMCS)</div>
                    <div className="text-xs text-muted-foreground">West Des Moines, Iowa</div>
                  </div>
                  <Check className="ml-auto h-5 w-5 text-electric" />
                </div>
              </div>
              <div>
                <Label>Your grade</Label>
                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {GRADES.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => { setGrade(g); setSchoolId(null); setClasses({ courseIds: [], customCourses: [] }); }}
                      className={cn(
                        "rounded-xl border-2 px-2 py-3 text-center transition-all",
                        grade === g ? "border-electric bg-electric text-electric-foreground shadow-glow" : "bg-card hover:border-electric/50",
                      )}
                    >
                      <div className="font-display text-xl font-bold">{g}</div>
                      <div className="text-[11px] opacity-80">grade</div>
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-start gap-3 rounded-xl border bg-card p-4 text-sm">
                <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
                <span>
                  I'm 13 or older, or my parent/guardian has agreed that I can use ClassPilot AI. I'll follow my school's rules when using it.
                </span>
              </label>
              <div>
                <Label htmlFor="guardian">Parent/guardian email (optional)</Label>
                <Input id="guardian" type="email" value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} className="mt-2 h-11" placeholder="parent@example.com" />
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-3xl font-bold text-navy">Which school do you attend?</h1>
            <p className="mt-2 text-muted-foreground">WDMCS schools that serve {gradeLabel(grade)}.</p>
            <div className="mt-8 grid gap-3">
              {gradeSchools.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { if (schoolId !== s.id) setClasses({ courseIds: [], customCourses: [] }); setSchoolId(s.id); }}
                  className={cn(
                    "flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all",
                    schoolId === s.id ? "border-electric bg-electric-soft shadow-soft" : "bg-card hover:border-electric/40",
                  )}
                >
                  <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", schoolId === s.id ? "bg-electric text-electric-foreground" : "bg-muted text-navy")}>
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-sm text-muted-foreground">{s.description}</div>
                    <div className="mt-1 text-xs font-medium text-electric">Grades {s.grades_supported.join(", ")}</div>
                  </div>
                </button>
              ))}
              {!gradeSchools.length && <p className="text-sm text-muted-foreground">Loading schools…</p>}
            </div>
          </>
        )}

        {step === 3 && grade && (
          <>
            <h1 className="text-3xl font-bold text-navy">Pick your classes</h1>
            <p className="mt-2 mb-6 text-muted-foreground">From the official WDMCS course catalog for {gradeLabel(grade)}. Select as many as you're taking.</p>
            <CoursePicker campus={school?.name} grade={grade} value={classes} onChange={setClasses} />
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="text-3xl font-bold text-navy">Review & finish</h1>
            <p className="mt-2 text-muted-foreground">Make sure everything looks right.</p>
            <dl className="mt-8 divide-y rounded-2xl border bg-card shadow-card">
              <Row label="Student" value={`${first} ${last}`} />
              <Row label="Email" value={email} />
              <Row label="Grade" value={gradeLabel(grade)} />
              <Row label="School" value={school?.name ?? "—"} />
              <div className="px-5 py-4">
                <dt className="text-sm text-muted-foreground">Classes ({classes.courseIds.length + classes.customCourses.length})</dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {catalog.filter((c) => classes.courseIds.includes(c.id)).map((c) => (
                    <span key={c.id} className="rounded-full bg-electric-soft px-3 py-1 text-xs font-medium text-accent-foreground">{c.course_name}</span>
                  ))}
                  {classes.customCourses.map((c) => (
                    <span key={c} className="rounded-full border px-3 py-1 text-xs font-medium">{c}</span>
                  ))}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-muted-foreground">
              By creating an account you agree to use ClassPilot AI for learning. Your notes and recordings are private to you and are not used to train AI models. ClassPilot AI is not affiliated with or endorsed by WDMCS.
            </p>
          </>
        )}
      </div>

      {error && <p className="mt-6 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="mt-8 flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button variant="ghost" onClick={() => { setError(null); setStep((s) => s - 1); }}>
            <ArrowLeft /> Back
          </Button>
        ) : (
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Already have an account? <span className="font-semibold text-electric">Log in</span>
          </Link>
        )}
        {step < 4 ? (
          <Button variant="hero" size="lg" onClick={next} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Continue <ArrowRight />
          </Button>
        ) : (
          <Button variant="hero" size="lg" onClick={complete} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Complete Registration
          </Button>
        )}
      </div>
    </AuthLayout>
  );
}

function Field({ id, label, value, onChange, type = "text", autoComplete, placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; type?: string; autoComplete?: string; placeholder?: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} placeholder={placeholder} className="h-11" />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-semibold">{value}</dd>
    </div>
  );
}
