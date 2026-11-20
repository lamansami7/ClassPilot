import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export function AuthLayout({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <div className="relative hidden overflow-hidden bg-hero p-12 text-navy-foreground lg:flex lg:flex-col">
        <div className="absolute inset-0 grid-lines opacity-60" />
        <Link to="/" className="relative">
          <Logo tone="light" />
        </Link>
        <div className="relative mt-auto max-w-md">
          {aside ?? (
            <>
              <h2 className="text-4xl font-bold leading-tight">
                Your classes. Your notes. <span className="text-gradient-electric">Your success.</span>
              </h2>
              <ul className="mt-8 space-y-3 text-navy-foreground/80">
                {[
                  "Notes organized by every class you take",
                  "Study guides, quizzes and flashcards in seconds",
                  "A tutor that explains things at your grade level",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-electric" /> {t}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <p className="relative mt-12 text-xs text-navy-foreground/50">
          Built for West Des Moines Community Schools students in grades 7–12. Not affiliated with or endorsed by WDMCS.
        </p>
      </div>
      <div className="flex flex-col px-5 py-8 sm:px-10">
        <Link to="/" className="mb-8 lg:hidden">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center">{children}</div>
      </div>
    </div>
  );
}
