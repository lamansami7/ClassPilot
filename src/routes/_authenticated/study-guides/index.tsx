import { createFileRoute } from "@tanstack/react-router";
import { MaterialLibrary } from "@/components/study/MaterialLibrary";
export const Route = createFileRoute("/_authenticated/study-guides/")({
  component: () => <MaterialLibrary kind="study-guides" />,
});
