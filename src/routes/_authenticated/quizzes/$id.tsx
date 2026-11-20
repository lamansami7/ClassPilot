import { createFileRoute } from "@tanstack/react-router";
import { PracticePage } from "@/components/study/PracticePage";
export const Route = createFileRoute("/_authenticated/quizzes/$id")({ component: Page });
function Page() {
  const { id } = Route.useParams();
  return <PracticePage key={id} id={id} kind="quiz" />;
}
