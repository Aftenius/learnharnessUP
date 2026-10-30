/**
 * Session-start review cards. The due card is a name, not the statement.
 * Grading writes the review ledger only.
 */

import { getGraph } from "../core/graph.ts";
import { gradeReview, pickReviewCard, qualityFromSignal, chainNeighborIds, type ReviewRecord } from "../core/sm2.ts";
import { stores } from "./stores.ts";

export interface DueCard {
	nodeId: string;
	name: string;
}

export function dueReviewCard(now = new Date()): DueCard | null {
	const graph = getGraph(stores.graphStore);
	const card = pickReviewCard(
		graph.nodes.map((node) => ({ id: node.id, createdAt: node.createdAt })),
		stores.reviewStore.readReviews(),
		now,
	);
	if (!card) return null;
	const node = graph.nodes.find((item) => item.id === card.nodeId);
	if (!node) return null;
	return { nodeId: node.id, name: node.name };
}

export interface GradeResult {
	statement: string;
	quality: number;
	dueAt: string;
}

/** Returns null when the node is not in the graph. */
export function gradeReviewCard(nodeId: string, correct: boolean, confidence: number | undefined, now = new Date()): GradeResult | null {
	const graph = getGraph(stores.graphStore);
	const node = graph.nodes.find((item) => item.id === nodeId);
	if (!node) return null;
	const quality = qualityFromSignal(correct, confidence);
	const neighbors = chainNeighborIds(nodeId, graph.chains);
	const next: ReviewRecord[] = gradeReview(stores.reviewStore.readReviews(), nodeId, quality, neighbors, now);
	stores.reviewStore.writeReviews(next);
	const saved = next.find((record) => record.nodeId === nodeId);
	return { statement: node.statement, quality, dueAt: saved?.dueAt ?? now.toISOString() };
}
