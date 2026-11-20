import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Clock, ShieldX } from "lucide-react";
import type { Me } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/** Blocks the student platform until the account is approved. Admin pages stay reachable for admins. */
export function EligibilityGate({ me, children }: { me: Me | undefined; children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (!me) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }
  if (me.isAdmin && pathname.startsWith("/admin")) return <>{children}</>;
  const status = me.profile?.eligibility_status ?? "pending";
  if (status === "approved") return <>{children}</>;

  const rejected = status === "rejected";
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-electric-soft text-electric">
        {rejected ? <ShieldX className="h-8 w-8" /> : <Clock className="h-8 w-8" />}
      </div>
      <h1 className="mt-6 text-2xl font-bold">
        {rejected ? "We couldn't confirm your eligibility" : "Your account is waiting for approval"}
      </h1>
      <p className="mt-3 text-muted-foreground">
        {rejected
          ? "ClassPilot AI is only available to current WDMCS students in grades 7–12. If you think this is a mistake, contact your ClassPilot administrator."
          : "An administrator is confirming that you're a current WDMCS student in grades 7–12. You'll get full access as soon as you're approved."}
      </p>
      {me.profile?.eligibility_note && (
        <p className="mt-4 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
          Note from admin: {me.profile.eligibility_note}
        </p>
      )}
      <Button variant="outline" className="mt-8" onClick={() => supabase.auth.signOut()}>
        Sign out
      </Button>
    </div>
  );
}
