import { createFileRoute } from "@tanstack/react-router";
import { FlashcardStudy } from "@/components/study/FlashcardStudy";
export const Route=createFileRoute("/_authenticated/flashcards/$id")({component:FlashcardPage});
function FlashcardPage(){const{id}=Route.useParams();return <FlashcardStudy id={id}/>;}
