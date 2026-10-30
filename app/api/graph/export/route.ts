import { graphExport, type GraphExportFormat } from "@/src/server";

export const dynamic = "force-dynamic";

const FORMATS = new Set<GraphExportFormat>(["obsidian", "logseq", "graphml"]);

export function GET(request: Request) {
	const format = new URL(request.url).searchParams.get("format");
	if (!format || !FORMATS.has(format as GraphExportFormat)) {
		return Response.json({ error: "format must be obsidian, logseq, or graphml" }, { status: 400 });
	}
	const file = graphExport(format as GraphExportFormat);
	if (!file) return Response.json({ error: "Nothing to export" }, { status: 404 });
	return new Response(Buffer.from(file.body), {
		headers: {
			"content-type": file.contentType,
			"content-disposition": `attachment; filename="${file.filename}"`,
		},
	});
}
