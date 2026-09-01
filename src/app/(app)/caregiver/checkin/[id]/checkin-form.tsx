"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banner, Button, Field, Textarea } from "@/components/ui";
import type { CheckinStatus, QuestionType } from "@/lib/types";

interface Question {
  id: string;
  category: string;
  prompt: string;
  question_type: QuestionType;
  is_required: boolean;
  sort_order: number;
}

type AnswerValue = { text?: string; number?: number; boolean?: boolean };

export function CheckinForm({
  careRecipientId,
  templateId,
  questions,
}: {
  careRecipientId: string;
  templateId: string;
  questions: Question[];
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [status, setStatus] = useState<CheckinStatus>("normal");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function setAnswer(id: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const missing = questions.find((q) => q.is_required && !hasAnswer(answers[q.id]));
    if (missing) {
      setError(`Please answer: "${missing.prompt}"`);
      return;
    }

    const responses = questions
      .filter((q) => hasAnswer(answers[q.id]))
      .map((q) => ({
        questionId: q.id,
        category: q.category,
        valueText: answers[q.id]?.text,
        valueNumber: answers[q.id]?.number,
        valueBoolean: answers[q.id]?.boolean,
      }));

    setLoading(true);
    const res = await fetch("/api/checkins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        careRecipientId,
        templateId,
        status,
        notes,
        responses,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Couldn't submit the check-in. Please try again.");
      return;
    }

    setSubmitted(true);
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1500);
  }

  if (submitted) {
    return (
      <div className="rounded-2xl bg-moss-light p-6 text-center">
        <p className="font-display text-lg text-moss-dark">Check-in saved</p>
        <p className="mt-1 text-[14px] text-moss-dark">Thank you — this is now visible to the family.</p>
      </div>
    );
  }

  const grouped = groupByCategory(questions);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && <Banner variant="error">{error}</Banner>}

      {grouped.map(([category, qs]) => (
        <div key={category} className="space-y-4">
          <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-ink-soft">
            {formatCategory(category)}
          </p>
          {qs.map((q) => (
            <QuestionInput key={q.id} question={q} value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)} />
          ))}
        </div>
      ))}

      <div>
        <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.12em] text-ink-soft">
          Overall
        </p>
        <div className="flex gap-2">
          <StatusOption current={status} value="normal" label="All normal" onSelect={setStatus} />
          <StatusOption current={status} value="attention" label="Needs attention" onSelect={setStatus} />
          <StatusOption current={status} value="urgent" label="Urgent" onSelect={setStatus} />
        </div>
        {status === "urgent" && (
          <p className="mt-2 text-[13px] text-brick">
            If this is a medical emergency, call 911 or your local emergency service
            directly — don&apos;t rely on this check-in to get help quickly.
          </p>
        )}
      </div>

      <Field label="Notes for the family" hint="Optional, but helpful context if something's off.">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </Field>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Submitting…" : "Submit check-in"}
      </Button>
    </form>
  );
}

function hasAnswer(v: AnswerValue | undefined): boolean {
  if (!v) return false;
  return v.text !== undefined || v.number !== undefined || v.boolean !== undefined;
}

function groupByCategory(questions: Question[]): [string, Question[]][] {
  const map = new Map<string, Question[]>();
  for (const q of questions) {
    if (!map.has(q.category)) map.set(q.category, []);
    map.get(q.category)!.push(q);
  }
  return Array.from(map.entries());
}

function formatCategory(c: string) {
  return c.charAt(0).toUpperCase() + c.slice(1);
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
}) {
  if (question.question_type === "scale") {
    return (
      <div>
        <p className="text-[14px] text-ink">
          {question.prompt} {question.is_required && <span className="text-brick">*</span>}
        </p>
        <div className="mt-2 flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange({ number: n })}
              className={`flex h-11 w-11 items-center justify-center rounded-full border text-[14px] font-medium transition-colors ${
                value?.number === n
                  ? "border-moss bg-moss text-paper"
                  : "border-line text-ink-soft hover:border-moss"
              }`}
              aria-label={`${n} out of 5`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (question.question_type === "boolean") {
    return (
      <div>
        <p className="text-[14px] text-ink">
          {question.prompt} {question.is_required && <span className="text-brick">*</span>}
        </p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => onChange({ boolean: true })}
            className={`min-h-[44px] flex-1 rounded-xl border text-[14px] font-medium transition-colors ${
              value?.boolean === true
                ? "border-moss bg-moss text-paper"
                : "border-line text-ink-soft hover:border-moss"
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => onChange({ boolean: false })}
            className={`min-h-[44px] flex-1 rounded-xl border text-[14px] font-medium transition-colors ${
              value?.boolean === false
                ? "border-brick bg-brick-light text-brick"
                : "border-line text-ink-soft hover:border-brick"
            }`}
          >
            No
          </button>
        </div>
      </div>
    );
  }

  return (
    <Field label={question.prompt}>
      <Textarea
        value={value?.text ?? ""}
        onChange={(e) => onChange({ text: e.target.value })}
        rows={2}
      />
    </Field>
  );
}

function StatusOption({
  current,
  value,
  label,
  onSelect,
}: {
  current: CheckinStatus;
  value: CheckinStatus;
  label: string;
  onSelect: (v: CheckinStatus) => void;
}) {
  const active = current === value;
  const activeStyles: Record<CheckinStatus, string> = {
    normal: "border-moss bg-moss-light text-moss-dark",
    attention: "border-amber bg-amber-light text-amber",
    urgent: "border-brick bg-brick-light text-brick",
  };
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`flex-1 rounded-xl border px-3 py-2.5 text-[13px] font-medium transition-colors ${
        active ? activeStyles[value] : "border-line text-ink-soft hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}
