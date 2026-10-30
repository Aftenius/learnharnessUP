/**
 * SM-2 scheduling for graph propositions.
 * The review record is a separate ledger. It is not a field on GraphNode,
 * and a practice grade does not write it. Only an answer to the session-start
 * card updates a card. A miss pulls chain-neighbors due sooner.
 */

export interface ReviewRecord {
	nodeId: string;
	ease: number;
	intervalDays: number;
	repetitions: number;
	dueAt: string;
	lastReviewedAt?: string;
	lastQuality?: number;
}

const MIN_EASE = 1.3;

export function initialReview(nodeId: string, now: Date): ReviewRecord {
	return {
		nodeId,
		ease: 2.5,
		intervalDays: 0,
		repetitions: 0,
		dueAt: now.toISOString(),
	};
}

/** SM-2. Quality is an integer 0–5. Below 3 resets the streak and the interval to 1 day. */
export function applySm2(state: ReviewRecord, quality: number, now: Date): ReviewRecord {
	const q = Math.max(0, Math.min(5, Math.round(quality)));
	let ease = state.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
	if (ease < MIN_EASE) ease = MIN_EASE;
	let repetitions = state.repetitions;
	let interval = state.intervalDays;
	if (q < 3) {
		repetitions = 0;
		interval = 1;
	} else if (repetitions === 0) {
		interval = 1;
		repetitions = 1;
	} else if (repetitions === 1) {
		interval = 6;
		repetitions = 2;
	} else {
		interval = Math.max(1, Math.round(interval * ease));
		repetitions += 1;
	}
	const due = new Date(now.getTime() + interval * 86_400_000);
	return {
		...state,
		ease,
		intervalDays: interval,
		repetitions,
		dueAt: due.toISOString(),
		lastReviewedAt: now.toISOString(),
		lastQuality: q,
	};
}

/**
 * Map a card answer onto SM-2 quality.
 * Correct and unsure is a pass that should come back sooner than a confident pass.
 * Wrong and confident is the strongest miss.
 */
export function qualityFromSignal(correct: boolean, confidence: number | undefined): number {
	const conf = confidence === undefined ? 50 : Math.max(0, Math.min(100, Math.round(confidence)));
	if (!correct) return conf >= 70 ? 1 : 2;
	if (conf >= 70) return 5;
	if (conf >= 50) return 4;
	return 3;
}

export function chainNeighborIds(
	nodeId: string,
	chains: readonly { premises: readonly string[]; conclusion: string }[],
): string[] {
	const out = new Set<string>();
	for (const chain of chains) {
		const ids = [...chain.premises, chain.conclusion];
		if (!ids.includes(nodeId)) continue;
		for (const id of ids) if (id !== nodeId) out.add(id);
	}
	return [...out];
}

/** Bring a neighbor due within a day. A card already due sooner stays put. */
export function pullDue(state: ReviewRecord, now: Date): ReviewRecord {
	const soon = new Date(now.getTime() + 86_400_000).toISOString();
	if (state.dueAt <= soon) return state;
	return { ...state, dueAt: soon };
}

export interface ReviewNodeRef {
	id: string;
	createdAt: string;
}

/**
 * Oldest never-reviewed proposition, otherwise the most overdue card.
 * Null when nothing is due. Skipping a card does not call this writer.
 */
export function pickReviewCard(
	nodes: readonly ReviewNodeRef[],
	records: readonly ReviewRecord[],
	now: Date,
): ReviewRecord | null {
	const byId = new Map(records.map((record) => [record.nodeId, record]));
	const fresh = nodes
		.filter((node) => !byId.has(node.id))
		.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
	const first = fresh[0];
	if (first) return initialReview(first.id, now);
	const nowIso = now.toISOString();
	const due = records
		.filter((record) => nodes.some((node) => node.id === record.nodeId) && record.dueAt <= nowIso)
		.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
	return due[0] ?? null;
}

/**
 * Grade one card. Neighbors move earlier only on a miss (quality below 3).
 * Nodes that are not the card and not a neighbor are unchanged.
 */
export function gradeReview(
	records: readonly ReviewRecord[],
	nodeId: string,
	quality: number,
	neighborIds: readonly string[],
	now: Date,
): ReviewRecord[] {
	const byId = new Map(records.map((record) => [record.nodeId, record]));
	const current = byId.get(nodeId) ?? initialReview(nodeId, now);
	const next = applySm2(current, quality, now);
	byId.set(nodeId, next);
	if ((next.lastQuality ?? 5) < 3) {
		for (const id of neighborIds) {
			if (id === nodeId) continue;
			const neighbor = byId.get(id) ?? initialReview(id, now);
			byId.set(id, pullDue(neighbor, now));
		}
	}
	return [...byId.values()];
}
