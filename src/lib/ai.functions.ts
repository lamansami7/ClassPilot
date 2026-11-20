import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiStructured, gradeGuidance, htmlToText, AiError } from "@/lib/server/ai.server";
import { arr, enm, narr, nstr, num, obj, str } from "@/lib/server/schema.server";
import { courseName, prepareAiRequest, safeMessage } from "@/lib/server/student.server";
import {
  gradeObjective,
  isObjective,
  summarizeResults,
  QUESTION_TYPES,
  type Answers,
  type Question,
  type QuestionResult,
} from "@/lib/practice";
import type { Json } from "@/integrations/supabase/types";

const MAX_NOTE_CHARS = 40_000;

const TRUST =
  "Base everything on the student's material. If the material is thin, you may add widely accepted textbook knowledge, but never invent facts, quotes, dates, sources or URLs. If something is uncertain, say so.";

type Ok<T> = { ok: true; data: T } | { ok: false; error: string };
async function run<T>(fn: () => Promise<T>): Promise<Ok<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    console.error("Study material request failed");
    return { ok: false, error: safeMessage(error) };
  }
}

// ---------------- Improve My Notes ----------------
export const improveNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { html: string; courseId: string | null }) =>
    z
      .object({ html: z.string().min(1).max(200_000), courseId: z.string().uuid().nullable() })
      .parse(input),
  )
  .handler(async ({ data, context }) =>
    run(async () => {
      const { profile } = await prepareAiRequest(context.supabase, context.userId, "improve_notes");
      const course = await courseName(context.supabase, data.courseId);
      const text = data.html.slice(0, MAX_NOTE_CHARS);
      const out = await aiStructured<{ html: string; changes: string[] }>({
        instructions: `You are ClassPilot AI, a careful study assistant for a WDMCS student. ${gradeGuidance(profile?.grade)}
Improve the student's class notes: fix spelling and grammar, organize information logically, add meaningful <h2>/<h3> headings, use bullet or numbered lists where helpful, wrap key definitions as <p><strong>Term</strong>: definition</p>, and highlight the most important concepts with <mark>. Preserve the original meaning and all facts; do not add new content beyond brief clarifying headings. Output clean HTML using only: h2, h3, p, ul, ol, li, strong, em, mark, blockquote, code. Also list the main changes you made in plain language (max 8).`,
        messages: [
          { role: "user", content: `Class: ${course ?? "General"}\n\nNotes (HTML):\n${text}` },
        ],
        schema: obj({ html: str("Improved notes as HTML"), changes: arr(str()) }),
      });
      if (!out.html?.trim())
        throw new AiError("The AI returned empty notes. Your original notes are unchanged.", 502);
      return { html: out.html, changes: (out.changes ?? []).slice(0, 8) };
    }),
  );

// ---------------- Study guides ----------------
export type StudyGuideContent = {
  title: string;
  overview: string;
  important_concepts: { name: string; explanation: string }[];
  key_definitions: { term: string; definition: string }[];
  detailed_explanations: { heading: string; body: string }[];
  step_by_step_examples: { title: string; steps: string[]; answer: string }[];
  formulas: { name: string; formula: string; when_to_use: string }[];
  common_mistakes: { mistake: string; fix: string }[];
  things_to_memorize: string[];
  review_questions: { question: string; answer: string }[];
  summary: string;
};

const studyGuideSchema = () =>
  obj({
    title: str(),
    overview: str(),
    important_concepts: arr(obj({ name: str(), explanation: str() })),
    key_definitions: arr(obj({ term: str(), definition: str() })),
    detailed_explanations: arr(obj({ heading: str(), body: str() })),
    step_by_step_examples: arr(obj({ title: str(), steps: arr(str()), answer: str() })),
    formulas: arr(
      obj({ name: str(), formula: str(), when_to_use: str() }),
      "Empty array when the subject has no formulas",
    ),
    common_mistakes: arr(obj({ mistake: str(), fix: str() })),
    things_to_memorize: arr(str()),
    review_questions: arr(obj({ question: str(), answer: str() })),
    summary: str(),
  });

async function buildStudyGuide(
  supabase: Parameters<typeof prepareAiRequest>[0],
  userId: string,
  noteId: string,
) {
  const { profile } = await prepareAiRequest(supabase, userId, "study_guide");
  const { data: note, error } = await supabase
    .from("notes")
    .select("*")
    .eq("id", noteId)
    .maybeSingle();
  if (error || !note) throw new AiError("Note not found.", 404);
  const text = (note.content_text || htmlToText(note.content)).slice(0, MAX_NOTE_CHARS);
  if (text.length < 20)
    throw new AiError("Add a bit more to this note before generating a study guide.", 400);
  const course = await courseName(supabase, note.course_id);
  const guide = await aiStructured<StudyGuideContent>({
    instructions: `You are ClassPilot AI. Create a complete, well-organized study guide from the student's notes. ${gradeGuidance(profile?.grade)} ${TRUST}
Include 3-8 important concepts, key definitions, detailed explanations, 1-4 step-by-step examples, formulas only when applicable (else empty array), 3-6 common mistakes, things to memorize, 5-10 review questions with answers, and a short summary.`,
    messages: [
      {
        role: "user",
        content: `Class: ${course ?? "General"}\nNote title: ${note.title}\nTopic: ${note.topic ?? ""}\n\nNotes:\n${text}`,
      },
    ],
    schema: studyGuideSchema(),
    effort: "medium",
  });
  return { guide, note };
}

export const generateStudyGuide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { noteId: string }) =>
    z.object({ noteId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) =>
    run(async () => {
      const { guide, note } = await buildStudyGuide(context.supabase, context.userId, data.noteId);
      const { data: row, error } = await context.supabase
        .from("study_guides")
        .insert({
          student_id: context.userId,
          course_id: note.course_id,
          note_id: note.id,
          title: guide.title || `${note.title} — Study Guide`,
          topic: note.topic,
          content: guide as unknown as Json,
        })
        .select("id")
        .single();
      if (error) throw new AiError("Couldn't save the study guide.", 500);
      return { id: row.id };
    }),
  );

export const regenerateStudyGuide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studyGuideId: string }) =>
    z.object({ studyGuideId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) =>
    run(async () => {
      const { data: sg } = await context.supabase
        .from("study_guides")
        .select("id, note_id")
        .eq("id", data.studyGuideId)
        .maybeSingle();
      if (!sg?.note_id)
        throw new AiError("The original note for this study guide no longer exists.", 404);
      const { guide } = await buildStudyGuide(context.supabase, context.userId, sg.note_id);
      const { error } = await context.supabase
        .from("study_guides")
        .update({ content: guide as unknown as Json, title: guide.title })
        .eq("id", sg.id);
      if (error) throw new AiError("Couldn't save the study guide.", 500);
      return { id: sg.id };
    }),
  );

// ---------------- Worksheets & practice tests ----------------
const questionSchema = () =>
  obj({
    type: enm([...QUESTION_TYPES]),
    prompt: str(),
    options: narr(str()),
    correct_answer: nstr(),
    matching_pairs: narr(obj({ left: str(), right: str() })),
    explanation: str(),
    topic: str(),
    difficulty: enm(["easy", "medium", "hard"]),
  });

const practiceInput = z.object({
  kind: z.enum(["worksheet", "quiz"]),
  courseId: z.string().uuid(),
  noteId: z.string().uuid().nullable(),
  topic: z.string().max(200).nullable(),
  difficulty: z.enum(["easy", "medium", "hard", "mixed"]),
  count: z.number().int().min(3).max(30),
  types: z.array(z.enum(QUESTION_TYPES)).min(1),
  title: z.string().max(200).nullable(),
});

export const generatePractice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof practiceInput>) => practiceInput.parse(input))
  .handler(async ({ data, context }) =>
    run(async () => {
      const { profile } = await prepareAiRequest(context.supabase, context.userId, data.kind);
      const course = await courseName(context.supabase, data.courseId);
      let material = "";
      if (data.noteId) {
        const { data: note } = await context.supabase
          .from("notes")
          .select("title, content, content_text")
          .eq("id", data.noteId)
          .maybeSingle();
        if (note)
          material = `Note "${note.title}":\n${(note.content_text || htmlToText(note.content)).slice(0, MAX_NOTE_CHARS)}`;
      } else {
        const { data: notes } = await context.supabase
          .from("notes")
          .select("title, content_text, topic")
          .eq("course_id", data.courseId)
          .order("updated_at", { ascending: false })
          .limit(6);
        material = (notes ?? [])
          .map(
            (n) =>
              `Note "${n.title}"${n.topic ? ` (${n.topic})` : ""}:\n${n.content_text.slice(0, 6000)}`,
          )
          .join("\n\n");
      }
      const out = await aiStructured<{ title: string; questions: Omit<Question, "id">[] }>({
        instructions: `You are ClassPilot AI. Write a ${data.kind === "quiz" ? "practice test" : "practice worksheet"} for the student. ${gradeGuidance(profile?.grade)} ${TRUST}
Rules: exactly ${data.count} questions. Use only these types: ${data.types.join(", ")}; spread them evenly. Difficulty: ${data.difficulty}${data.difficulty === "mixed" ? " (mix easy, medium and hard)" : ""}.
- multiple_choice: 4 options, correct_answer must equal one option exactly.
- true_false: options ["True","False"], correct_answer "True" or "False".
- fill_blank: prompt contains "____"; correct_answer is a short word/number; list accepted alternatives separated by "|".
- matching: 3-6 matching_pairs; options null; correct_answer null.
- short_answer / problem / written: options null, matching_pairs null, correct_answer is a model answer used for grading.
Set unused fields to null. Each question gets a short topic label and an explanation of the correct answer.`,
        messages: [
          {
            role: "user",
            content: `Class: ${course ?? "General"}\nTopic focus: ${data.topic ?? "the student's recent notes"}\n\n${material ? `Student notes:\n${material}` : "The student has no notes yet for this class; use standard grade-appropriate curriculum for the topic."}`,
          },
        ],
        schema: obj({ title: str(), questions: arr(questionSchema()) }),
        effort: "medium",
      });
      const questions: Question[] = (out.questions ?? []).slice(0, data.count).map((q, i) => ({
        ...q,
        id: `q${i + 1}`,
        options: q.type === "true_false" ? ["True", "False"] : q.options,
      }));
      if (!questions.length)
        throw new AiError("The AI didn't return any questions. Please try again.", 502);
      const table = data.kind === "quiz" ? "quizzes" : "worksheets";
      const { data: row, error } = await context.supabase
        .from(table)
        .insert({
          student_id: context.userId,
          course_id: data.courseId,
          note_id: data.noteId,
          title:
            data.title?.trim() ||
            out.title ||
            `${data.topic ?? "Practice"} ${data.kind === "quiz" ? "Test" : "Worksheet"}`,
          topic: data.topic,
          difficulty: data.difficulty,
          questions: questions as unknown as Json,
        })
        .select("id")
        .single();
      if (error) throw new AiError("Couldn't save your practice set.", 500);
      return { id: row.id };
    }),
  );

export const gradePractice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { kind: "worksheet" | "quiz"; id: string; answers: Answers }) =>
    z
      .object({
        kind: z.enum(["worksheet", "quiz"]),
        id: z.string().uuid(),
        answers: z.record(z.union([z.string().max(5000), z.record(z.string().max(500))])),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) =>
    run(async () => {
      const table = data.kind === "quiz" ? "quizzes" : "worksheets";
      const { data: row } = await context.supabase
        .from(table)
        .select("*")
        .eq("id", data.id)
        .maybeSingle();
      if (!row) throw new AiError("Practice set not found.", 404);
      const questions = row.questions as unknown as Question[];
      const results: QuestionResult[] = [];
      const subjective: Question[] = [];
      for (const q of questions) {
        const r = gradeObjective(q, data.answers[q.id]);
        if (r) results.push(r);
        else subjective.push(q);
      }
      const answered = subjective.filter(
        (q) => typeof data.answers[q.id] === "string" && (data.answers[q.id] as string).trim(),
      );
      for (const q of subjective.filter((q) => !answered.includes(q))) {
        results.push({
          id: q.id,
          correct: false,
          score: 0,
          feedback: "No answer given.",
          correct_answer_display: q.correct_answer ?? "",
          ai_graded: false,
        });
      }
      if (answered.length) {
        const { profile } = await prepareAiRequest(
          context.supabase,
          context.userId,
          "grade_written",
        );
        const graded = await aiStructured<{
          grades: { id: string; score: number; feedback: string }[];
        }>({
          instructions: `You are a fair, encouraging tutor giving practice feedback (not an official school grade). ${gradeGuidance(profile?.grade)} For each answer give score 0, 0.5 or 1 compared with the model answer, and 1-3 sentences of specific feedback explaining what was right and what to improve.`,
          messages: [
            {
              role: "user",
              content: answered
                .map(
                  (q) =>
                    `ID: ${q.id}\nQuestion: ${q.prompt}\nModel answer: ${q.correct_answer}\nStudent answer: ${data.answers[q.id]}`,
                )
                .join("\n\n---\n\n"),
            },
          ],
          schema: obj({ grades: arr(obj({ id: str(), score: num(), feedback: str() })) }),
        });
        for (const q of answered) {
          const g = graded.grades?.find((x) => x.id === q.id);
          if (!g || ![0, 0.5, 1].includes(g.score))
            throw new AiError(
              "Incomplete grading response. Please retry; this attempt was not saved.",
              502,
            );
          const score = g.score;
          results.push({
            id: q.id,
            correct: score >= 1,
            score,
            feedback: g?.feedback ?? "Couldn't grade this answer automatically.",
            correct_answer_display: q.correct_answer ?? "",
            ai_graded: true,
          });
        }
      }
      const summary = summarizeResults(questions, results);
      const { error } = await context.supabase
        .from(table)
        .update({
          answers: data.answers as unknown as Json,
          results: summary as unknown as Json,
          score: summary.percent,
          completed_at: new Date().toISOString(),
        })
        .eq("id", row.id)
        .select("id")
        .single();
      if (error) throw new AiError("Couldn't save your results.", 500);
      return summary;
    }),
  );

// ---------------- Flashcards ----------------
export type Flashcard = {
  id: string;
  front: string;
  back: string;
  difficult: boolean;
  learned: boolean;
};

export const generateFlashcards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { courseId: string; noteId: string | null; topic: string | null; count: number }) =>
      z
        .object({
          courseId: z.string().uuid(),
          noteId: z.string().uuid().nullable(),
          topic: z.string().max(200).nullable(),
          count: z.number().int().min(4).max(40),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) =>
    run(async () => {
      const { profile } = await prepareAiRequest(context.supabase, context.userId, "flashcards");
      const course = await courseName(context.supabase, data.courseId);
      let material = "";
      let noteTitle: string | null = null;
      if (data.noteId) {
        const { data: note } = await context.supabase
          .from("notes")
          .select("title, content, content_text, topic")
          .eq("id", data.noteId)
          .maybeSingle();
        if (note) {
          noteTitle = note.title;
          material = (note.content_text || htmlToText(note.content)).slice(0, MAX_NOTE_CHARS);
        }
      } else {
        const { data: notes } = await context.supabase
          .from("notes")
          .select("title, content_text")
          .eq("course_id", data.courseId)
          .order("updated_at", { ascending: false })
          .limit(6);
        material = (notes ?? [])
          .map((n) => `${n.title}:\n${n.content_text.slice(0, 6000)}`)
          .join("\n\n");
      }
      const out = await aiStructured<{ title: string; cards: { front: string; back: string }[] }>({
        instructions: `You are ClassPilot AI. Create exactly ${data.count} question-and-answer flashcards. ${gradeGuidance(profile?.grade)} ${TRUST} Front: a clear question or term. Back: a concise, accurate answer (1-3 sentences).`,
        messages: [
          {
            role: "user",
            content: `Class: ${course ?? "General"}\nTopic: ${data.topic ?? noteTitle ?? "recent notes"}\n\n${material ? `Notes:\n${material}` : "No notes yet — use standard grade-appropriate curriculum for the topic."}`,
          },
        ],
        schema: obj({ title: str(), cards: arr(obj({ front: str(), back: str() })) }),
      });
      const cards: Flashcard[] = (out.cards ?? []).slice(0, data.count).map((c, i) => ({
        id: `c${i + 1}`,
        front: c.front,
        back: c.back,
        difficult: false,
        learned: false,
      }));
      if (!cards.length)
        throw new AiError("The AI didn't return any flashcards. Please try again.", 502);
      const { data: row, error } = await context.supabase
        .from("flashcards")
        .insert({
          student_id: context.userId,
          course_id: data.courseId,
          note_id: data.noteId,
          title: out.title || `${data.topic ?? noteTitle ?? "Flashcards"}`,
          topic: data.topic,
          cards: cards as unknown as Json,
        })
        .select("id")
        .single();
      if (error) throw new AiError("Couldn't save your flashcards.", 500);
      return { id: row.id };
    }),
  );

// ---------------- Recording -> Notes ----------------
export const recordingToNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { recordingId: string }) =>
    z.object({ recordingId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) =>
    run(async () => {
      const { data: rec } = await context.supabase
        .from("recordings")
        .select("*")
        .eq("id", data.recordingId)
        .maybeSingle();
      if (!rec) throw new AiError("Recording not found.", 404);
      if (!rec.transcript?.trim()) throw new AiError("Transcribe the recording first.", 400);
      const { profile } = await prepareAiRequest(
        context.supabase,
        context.userId,
        "recording_notes",
      );
      const course = await courseName(context.supabase, rec.course_id);
      const out = await aiStructured<{ title: string; topic: string; html: string }>({
        instructions: `You are ClassPilot AI. Turn a lesson transcript into organized class notes. ${gradeGuidance(profile?.grade)} ${TRUST}
Organize the transcript; identify important topics, definitions, examples and key concepts. Output HTML using only h2, h3, p, ul, ol, li, strong, em, mark, blockquote. Structure: a short overview paragraph, then sections with headings, a "Key Definitions" section (<p><strong>Term</strong>: definition</p>), an "Examples" section, and a "Key Concepts to Remember" bullet list. Ignore off-topic chatter.`,
        messages: [
          {
            role: "user",
            content: `Class: ${course ?? "General"}\nRecording: ${rec.title}\n\nTranscript:\n${rec.transcript.slice(0, 60_000)}`,
          },
        ],
        schema: obj({ title: str(), topic: str(), html: str() }),
        effort: "medium",
      });
      const { data: note, error } = await context.supabase
        .from("notes")
        .insert({
          student_id: context.userId,
          course_id: rec.course_id,
          title: out.title || `${rec.title} — Notes`,
          topic: out.topic || null,
          content: out.html,
          content_text: htmlToText(out.html),
        })
        .select("id")
        .single();
      if (error) throw new AiError("Couldn't save the notes.", 500);
      await context.supabase.from("recordings").update({ note_id: note.id }).eq("id", rec.id);
      return { noteId: note.id };
    }),
  );

// ---------------- Document / image extraction ----------------
export const extractDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { path: string; mimeType: string; fileName: string }) =>
    z
      .object({
        path: z.string().min(3).max(500),
        mimeType: z.string().max(100),
        fileName: z.string().max(300),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) =>
    run(async () => {
      if (!data.path.startsWith(`${context.userId}/`)) throw new AiError("Not allowed.", 403);
      const isPdf = data.mimeType === "application/pdf";
      const isImage = data.mimeType.startsWith("image/");
      if (!isPdf && !isImage)
        throw new AiError("Only PDFs and images can be read by AI here.", 400);
      const { profile } = await prepareAiRequest(
        context.supabase,
        context.userId,
        "extract_document",
      );
      const { data: blob, error } = await context.supabase.storage
        .from("uploads")
        .download(data.path);
      if (error || !blob) throw new AiError("Couldn't open the uploaded file.", 404);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i += 0x8000)
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      const base64 = btoa(binary);
      const part = isPdf
        ? ({
            type: "file",
            data: base64,
            mediaType: "application/pdf",
            filename: data.fileName,
          } as const)
        : ({ type: "image", image: new URL(`data:${data.mimeType};base64,${base64}`) } as const);
      const out = await aiStructured<{ title: string; html: string }>({
        instructions: `You read class documents, worksheets and photos of handwritten notes for a student. ${gradeGuidance(profile?.grade)} Transcribe the content faithfully into clean HTML (h2, h3, p, ul, ol, li, strong, em, table, tr, th, td). Keep math readable in plain text (e.g. y = mx + b). Do not solve worksheet problems or add content that isn't there. If parts are illegible, write [illegible].`,
        messages: [
          { role: "user", content: [{ type: "text", text: `File: ${data.fileName}` }, part] },
        ],
        schema: obj({ title: str(), html: str() }),
      });
      return { title: out.title, html: out.html };
    }),
  );
