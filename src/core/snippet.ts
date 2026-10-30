/**
 * Runnable Python fences and the trace frames they may print.
 * A fence is runnable only when its info string says `run`.
 * Expected stdout is the model's commitment, compared after the run.
 * Trace lines are a client-side stepper, not a separate tutor.
 */

export interface RunnableSnippet {
	expect?: string;
}

export interface TraceFrame {
	step: number;
	label?: string;
	state: unknown;
}

const EXPECT_RE = /\bexpect=(?:"([^"]*)"|'([^']*)'|(\S+))/;

/** Python fences marked `run`. Other languages stay ordinary code blocks. */
export function parseRunnableSnippet(language: string, meta: string): RunnableSnippet | null {
	if (language !== "python" || !/\brun\b/.test(meta)) return null;
	const match = EXPECT_RE.exec(meta);
	const raw = match?.[1] ?? match?.[2] ?? match?.[3];
	if (raw === undefined) return {};
	return { expect: raw.replace(/\\n/g, "\n").replace(/\\t/g, "\t") };
}

export function splitTrace(stdout: string): { visible: string; frames: TraceFrame[] } {
	const frames: TraceFrame[] = [];
	const lines: string[] = [];
	for (const line of stdout.split("\n")) {
		if (!line.startsWith("LH_TRACE ")) {
			lines.push(line);
			continue;
		}
		try {
			const raw = JSON.parse(line.slice("LH_TRACE ".length)) as { step?: unknown; label?: unknown; state?: unknown };
			if (typeof raw.step !== "number" || !Number.isFinite(raw.step)) continue;
			frames.push({
				step: raw.step,
				...(typeof raw.label === "string" ? { label: raw.label } : {}),
				state: raw.state ?? null,
			});
		} catch {
			lines.push(line);
		}
	}
	return { visible: lines.join("\n").trimEnd(), frames };
}

export const SNIPPET_OUTPUT_LIMIT = 4000;
export const SNIPPET_RUN_MS = 8000;

/** srcdoc for the sandboxed runner. The snippet has no fetch bridge. */
export function snippetSrcDoc(code: string, expect: string | undefined): string {
	const payload = JSON.stringify({ code, expect: expect ?? null, runMs: SNIPPET_RUN_MS, outputLimit: SNIPPET_OUTPUT_LIMIT }).replace(/</g, "\\u003c");
	return `<!doctype html>
<html><head>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://cdn.jsdelivr.net; connect-src https://cdn.jsdelivr.net; worker-src blob: https://cdn.jsdelivr.net;">
</head><body><script>
const job = ${payload};
const send = (msg) => parent.postMessage(Object.assign({ type: "lh-snippet" }, msg), "*");
const timer = setTimeout(() => send({ ok: false, error: "timed out" }), 90000);
(async () => {
  try {
    const pyodideMod = await import("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.mjs");
    const pyodide = await pyodideMod.loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/" });
    let out = "";
    const add = (text) => { out += text.endsWith("\\n") ? text : text + "\\n"; };
    pyodide.setStdout({ batched: add });
    pyodide.setStderr({ batched: add });
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("timed out")), job.runMs));
    const run = (async () => {
      await pyodide.runPythonAsync(
        "import asyncio as _lh_asyncio\\n" +
        "_lh_pending = []\\n" +
        "def _lh_run(coro, *args, **kwargs):\\n" +
        "    _lh_pending.append(coro)\\n" +
        "    return None\\n" +
        "_lh_asyncio.run = _lh_run\\n"
      );
      await pyodide.runPythonAsync(job.code);
      await pyodide.runPythonAsync(
        "for _lh_coro in _lh_pending:\\n" +
        "    await _lh_coro\\n"
      );
    })();
    await Promise.race([run, timeout]);
    if (out.length > job.outputLimit) out = out.slice(0, job.outputLimit) + "\\n…";
    const stdout = out.replace(/\\s+$/, "");
    const expected = job.expect === null ? null : String(job.expect);
    send({ ok: true, stdout, pass: expected === null ? null : stdout === expected });
  } catch (err) {
    send({ ok: false, error: err && err.message ? err.message : "run failed" });
  } finally {
    clearTimeout(timer);
  }
})();
</script></body></html>`;
}
