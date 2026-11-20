import { toast } from "sonner";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  Compass,
  GraduationCap,
  Home,
  LogOut,
  NotebookPen,
  BookOpenText,
  Layers,
  ClipboardList,
  FileQuestion,
  Library,
  Settings,
  Bot,
  Search,
  Mic,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogoMark } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";
import { fullName, meQuery } from "@/lib/queries";
import { gradeLabel } from "@/lib/subjects";
import { EligibilityGate } from "./EligibilityGate";

const NAV = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/classes", label: "My Classes", icon: GraduationCap },
  { to: "/notes", label: "My Notes", icon: NotebookPen },
  { to: "/recordings", label: "Recordings", icon: Mic },
  { to: "/study-guides", label: "Study Guides", icon: BookOpenText },
  { to: "/flashcards", label: "Flashcards", icon: Layers },
  { to: "/worksheets", label: "Worksheets", icon: ClipboardList },
  { to: "/quizzes", label: "Quizzes & Tests", icon: FileQuestion },
  { to: "/tutor", label: "AI Tutor", icon: Bot },
  { to: "/resources", label: "Find Resources", icon: Search },
  { to: "/study-center", label: "Study Center", icon: Library },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function NavLinks({ admin }: { admin: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { setOpenMobile } = useSidebar();
  const items = admin
    ? [...NAV, { to: "/admin" as const, label: "Administration", icon: Settings }]
    : NAV;
  return (
    <SidebarMenu>
      {items.map((item) => {
        const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
        return (
          <SidebarMenuItem key={item.to}>
            <SidebarMenuButton asChild isActive={active} tooltip={item.label} className="h-10">
              <Link to={item.to} onClick={() => setOpenMobile(false)}>
                <item.icon />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data: me, isError: meError, refetch: refetchMe } = useQuery(meQuery);
  const navigate = useNavigate();
  const name = fullName(me?.profile) || me?.email || "Student";
  const initials =
    (me?.profile?.first_name?.[0] ?? "") + (me?.profile?.last_name?.[0] ?? "") || "CP";

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Could not sign out. Please retry.");
      return;
    }
    navigate({ to: "/" });
  };

  return (
    <SidebarProvider>
      <a
        href="#workspace"
        className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-card focus:p-3"
      >
        Skip to workspace
      </a>
      <Sidebar collapsible="icon" className="no-print">
        <SidebarHeader className="px-3 pt-4 pb-2">
          <Link to="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
            <LogoMark className="h-9 w-9 shrink-0" />
            <span className="font-display text-base font-bold text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden">
              ClassPilot <span className="text-electric">AI</span>
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Learn</SidebarGroupLabel>
            <SidebarGroupContent>
              <NavLinks admin={!!me?.isAdmin} />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-3 group-data-[collapsible=icon]:hidden">
          <div className="rounded-xl bg-sidebar-accent p-3 text-xs text-sidebar-foreground">
            <div className="flex items-center gap-2 font-semibold text-sidebar-accent-foreground">
              <Compass className="h-4 w-4" /> Study tip
            </div>
            <p className="mt-1 leading-relaxed">
              Turn today's notes into flashcards — short daily reviews beat cramming.
            </p>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0 bg-background">
        <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur md:px-6">
          <SidebarTrigger />
          <div className="flex-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 rounded-full p-0.5 pr-2 transition-colors hover:bg-muted"
                aria-label="Account menu"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-navy text-xs font-semibold text-navy-foreground">
                    {initials.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[140px] truncate text-sm font-medium md:inline">
                  {name}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="truncate">{name}</div>
                <div className="truncate text-xs font-normal text-muted-foreground">
                  {me?.profile?.grade ? `${gradeLabel(me.profile.grade)} · ` : ""}
                  {me?.school?.name ?? me?.email}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main
          id="workspace"
          tabIndex={-1}
          className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8 md:py-8"
        >
          {meError ? (
            <div role="alert" className="rounded-xl border p-6">
              <p>Couldn’t load your account. Check your connection and try again.</p>
              <button
                className="mt-3 text-sm font-semibold text-electric"
                onClick={() => refetchMe()}
              >
                Try again
              </button>
            </div>
          ) : (
            <EligibilityGate me={me}>{children}</EligibilityGate>
          )}
        </main>
        <footer className="no-print border-t px-6 py-4 text-center text-xs text-muted-foreground">
          ClassPilot AI is an independent study tool and is not affiliated with or endorsed by West
          Des Moines Community Schools.
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
