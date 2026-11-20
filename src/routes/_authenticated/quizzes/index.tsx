import { createFileRoute } from "@tanstack/react-router";
import { MaterialLibrary } from "@/components/study/MaterialLibrary";
export const Route = createFileRoute("/_authenticated/quizzes/")({
  component: () => <MaterialLibrary kind="quizzes" />,
});
