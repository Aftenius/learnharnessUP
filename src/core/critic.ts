/**
 * Adversarial check of a free explanation.
 * The critic sees the learner's words and the committed answer only.
 * It does not see a teacher draft, and it does not replace the teacher:
 * a disagreement is a note the session model must account for.
 */

export interface CriticVerdict {
	disagrees: boolean;
	note: string;
}

export const CRITIC_SYSTEM_PROMPT = [
	"You are an adversarial verifier for one learner explanation.",
	"You are not the teacher. You do not praise, and you do not rewrite the lesson.",
	"You see only the learner's explanation and the committed correct answer.",
	"Disagree when the explanation is superficial, merely analogous, or misses what the commitment actually demands.",
	"Agree when the explanation meets the commitment, even if the wording is informal.",
	'Reply with JSON only: {"disagrees": boolean, "note": string}.',
	"The note is one or two sentences. Empty when you agree.",
].join("\n");

export function criticUserPrompt(explanation: string, commitment: string, graphStatement?: string): string {
	const lines = [
		`Committed answer:\n${commitment.trim() || "(none)"}`,
		`Learner explanation:\n${explanation.trim()}`,
	];
	if (graphStatement?.trim()) lines.push(`Graph proposition, if it bears on the commitment:\n${graphStatement.trim()}`);
	return lines.join("\n\n");
}

/** Pull the JSON object out of a model reply. Null when the shape is wrong. */
export function parseCriticVerdict(text: string): CriticVerdict | null {
	const start = text.indexOf("{");
	const end = text.lastIndexOf("}");
	if (start < 0 || end <= start) return null;
	try {
		const raw = JSON.parse(text.slice(start, end + 1)) as { disagrees?: unknown; note?: unknown };
		if (typeof raw.disagrees !== "boolean") return null;
		const note = typeof raw.note === "string" ? raw.note.trim() : "";
		if (raw.disagrees && note.length === 0) return null;
		return { disagrees: raw.disagrees, note };
	} catch {
		return null;
	}
}

/**
 * Model-facing note. Names both models so the check is not an invisible
 * co-author. The session model still writes the reply.
 */
export function criticMarkerContent(verdict: CriticVerdict, criticModel: string, sessionModel: string): string {
	return [
		`Adversarial check (${criticModel}) disagrees with treating this explanation as adequate.`,
		`The session model (${sessionModel}) must account for the note below. This check does not replace that reply.`,
		verdict.note,
	].join("\n");
}
