"use client";

import { useEffect, useMemo, useState } from "react";
import { AgentChat } from "./AgentChat";
import { executeSortProgram, parseSortProgram, type ExecutionResult, type SortProgram, type TraceFrame, type ValidationError } from "@/lib/sort-dsl";
import { presets } from "@/lib/sort-presets";

const algorithms = ["bubble", "selection", "insertion", "merge", "quick", "heap"] as const;
const initialProgram = presets[0].program;

function formatProgram(program: SortProgram) {
  return JSON.stringify(program, null, 2);
}

function describeOperation(frame: TraceFrame) {
  const operation = frame.operation;
  if (operation.kind === "start") return "Initial object order";
  if (operation.kind === "compare") {
    const relation = operation.result < 0 ? "comes before" : operation.result > 0 ? "comes after" : "equals";
    return `Compare ${operation.leftId} and ${operation.rightId}: ${operation.leftId} ${relation} ${operation.rightId}`;
  }
  if (operation.kind === "swap") return `Swap positions ${operation.left + 1} and ${operation.right + 1}`;
  if (operation.kind === "shift") return `Shift ${operation.itemId} from position ${operation.from + 1} to ${operation.to + 1}`;
  if (operation.kind === "write") return `Write ${operation.itemId} at position ${operation.index + 1}`;
  if (operation.kind === "focus") return `Focus ${operation.role}: ${operation.itemIds.join(", ")}`;
  if (operation.kind === "settle") return `Mark ${operation.itemIds.length} object${operation.itemIds.length === 1 ? "" : "s"} settled`;
  return "Order complete";
}

function safeExecute(program: SortProgram) {
  try {
    return { execution: executeSortProgram(program), errors: [] as ValidationError[] };
  } catch (cause) {
    return { execution: null, errors: [{ path: "$", message: cause instanceof Error ? cause.message : "Execution failed." }] };
  }
}

export default function Home() {
  const initial = useMemo(() => executeSortProgram(initialProgram), []);
  const [source, setSource] = useState(() => formatProgram(initialProgram));
  const [execution, setExecution] = useState<ExecutionResult>(initial);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(58);

  const frame = execution.trace[Math.min(step, execution.trace.length - 1)];
  const rank = useMemo(() => new Map(execution.target.map((id, index) => [id, index])), [execution.target]);
  const orderLabel = execution.program.order.keys.map((key) => `${key.field} ${key.direction}`).join(" → ");

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      const next = Math.min(step + 1, execution.trace.length - 1);
      setStep(next);
      if (next === execution.trace.length - 1) setPlaying(false);
    }, Math.max(90, 720 - speed * 7));
    return () => window.clearTimeout(timer);
  }, [execution.trace.length, playing, speed, step]);

  const loadProgram = (program: SortProgram) => {
    const result = safeExecute(program);
    if (!result.execution) {
      setErrors(result.errors);
      return;
    }
    setExecution(result.execution);
    setErrors([]);
    setStep(0);
    setPlaying(false);
  };

  const applySource = () => {
    const parsed = parseSortProgram(source);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      setPlaying(false);
      return;
    }
    loadProgram(parsed.program);
  };

  const loadPreset = (program: SortProgram) => {
    setSource(formatProgram(program));
    loadProgram(program);
  };

  const chooseAlgorithm = (name: SortProgram["algorithm"]["name"]) => {
    const program = { ...execution.program, algorithm: { name } };
    setSource(formatProgram(program));
    loadProgram(program);
  };

  const togglePlayback = () => {
    if (step >= execution.trace.length - 1) setStep(0);
    setPlaying((current) => !current);
  };

  return (
    <main className="app-shell">
      <AgentChat />
      <header className="topbar">
        <a className="brand" href="#workbench" aria-label="Sort Lab home">
          <span className="brand-glyph" aria-hidden="true">S/</span>
          <span>Sort Lab</span>
        </a>
        <div className="product-title"><span>DSL Workbench</span><i>v1</i></div>
        <div className="runtime-state"><span className={errors.length ? "error-dot" : "ready-dot"} />{errors.length ? "Needs attention" : "Program valid"}</div>
      </header>

      <section className="workbench" id="workbench">
        <aside className="example-rail">
          <div className="rail-heading">
            <p className="kicker">Object worlds</p>
            <h2>Examples</h2>
          </div>
          <div className="preset-list">
            {presets.map((preset) => (
              <button key={preset.id} className={execution.program.title === preset.program.title ? "selected" : ""} onClick={() => loadPreset(preset.program)}>
                <span>{preset.label}</span>
                <small>{preset.summary}</small>
              </button>
            ))}
          </div>

          <div className="model-card">
            <p className="kicker">The model</p>
            <ol>
              <li><b>Objects</b><span>Identity + data</span></li>
              <li><b>Total order</b><span>Typed keys + tie-break</span></li>
              <li><b>Algorithm</b><span>Strategy → trace</span></li>
            </ol>
          </div>
        </aside>

        <section className="editor-panel" aria-label="DSL editor">
          <div className="panel-heading">
            <div><p className="kicker">Definition</p><h1>Sort program</h1></div>
            <span className="file-name">program.sort.json</span>
          </div>

          <textarea value={source} onChange={(event) => setSource(event.target.value)} spellCheck={false} aria-label="Sort program JSON" />

          {errors.length > 0 && (
            <div className="error-list" role="alert">
              {errors.slice(0, 4).map((item, index) => <p key={`${item.path}-${index}`}><code>{item.path}</code>{item.message}</p>)}
              {errors.length > 4 && <p>+ {errors.length - 4} more errors</p>}
            </div>
          )}

          <div className="editor-actions">
            <span>{source.split("\n").length} lines</span>
            <button className="apply-button" onClick={applySource}>Validate & compile</button>
          </div>

          <section className="contract-card">
            <p className="kicker">Compiled contract</p>
            <dl>
              <div><dt>Objects</dt><dd>{execution.program.objects.length} unique IDs</dd></div>
              <div><dt>Order</dt><dd>{orderLabel}</dd></div>
              <div><dt>Tie-break</dt><dd>Original input position</dd></div>
              <div><dt>Trace</dt><dd>{execution.trace.length} immutable frames</dd></div>
            </dl>
          </section>
        </section>

        <section className="execution-panel" aria-label="Execution trace">
          <div className="execution-heading">
            <div><p className="kicker">Execution</p><h2>{execution.program.title}</h2></div>
            <span className="step-count">{String(frame.step).padStart(3, "0")} / {String(execution.trace.length - 1).padStart(3, "0")}</span>
          </div>

          <div className="algorithm-switcher" aria-label="Choose sorting algorithm">
            {algorithms.map((name) => <button key={name} className={execution.program.algorithm.name === name ? "active" : ""} onClick={() => chooseAlgorithm(name)}>{name}</button>)}
          </div>

          <div className="object-stage">
            <div className="stage-rule"><span>Current sequence</span><span>Adjacent pairs in order are joined</span></div>
            <div className="object-sequence">
              {frame.state.map((id, index) => {
                const item = execution.objectsById[id];
                const inOrder = index < frame.state.length - 1 && rank.get(id)! < rank.get(frame.state[index + 1])!;
                const active = frame.activeIds.includes(id);
                const settled = frame.settledIds.includes(id);
                return (
                  <div className="object-slot" key={id}>
                    <article className={`sort-object ${active ? "active" : ""} ${settled ? "settled" : ""}`}>
                      <span className="object-index">{index + 1}</span>
                      <p>{item.label}</p>
                      <code>{execution.program.order.keys.map((key) => `${key.field}: ${String(item.data[key.field])}`).join(" · ")}</code>
                    </article>
                    {index < frame.state.length - 1 && <span className={`adjacency ${inOrder ? "ordered" : ""}`} aria-label={inOrder ? "Adjacent pair is in order" : "Adjacent pair is out of order"} />}
                  </div>
                );
              })}
            </div>
          </div>

          <section className="operation-card" aria-live="polite">
            <div className={`operation-icon op-${frame.operation.kind}`}>{frame.operation.kind.slice(0, 2).toUpperCase()}</div>
            <div><p className="kicker">{frame.operation.kind}</p><h3>{describeOperation(frame)}</h3></div>
            <div className="metrics"><span><b>{frame.comparisons}</b> comparisons</span><span><b>{frame.mutations}</b> mutations</span></div>
          </section>

          <div className="transport">
            <button className="square-button" onClick={() => { setPlaying(false); setStep(0); }} aria-label="Reset trace">↺</button>
            <button className="play-button" onClick={togglePlayback}>{playing ? "Pause" : step >= execution.trace.length - 1 ? "Replay" : "Run trace"}</button>
            <button className="square-button" onClick={() => { setPlaying(false); setStep((current) => Math.min(current + 1, execution.trace.length - 1)); }} aria-label="Next operation">→</button>
            <label><span>Speed</span><input aria-label="Trace speed" type="range" min="10" max="90" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} /></label>
          </div>

          <details className="event-data">
            <summary>Current operation data</summary>
            <pre>{JSON.stringify(frame.operation, null, 2)}</pre>
          </details>
        </section>
      </section>
    </main>
  );
}
