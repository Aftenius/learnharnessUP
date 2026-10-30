"use client";

import { useEffect, useRef, useState } from "react";
import { code, type HighlightResult } from "@streamdown/code";
import { snippetSrcDoc, splitTrace, type TraceFrame } from "@/src/core";

/** Same face on the painted layer and the transparent editor, or the caret drifts. */
const SOURCE_FACE =
	"m-0 w-full min-w-0 resize-none overflow-hidden whitespace-pre-wrap break-words bg-transparent p-2 font-mono text-xs leading-5 [overflow-wrap:anywhere] [tab-size:4]";

type PaintToken = { content: string; htmlStyle?: Record<string, string> };

function tokenColor(token: PaintToken): string | undefined {
	const style = token.htmlStyle;
	if (!style) return undefined;
	return style["--shiki-dark"] ?? style.color;
}

/** Python tokens from the same highlighter as the other fences. Plain text until it resolves. */
function SnippetHighlight({ source }: { source: string }) {
	const [lines, setLines] = useState<PaintToken[][] | null>(null);

	useEffect(() => {
		let live = true;
		setLines(null);
		const options = { code: source, language: "python" as const, themes: code.getThemes() };
		const apply = (result: HighlightResult) => {
			if (live) setLines(result.tokens as PaintToken[][]);
		};
		const cached = code.highlight(options, apply);
		if (cached) apply(cached);
		return () => {
			live = false;
		};
	}, [source]);

	if (!lines) {
		return (
			<pre aria-hidden data-testid="snippet-highlight" className={SOURCE_FACE}>
				{source.endsWith("\n") ? `${source} ` : source}
			</pre>
		);
	}

	return (
		<pre aria-hidden data-testid="snippet-highlight" className={SOURCE_FACE}>
			{lines.map((line, index) => (
				<span key={index} className="block min-h-5">
					{line.length === 0
						? " "
						: line.map((token, tokenIndex) => (
								<span key={tokenIndex} style={{ color: tokenColor(token) }}>
									{token.content}
								</span>
							))}
				</span>
			))}
		</pre>
	);
}

/**
 * Python in the existing iframe sandbox: scripts only, no same-origin.
 * The runner compares stdout with the committed expect after the run.
 * LH_TRACE lines become a stepper. Other diagrams stay Mermaid.
 */
export function SnippetSandbox({ code, expect }: { code: string; expect?: string }) {
	const [source, setSource] = useState(code);
	const [stdout, setStdout] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [pass, setPass] = useState<boolean | null>(null);
	const [frames, setFrames] = useState<TraceFrame[]>([]);
	const [frame, setFrame] = useState(0);
	const [running, setRunning] = useState(false);
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const [srcDoc, setSrcDoc] = useState<string | null>(null);
	const [runId, setRunId] = useState(0);

	useEffect(() => {
		const onMessage = (event: MessageEvent) => {
			if (event.source !== iframeRef.current?.contentWindow) return;
			const data = event.data as { type?: string; ok?: boolean; stdout?: string; error?: string; pass?: boolean | null };
			if (data?.type !== "lh-snippet") return;
			setRunning(false);
			if (!data.ok) {
				setError(data.error ?? "запуск не удался");
				setPass(null);
				return;
			}
			const split = splitTrace(data.stdout ?? "");
			setStdout(split.visible);
			setFrames(split.frames);
			setFrame(0);
			setError(null);
			setPass(data.pass ?? null);
		};
		window.addEventListener("message", onMessage);
		return () => window.removeEventListener("message", onMessage);
	}, []);

	const current = frames[frame];
	return (
		<div data-testid="snippet-sandbox" className="relative my-2 rounded-xl border bg-card p-3">
			<div className="grid w-full min-w-0 overflow-hidden rounded-md border bg-background">
				<SnippetHighlight source={source} />
				<textarea
					value={source}
					rows={Math.max(1, source.split("\n").length)}
					onChange={(event) => setSource(event.target.value)}
					aria-label="Фрагмент Python"
					spellCheck={false}
					className={`${SOURCE_FACE} field-sizing-content col-start-1 row-start-1 text-transparent caret-[var(--foreground)] outline-none selection:bg-primary/30`}
				/>
			</div>
			<div className="mt-2 flex items-center gap-2">
				<button
					type="button"
					data-testid="snippet-run"
					disabled={running}
					onClick={() => {
						setRunning(true);
						setError(null);
						setRunId((n) => n + 1);
						setSrcDoc(snippetSrcDoc(source, expect));
					}}
					className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground disabled:opacity-50"
				>
					{running ? "Запуск…" : "Запустить"}
				</button>
				{pass === true && <span className="text-xs text-green-600">Совпадает с ожидаемым выводом</span>}
				{pass === false && <span className="text-xs text-destructive">Не совпадает с ожидаемым выводом</span>}
			</div>
			{error && <p className="mt-2 text-xs text-destructive">{error}</p>}
			{stdout && <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-xs">{stdout}</pre>}
			{frames.length > 0 && current && (
				<div data-testid="trace-stepper" className="mt-2 border-t pt-2">
					<div className="flex items-center gap-2 text-xs">
						<button type="button" disabled={frame === 0} onClick={() => setFrame((n) => Math.max(0, n - 1))} className="rounded border px-1.5 py-0.5 disabled:opacity-40">
							Назад
						</button>
						<span>
							Шаг {current.step}{current.label ? ` · ${current.label}` : ""} ({frame + 1}/{frames.length})
						</span>
						<button type="button" disabled={frame >= frames.length - 1} onClick={() => setFrame((n) => Math.min(frames.length - 1, n + 1))} className="rounded border px-1.5 py-0.5 disabled:opacity-40">
							Дальше
						</button>
					</div>
					<pre className="mt-1 overflow-x-auto font-mono text-xs">{JSON.stringify(current.state, null, 2)}</pre>
				</div>
			)}
			{srcDoc && (
				<iframe
					key={runId}
					ref={iframeRef}
					title="Фрагмент Python"
					sandbox="allow-scripts"
					srcDoc={srcDoc}
					className="pointer-events-none absolute h-px w-px overflow-hidden border-0 opacity-0"
				/>
			)}
		</div>
	);
}
