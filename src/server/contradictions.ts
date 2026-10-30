/**
 * Rescan propositions for mutually exclusive pairs and record a learner label.
 * Neither path edits nodes or chains.
 */

import { labelProposal, scanContradictions, type ContradictionLabel, type ContradictionProposal } from "../core/contradictions.ts";
import { getGraph } from "../core/graph.ts";
import { stores } from "./stores.ts";

export function listContradictions(): ContradictionProposal[] {
	return stores.contradictionStore.readProposals();
}

export function scanContradictionProposals(): ContradictionProposal[] {
	const graph = getGraph(stores.graphStore);
	const next = scanContradictions(
		graph.nodes.map((node) => ({ id: node.id, statement: node.statement })),
		stores.contradictionStore.readProposals(),
	);
	stores.contradictionStore.writeProposals(next);
	return next;
}

export function setContradictionLabel(id: string, label: ContradictionLabel): ContradictionProposal[] | null {
	const next = labelProposal(stores.contradictionStore.readProposals(), id, label);
	if (!next) return null;
	stores.contradictionStore.writeProposals(next);
	return next;
}
