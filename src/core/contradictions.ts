/**
 * Contradiction proposals over proposition statements.
 * A pair is proposed only when the two claims share their content words
 * and exactly one of them is negated. Context shifts and supersession are
 * learner labels. Nothing here merges or deletes a node.
 */

export const CONTRADICTION_LABELS = ["open", "other-context", "superseded", "reconcile"] as const;
export type ContradictionLabel = (typeof CONTRADICTION_LABELS)[number];

export interface ContradictionProposal {
	id: string;
	nodeA: string;
	nodeB: string;
	statementA: string;
	statementB: string;
	reason: string;
	label: ContradictionLabel;
}

export interface ContradictionNode {
	id: string;
	statement: string;
}

const NEGATION_WORDS = new Set([
	"not", "never", "no", "isnt", "arent", "cannot", "cant", "wont", "dont", "doesnt", "didnt", "without",
	"не", "нет", "никогда", "нельзя",
]);

const STOP = new Set([
	"the", "and", "that", "this", "with", "from", "for", "are", "was", "were",
	"что", "это", "как", "для", "или",
]);

function wordsOf(statement: string): string[] {
	return statement
		.toLowerCase()
		.replace(/'/g, "")
		.split(/[^\p{L}\p{N}]+/u)
		.filter((word) => word.length > 0);
}

function negated(statement: string): boolean {
	return wordsOf(statement).some((word) => NEGATION_WORDS.has(word));
}

function tokens(statement: string): Set<string> {
	return new Set(wordsOf(statement).filter((word) => word.length > 2 && !STOP.has(word) && !NEGATION_WORDS.has(word)));
}

function jaccard(a: Set<string>, b: Set<string>): number {
	if (a.size === 0 || b.size === 0) return 0;
	let shared = 0;
	for (const word of a) if (b.has(word)) shared += 1;
	const union = a.size + b.size - shared;
	return union === 0 ? 0 : shared / union;
}

export function pairId(a: string, b: string): string {
	return a < b ? `${a}:${b}` : `${b}:${a}`;
}

/**
 * Learner labels survive a rescan. An open pair that no longer matches is dropped.
 * "other-context" and "superseded" stay so the same pair is not proposed again.
 * "reconcile" stays until the learner changes it. No label deletes a proposition.
 */
export function scanContradictions(
	nodes: readonly ContradictionNode[],
	previous: readonly ContradictionProposal[] = [],
): ContradictionProposal[] {
	const kept = new Map(previous.map((proposal) => [proposal.id, proposal]));
	const found = new Map<string, ContradictionProposal>();
	for (let i = 0; i < nodes.length; i++) {
		for (let j = i + 1; j < nodes.length; j++) {
			const left = nodes[i]!;
			const right = nodes[j]!;
			const leftNeg = negated(left.statement);
			const rightNeg = negated(right.statement);
			if (leftNeg === rightNeg) continue;
			const overlap = jaccard(tokens(left.statement), tokens(right.statement));
			if (overlap < 0.5) continue;
			const id = pairId(left.id, right.id);
			const prior = kept.get(id);
			found.set(id, {
				id,
				nodeA: left.id,
				nodeB: right.id,
				statementA: left.statement,
				statementB: right.statement,
				reason: "The two statements share their content and exactly one is negated.",
				label: prior?.label ?? "open",
			});
		}
	}
	for (const proposal of previous) {
		if (proposal.label !== "open" && !found.has(proposal.id)) found.set(proposal.id, proposal);
	}
	return [...found.values()];
}

export function labelProposal(
	proposals: readonly ContradictionProposal[],
	id: string,
	label: ContradictionLabel,
): ContradictionProposal[] | null {
	if (!CONTRADICTION_LABELS.includes(label) || label === "open") return null;
	const hit = proposals.some((proposal) => proposal.id === id);
	if (!hit) return null;
	return proposals.map((proposal) => (proposal.id === id ? { ...proposal, label } : proposal));
}
