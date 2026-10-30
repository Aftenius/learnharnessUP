"use client";

import { useEffect, useRef, useState } from "react";
import { snippetSrcDoc, splitTrace, type TraceFrame } from "@/src/core";

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
		<div data-testid="snippet-sandbox" className="my-2 rounded-xl border bg-card p-3">
			<textarea
				value={source}
				onChange={(event) => setSource(event.target.value)}
				aria-label="Фрагмент Python"
				spellCheck={false}
				className="min-h-24 w-full resize-y rounded-md border bg-background p-2 font-mono text-xs outline-none"
			/>
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
					className="hidden"
				/>
			)}
		</div>
	);
}
