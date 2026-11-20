import { createFileRoute } from "@tanstack/react-router";
import { MaterialLibrary } from "@/components/study/MaterialLibrary";
export const Route = createFileRoute("/_authenticated/worksheets/")({
  component: () => <MaterialLibrary kind="worksheets" />,
});
