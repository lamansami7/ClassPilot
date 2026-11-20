import { createFileRoute } from "@tanstack/react-router";
import { PracticeDetail } from "@/components/study/PracticeDetail";
export const Route=createFileRoute("/_authenticated/worksheets/$id")({component:WorksheetPage});
function WorksheetPage(){const{id}=Route.useParams();return <PracticeDetail id={id} kind="worksheet"/>;}
