import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
export function NoteBody({
  value,
  change,
}: {
  value: string;
  change: React.Dispatch<React.SetStateAction<string>>;
}) {
  const editor = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);
  function insert(before: string, after: string, example: string) {
    const el = editor.current;
    if (!el) return;
    const start = el.selectionStart,
      end = el.selectionEnd;
    const selected = value.slice(start, end) || example;
    change(value.slice(0, start) + before + selected + after + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b p-3" aria-label="Note formatting">
        {!preview && (
          <>
            {[
              ["Heading", "\n## ", "", "Heading"],
              ["Bold", "**", "**", "important"],
              ["List", "\n- ", "", "Item"],
            ].map(([label, b, a, e]) => (
              <Button key={label} variant="outline" size="sm" onClick={() => insert(b!, a!, e!)}>
                {label}
              </Button>
            ))}
          </>
        )}
        <Button size="sm" variant="soft" onClick={() => setPreview(!preview)}>
          {preview ? "Edit text" : "Read formatted note"}
        </Button>
      </div>
      {preview ? (
        <article className="prose max-w-none min-h-52 p-4">
          <ReactMarkdown skipHtml disallowedElements={["img"]}>
            {value || "Your formatted note will appear here."}
          </ReactMarkdown>
        </article>
      ) : (
        <Textarea
          ref={editor}
          aria-label="Note text"
          className="min-h-72 border-0 px-4 py-3 md:min-h-96"
          value={value}
          onChange={(e) => change(e.target.value)}
          placeholder="Start writing your notes…"
        />
      )}
      <label className="block border-t p-3 text-sm">
        Append a text or Markdown file (up to 100 KB)
        <input
          className="mt-2 block w-full"
          type="file"
          accept=".txt,.md,text/plain,text/markdown"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (file.size > 100000 || !/\.(txt|md)$/i.test(file.name)) {
              toast.error("Choose a .txt or .md file under 100 KB.");
              return;
            }
            try {
              const text = await file.text();
              append(text);
            } catch {
              toast.error("Could not read file.");
            }
          }}
        />
      </label>
    </section>
  );
  function append(text: string) {
    change((current) => [current, text].filter(Boolean).join("\n\n"));
  }
}
