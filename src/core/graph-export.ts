/**
 * One-way export of the derived graph.
 * Obsidian gets one Markdown page per proposition plus a JSON Canvas.
 * Logseq gets one page per proposition with block references.
 * GraphML is the single interchange file for Neo4j and Gephi.
 * Nothing here writes back into the ledgers.
 */

export interface ExportNode {
	id: string;
	name: string;
	statement: string;
}

export interface ExportChain {
	premises: readonly string[];
	conclusion: string;
}

export interface ExportPosition {
	x: number;
	y: number;
}

export interface ExportFile {
	path: string;
	text: string;
}

function xmlEscape(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function pageName(node: ExportNode): string {
	const base = node.name.trim() || node.id;
	return `${base} (${node.id})`;
}

function fileSlug(node: ExportNode): string {
	const slug = pageName(node)
		.replace(/[^\p{L}\p{N}]+/gu, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 80);
	return `${slug || node.id}.md`;
}

/** Premise → conclusion for every chain. Implication nodes stay inside the app. */
export function exportEdges(chains: readonly ExportChain[]): { from: string; to: string }[] {
	const edges: { from: string; to: string }[] = [];
	const seen = new Set<string>();
	for (const chain of chains) {
		for (const premise of chain.premises) {
			const key = `${premise}->${chain.conclusion}`;
			if (seen.has(key) || premise === chain.conclusion) continue;
			seen.add(key);
			edges.push({ from: premise, to: chain.conclusion });
		}
	}
	return edges;
}

export function obsidianFiles(
	nodes: readonly ExportNode[],
	chains: readonly ExportChain[],
	positions: Readonly<Record<string, ExportPosition>> = {},
): ExportFile[] {
	const byId = new Map(nodes.map((node) => [node.id, node]));
	const edges = exportEdges(chains);
	const files: ExportFile[] = nodes.map((node) => {
		const outgoing = edges
			.filter((edge) => edge.from === node.id)
			.map((edge) => byId.get(edge.to))
			.filter((target): target is ExportNode => target !== undefined)
			.map((target) => `- [[${pageName(target)}]]`);
		const body = [
			"---",
			`id: ${node.id}`,
			"---",
			"",
			`# ${node.name}`,
			"",
			node.statement,
			"",
			...(outgoing.length > 0 ? ["## Follows", ...outgoing, ""] : []),
		].join("\n");
		return { path: `nodes/${fileSlug(node)}`, text: body };
	});
	const canvasNodes = nodes.map((node, index) => {
		const pos = positions[node.id];
		return {
			id: node.id,
			type: "file",
			file: `nodes/${fileSlug(node)}`,
			x: pos?.x ?? (index % 6) * 280,
			y: pos?.y ?? Math.floor(index / 6) * 180,
			width: 240,
			height: 120,
		};
	});
	const canvasEdges = edges.map((edge, index) => ({
		id: `e${index}`,
		fromNode: edge.from,
		toNode: edge.to,
	}));
	files.push({
		path: "graph.canvas",
		text: JSON.stringify({ nodes: canvasNodes, edges: canvasEdges }, null, 2),
	});
	return files;
}

export function logseqFiles(nodes: readonly ExportNode[], chains: readonly ExportChain[]): ExportFile[] {
	const byId = new Map(nodes.map((node) => [node.id, node]));
	const edges = exportEdges(chains);
	return nodes.map((node) => {
		const links = edges
			.filter((edge) => edge.from === node.id)
			.map((edge) => byId.get(edge.to))
			.filter((target): target is ExportNode => target !== undefined)
			.map((target) => `  - [[${pageName(target)}]]`);
		const text = [
			`- ${node.statement}`,
			`  id:: ${node.id}`,
			`  name:: ${node.name}`,
			...(links.length > 0 ? ["  - follows", ...links] : []),
			"",
		].join("\n");
		return { path: `pages/${fileSlug(node)}`, text };
	});
}

export function graphMl(nodes: readonly ExportNode[], chains: readonly ExportChain[]): string {
	const edges = exportEdges(chains);
	const nodeXml = nodes
		.map(
			(node) =>
				`    <node id="${xmlEscape(node.id)}"><data key="label">${xmlEscape(node.name)}</data><data key="statement">${xmlEscape(node.statement)}</data></node>`,
		)
		.join("\n");
	const edgeXml = edges
		.map((edge) => `    <edge source="${xmlEscape(edge.from)}" target="${xmlEscape(edge.to)}"/>`)
		.join("\n");
	return [
		`<?xml version="1.0" encoding="UTF-8"?>`,
		`<graphml xmlns="http://graphml.graphdrawing.org/xmlns">`,
		`  <key id="label" for="node" attr.name="label" attr.type="string"/>`,
		`  <key id="statement" for="node" attr.name="statement" attr.type="string"/>`,
		`  <graph id="G" edgedefault="directed">`,
		nodeXml,
		edgeXml,
		`  </graph>`,
		`</graphml>`,
		``,
	].join("\n");
}

function crc32(data: Uint8Array): number {
	let crc = 0xffffffff;
	for (const byte of data) {
		crc ^= byte;
		for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
	}
	return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number): number[] {
	return [value & 0xff, (value >> 8) & 0xff];
}

function u32(value: number): number[] {
	return [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff];
}

/** Stored (uncompressed) zip. Paths are relative and use forward slashes. */
export function zipStore(files: readonly { path: string; data: Uint8Array }[]): Uint8Array {
	const parts: number[] = [];
	const central: number[] = [];
	let offset = 0;
	for (const file of files) {
		const name = [...new TextEncoder().encode(file.path)];
		const crc = crc32(file.data);
		const local = [
			...u32(0x04034b50),
			...u16(20),
			...u16(0),
			...u16(0),
			...u16(0),
			...u16(0),
			...u32(crc),
			...u32(file.data.length),
			...u32(file.data.length),
			...u16(name.length),
			...u16(0),
			...name,
			...file.data,
		];
		parts.push(...local);
		central.push(
			...u32(0x02014b50),
			...u16(20),
			...u16(20),
			...u16(0),
			...u16(0),
			...u16(0),
			...u16(0),
			...u32(crc),
			...u32(file.data.length),
			...u32(file.data.length),
			...u16(name.length),
			...u16(0),
			...u16(0),
			...u16(0),
			...u16(0),
			...u32(0),
			...u32(offset),
			...name,
		);
		offset += local.length;
	}
	const centralOffset = offset;
	parts.push(...central);
	parts.push(
		...u32(0x06054b50),
		...u16(0),
		...u16(0),
		...u16(files.length),
		...u16(files.length),
		...u32(central.length),
		...u32(centralOffset),
		...u16(0),
	);
	return Uint8Array.from(parts);
}

export function zipTextFiles(files: readonly ExportFile[]): Uint8Array {
	const encoder = new TextEncoder();
	return zipStore(files.map((file) => ({ path: file.path, data: encoder.encode(file.text) })));
}
