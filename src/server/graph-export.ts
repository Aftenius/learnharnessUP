/**
 * Graph interchange downloads. Export only: the ledgers are not rewritten.
 */

import { graphMl, logseqFiles, obsidianFiles, zipTextFiles } from "../core/graph-export.ts";
import { getGraph } from "../core/graph.ts";
import { stores } from "./stores.ts";

export type GraphExportFormat = "obsidian" | "logseq" | "graphml";

export function graphExport(format: GraphExportFormat): { filename: string; contentType: string; body: Uint8Array } | null {
	const graph = getGraph(stores.graphStore);
	const nodes = graph.nodes.map((node) => ({ id: node.id, name: node.name, statement: node.statement }));
	const chains = graph.chains.map((chain) => ({ premises: chain.premises, conclusion: chain.conclusion }));
	if (format === "graphml") {
		return {
			filename: "learnharness.graphml",
			contentType: "application/graphml+xml",
			body: new TextEncoder().encode(graphMl(nodes, chains)),
		};
	}
	const files = format === "obsidian" ? obsidianFiles(nodes, chains, stores.graphStore.readPositions()) : logseqFiles(nodes, chains);
	return {
		filename: format === "obsidian" ? "learnharness-obsidian.zip" : "learnharness-logseq.zip",
		contentType: "application/zip",
		body: zipTextFiles(files),
	};
}
