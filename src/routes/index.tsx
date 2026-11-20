import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpenText,
  Bot,
  ClipboardList,
  FileText,
  Layers,
  Lock,
  Mic,
  NotebookPen,
  Search,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo, LogoMark } from "@/components/brand/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ClassPilot AI — Your classes. Your notes. Your success." },
      {
        name: "description",
        content:
          "An AI-powered learning companion for WDMCS students in grades 7–12: notes for every class, study guides, quizzes, flashcards and a personal AI tutor.",
      },
      { property: "og:title", content: "ClassPilot AI — Your classes. Your notes. Your success." },
      {
        property: "og:description",
        content: "An AI-powered learning companion for WDMCS students in grades 7–12.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Welcome,
});

const FEATURES = [
  {
    icon: NotebookPen,
    title: "Notes for every class",
    text: "Type or paste your notes, organize them by class and topic, and revisit them before your next test.",
  },
  {
    icon: Wand2,
    title: "Improve My Notes",
    text: "AI fixes grammar, adds headings and highlights key definitions. You review every change before it's applied.",
  },
  {
    icon: Mic,
    title: "Record & transcribe",
    text: "Record a lesson (with permission) and turn the transcript into clean, organized notes.",
  },
  {
    icon: BookOpenText,
    title: "Instant study guides",
    text: "Concepts, definitions, worked examples, common mistakes and review questions — at your grade level.",
  },
  {
    icon: ClipboardList,
    title: "Worksheets & practice tests",
    text: "Custom questions from your notes, auto-graded with explanations and topics to review.",
  },
  {
    icon: Layers,
    title: "Flashcards",
    text: "Flip, shuffle, mark what's difficult and track what you've learned.",
  },
  {
    icon: Bot,
    title: "Your AI tutor",
    text: "Step-by-step explanations that know your grade and class — and help you learn, not just copy answers.",
  },
  {
    icon: Search,
    title: "Real learning resources",
    text: "Videos and tutorials found by live web search. Never made-up links.",
  },
];

function Welcome() {
  return (
    <div className="min-h-screen bg-background">
      <section className="relative overflow-hidden bg-hero text-navy-foreground">
        <div className="absolute inset-0 grid-lines opacity-70" />
        <header className="relative mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
          <Logo tone="light" />
          <div className="flex items-center gap-2">
            <Button asChild variant="glass" size="sm">
              <Link to="/login">Log In</Link>
            </Button>
            <Button asChild variant="hero" size="sm" className="hidden sm:inline-flex">
              <Link to="/signup">Sign Up</Link>
            </Button>
          </div>
        </header>

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-10 md:px-8 lg:grid-cols-[1.05fr_1fr] lg:pb-28 lg:pt-16">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-navy-foreground/15 bg-navy-foreground/10 px-3 py-1 text-xs font-medium text-navy-foreground/80">
              <span className="h-1.5 w-1.5 rounded-full bg-highlight" /> For WDMCS students in
              grades 7–12
            </span>
            <h1 className="mt-6 text-5xl font-extrabold leading-[1.05] md:text-6xl">
              ClassPilot <span className="text-gradient-electric">AI</span>
            </h1>
            <p className="mt-4 font-display text-2xl font-semibold text-navy-foreground/90 md:text-3xl">
              Your classes. Your notes. Your success.
            </p>
            <p className="mt-5 max-w-xl text-lg text-navy-foreground/70">
              An AI-powered learning companion for WDMCS students. Keep notes for every class, then
              turn them into study guides, practice tests, flashcards and tutoring — in seconds.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="xl">
                <Link to="/signup">Sign Up</Link>
              </Button>
              <Button asChild variant="glass" size="xl">
                <Link to="/login">Log In</Link>
              </Button>
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm text-navy-foreground/55">
              <Lock className="h-4 w-4" /> Your study materials are private to your account.
            </p>
          </div>

          <ProductPreview />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-electric">
            Everything in one place
          </div>
          <h2 className="mt-3 text-3xl font-bold text-navy md:text-4xl">
            From class notes to test-ready
          </h2>
          <p className="mt-3 text-muted-foreground">
            Pick your classes from the WDMCS course catalog when you sign up. ClassPilot AI builds a
            home for each one.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-lift"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-electric-soft text-electric transition-colors group-hover:bg-electric group-hover:text-electric-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-navy">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 md:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-navy px-8 py-12 text-navy-foreground md:px-14">
          <div className="absolute inset-0 grid-lines opacity-60" />
          <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-bold">Ready for your next test?</h2>
              <p className="mt-2 text-navy-foreground/70">
                Create your free student account with your WDMCS email.
              </p>
            </div>
            <div className="flex gap-3">
              <Button asChild variant="hero" size="xl">
                <Link to="/signup">Sign Up</Link>
              </Button>
              <Button asChild variant="glass" size="xl">
                <Link to="/login">Log In</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-muted-foreground md:flex-row md:px-8">
          <Logo />
          <p className="text-center text-xs">
            ClassPilot AI is an independent study tool and is not affiliated with or endorsed by
            West Des Moines Community Schools.
          </p>
        </div>
      </footer>
    </div>
  );
}

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-lg animate-rise [animation-delay:120ms]">
      <div className="absolute -inset-6 rounded-[2rem] bg-electric/20 blur-3xl" />
      <div className="relative rounded-3xl border border-navy-foreground/15 bg-card p-5 text-card-foreground shadow-lift">
        <div className="flex items-center gap-3">
          <LogoMark className="h-8 w-8" />
          <div>
            <div className="text-sm font-semibold">Advanced Algebra I</div>
            <div className="text-xs text-muted-foreground">Mathematics · Slope-intercept form</div>
          </div>
          <span className="ml-auto rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-semibold text-success">
            Saved
          </span>
        </div>
        <div className="mt-4 space-y-2 rounded-2xl bg-muted p-4 text-sm">
          <div className="font-display font-semibold text-navy">Linear equations</div>
          <p className="text-muted-foreground">
            <mark className="rounded bg-highlight px-1 text-foreground">y = mx + b</mark> — m is the
            slope, b is the y-intercept.
          </p>
          <p className="text-muted-foreground">Slope = rise ÷ run between two points.</p>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { icon: FileText, label: "Study guide" },
            { icon: Layers, label: "Flashcards" },
            { icon: ClipboardList, label: "Practice test" },
          ].map((a) => (
            <div
              key={a.label}
              className="flex flex-col items-center gap-1.5 rounded-xl border bg-card p-3 text-center text-xs font-medium"
            >
              <a.icon className="h-4 w-4 text-electric" />
              {a.label}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-start gap-3 rounded-2xl border bg-electric-soft p-3">
          <Bot className="mt-0.5 h-5 w-5 shrink-0 text-electric" />
          <p className="text-xs leading-relaxed text-accent-foreground">
            "Let's find the slope together. What's the rise between (1, 3) and (3, 7)?"
          </p>
        </div>
      </div>
      <div className="absolute -bottom-6 -left-6 hidden animate-float rounded-2xl border bg-card px-4 py-3 shadow-lift sm:block">
        <div className="text-[11px] text-muted-foreground">Quiz score</div>
        <div className="font-display text-2xl font-bold text-navy">92%</div>
      </div>
    </div>
  );
}
