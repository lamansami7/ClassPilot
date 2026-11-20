import { createFileRoute } from "@tanstack/react-router";
import { PracticeDetail } from "@/components/study/PracticeDetail";
export const Route=createFileRoute("/_authenticated/quizzes/$id")({component:QuizPage});
function QuizPage(){const{id}=Route.useParams();return <PracticeDetail id={id} kind="quiz"/>;}
