"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Algorithm = "bubble" | "selection" | "insertion" | "merge" | "quick" | "heap";
type Frame = { values: number[]; active: number[]; sorted: number[]; comparisons: number; swaps: number };

const algorithms: { id: Algorithm; name: string; complexity: string; description: string }[] = [
  { id: "bubble", name: "Bubble Sort", complexity: "O(n²)", description: "Repeatedly swaps adjacent values that are out of order." },
  { id: "selection", name: "Selection Sort", complexity: "O(n²)", description: "Finds the smallest remaining value and moves it into place." },
  { id: "insertion", name: "Insertion Sort", complexity: "O(n²)", description: "Builds a sorted section by inserting each new value." },
  { id: "merge", name: "Merge Sort", complexity: "O(n log n)", description: "Divides the array, then merges sorted sections together." },
  { id: "quick", name: "Quick Sort", complexity: "O(n log n)*", description: "Partitions values around a pivot, then sorts each side." },
  { id: "heap", name: "Heap Sort", complexity: "O(n log n)", description: "Builds a max heap and extracts its largest value repeatedly." },
];

function randomValues(size: number) {
  return Array.from({ length: size }, () => Math.floor(Math.random() * 85) + 10);
}

function buildFrames(source: number[], algorithm: Algorithm) {
  const values = [...source];
  const frames: Frame[] = [];
  let comparisons = 0;
  let swaps = 0;
  const push = (active: number[] = [], sorted: number[] = []) =>
    frames.push({ values: [...values], active, sorted, comparisons, swaps });
  const swap = (a: number, b: number, sorted: number[] = []) => {
    [values[a], values[b]] = [values[b], values[a]];
    swaps++;
    push([a, b], sorted);
  };

  if (algorithm === "bubble") {
    for (let end = values.length - 1; end > 0; end--) {
      for (let i = 0; i < end; i++) {
        comparisons++;
        push([i, i + 1], Array.from({ length: values.length - 1 - end }, (_, j) => end + 1 + j));
        if (values[i] > values[i + 1]) swap(i, i + 1);
      }
      push([], Array.from({ length: values.length - end }, (_, j) => end + j));
    }
  }

  if (algorithm === "selection") {
    for (let start = 0; start < values.length - 1; start++) {
      let min = start;
      for (let i = start + 1; i < values.length; i++) {
        comparisons++;
        push([min, i], Array.from({ length: start }, (_, j) => j));
        if (values[i] < values[min]) min = i;
      }
      if (min !== start) swap(start, min);
      push([], Array.from({ length: start + 1 }, (_, j) => j));
    }
  }

  if (algorithm === "insertion") {
    for (let i = 1; i < values.length; i++) {
      const item = values[i];
      let j = i - 1;
      while (j >= 0) {
        comparisons++;
        push([j, j + 1], Array.from({ length: i }, (_, k) => k));
        if (values[j] <= item) break;
        values[j + 1] = values[j];
        swaps++;
        push([j, j + 1]);
        j--;
      }
      values[j + 1] = item;
      push([j + 1], Array.from({ length: i + 1 }, (_, k) => k));
    }
  }

  if (algorithm === "merge") {
    const merge = (left: number, middle: number, right: number) => {
      const copy = values.slice(left, right + 1);
      let i = 0;
      let j = middle - left + 1;
      for (let target = left; target <= right; target++) {
        comparisons++;
        push([target]);
        if (i > middle - left || (j <= right - left && copy[j] < copy[i])) values[target] = copy[j++];
        else values[target] = copy[i++];
        swaps++;
        push([target]);
      }
    };
    const divide = (left: number, right: number) => {
      if (left >= right) return;
      const middle = Math.floor((left + right) / 2);
      divide(left, middle);
      divide(middle + 1, right);
      merge(left, middle, right);
    };
    divide(0, values.length - 1);
  }

  if (algorithm === "quick") {
    const partition = (low: number, high: number) => {
      const pivot = values[high];
      let boundary = low;
      for (let i = low; i < high; i++) {
        comparisons++;
        push([i, high]);
        if (values[i] < pivot) swap(i, boundary++);
      }
      swap(boundary, high);
      return boundary;
    };
    const sort = (low: number, high: number) => {
      if (low >= high) return;
      const pivot = partition(low, high);
      sort(low, pivot - 1);
      sort(pivot + 1, high);
    };
    sort(0, values.length - 1);
  }

  if (algorithm === "heap") {
    const heapify = (length: number, root: number) => {
      let largest = root;
      const left = root * 2 + 1;
      const right = left + 1;
      if (left < length) {
        comparisons++;
        push([largest, left]);
        if (values[left] > values[largest]) largest = left;
      }
      if (right < length) {
        comparisons++;
        push([largest, right]);
        if (values[right] > values[largest]) largest = right;
      }
      if (largest !== root) {
        swap(root, largest);
        heapify(length, largest);
      }
    };
    for (let i = Math.floor(values.length / 2) - 1; i >= 0; i--) heapify(values.length, i);
    for (let end = values.length - 1; end > 0; end--) {
      swap(0, end, Array.from({ length: values.length - 1 - end }, (_, j) => end + 1 + j));
      heapify(end, 0);
    }
  }

  push([], values.map((_, i) => i));
  return frames;
}

export default function Home() {
  const [algorithm, setAlgorithm] = useState<Algorithm>("bubble");
  const [size, setSize] = useState(24);
  const [speed, setSpeed] = useState(55);
  const [values, setValues] = useState(() => randomValues(24));
  const [frame, setFrame] = useState<Frame>({ values, active: [], sorted: [], comparisons: 0, swaps: 0 });
  const [status, setStatus] = useState<"ready" | "running" | "paused" | "done">("ready");
  const framesRef = useRef<Frame[]>([]);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selected = algorithms.find((item) => item.id === algorithm)!;

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const reset = useCallback((nextValues = values) => {
    stopTimer();
    framesRef.current = [];
    indexRef.current = 0;
    setValues(nextValues);
    setFrame({ values: nextValues, active: [], sorted: [], comparisons: 0, swaps: 0 });
    setStatus("ready");
  }, [stopTimer, values]);

  const runNext = useCallback(function advanceFrame() {
    const next = framesRef.current[indexRef.current++];
    if (!next) {
      setStatus("done");
      return;
    }
    setFrame(next);
    timerRef.current = setTimeout(advanceFrame, Math.max(14, 320 - speed * 3));
  }, [speed]);

  const play = () => {
    stopTimer();
    if (!framesRef.current.length || status === "done") {
      if (status === "done") reset();
      framesRef.current = buildFrames(values, algorithm);
      indexRef.current = 0;
    }
    setStatus("running");
    runNext();
  };

  const pause = () => {
    stopTimer();
    setStatus("paused");
  };

  const step = () => {
    stopTimer();
    if (!framesRef.current.length || status === "done") {
      framesRef.current = buildFrames(status === "done" ? values : frame.values, algorithm);
      indexRef.current = 0;
    }
    const next = framesRef.current[indexRef.current++];
    if (next) {
      setFrame(next);
      setStatus("paused");
    } else setStatus("done");
  };

  const randomize = () => reset(randomValues(size));

  useEffect(() => () => stopTimer(), [stopTimer]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return;
      event.preventDefault();
      if (status === "running") pause();
      else play();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Sort Lab home">
          <span className="brand-mark"><i /><i /><i /></span>
          <span>Sort Lab</span>
        </a>
        <span className="eyebrow">Interactive algorithm visualizer</span>
        <a className="source-link" href="https://en.wikipedia.org/wiki/Sorting_algorithm" target="_blank" rel="noreferrer">Learn the theory ↗</a>
      </header>

      <section className="workspace" id="top">
        <aside className="sidebar">
          <p className="section-label">Choose an algorithm</p>
          <nav className="algorithm-list" aria-label="Sorting algorithms">
            {algorithms.map((item, index) => (
              <button key={item.id} className={algorithm === item.id ? "active" : ""} onClick={() => { setAlgorithm(item.id); reset(); }} disabled={status === "running"}>
                <span className="algorithm-number">0{index + 1}</span>
                <span>{item.name}</span>
                <span className="complexity">{item.complexity}</span>
              </button>
            ))}
          </nav>

          <div className="concept-card">
            <span className="concept-icon">⌁</span>
            <p className="section-label">How it works</p>
            <p>{selected.description}</p>
          </div>
        </aside>

        <div className="main-panel">
          <div className="heading-row">
            <div><p className="overline">Now visualizing</p><h1>{selected.name}</h1></div>
            <div className={`status ${status}`}><span />{status}</div>
          </div>

          <section className="visualizer" aria-label={`${selected.name} visualization`}>
            <div className="chart" role="img" aria-label={`Array of ${frame.values.length} values`}>
              {frame.values.map((value, index) => (
                <div className="bar-column" key={index}>
                  <span className="bar-value">{value}</span>
                  <div className={`bar ${frame.active.includes(index) ? "comparing" : ""} ${frame.sorted.includes(index) ? "sorted" : ""}`} style={{ height: `${value}%` }} />
                </div>
              ))}
              <div className="baseline" />
            </div>

            <div className="legend" aria-hidden="true">
              <span><i className="default" />Unsorted</span><span><i className="compare" />Comparing</span><span><i className="complete" />In position</span>
            </div>
          </section>

          <section className="control-deck">
            <div className="play-controls">
              <button className="icon-button secondary" onClick={randomize} disabled={status === "running"} aria-label="Shuffle array">↝</button>
              {status === "running" ? <button className="play-button" onClick={pause}><span>Ⅱ</span>Pause</button> : <button className="play-button" onClick={play}><span>▶</span>{status === "paused" ? "Resume" : "Start sort"}</button>}
              <button className="icon-button secondary" onClick={step} disabled={status === "running"} aria-label="Advance one step">▮▶</button>
              <button className="text-button" onClick={() => reset()} disabled={status === "running"}>Reset</button>
            </div>

            <div className="sliders">
              <div className="range-control"><span><b>Array size</b><output>{size}</output></span><input aria-label="Array size" type="range" min="8" max="48" value={size} disabled={status === "running"} onChange={(event) => { const next = Number(event.target.value); setSize(next); reset(randomValues(next)); }} /></div>
              <div className="range-control"><span><b>Speed</b><output>{speed}%</output></span><input aria-label="Animation speed" type="range" min="10" max="100" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} /></div>
            </div>

            <div className="stats">
              <div><span>Comparisons</span><strong>{frame.comparisons}</strong></div><div><span>Moves</span><strong>{frame.swaps}</strong></div><div><span>Time</span><strong>{selected.complexity}</strong></div>
            </div>
          </section>
        </div>
      </section>

      <footer><span>Sort Lab</span><p>Built for curious minds. Watch the logic unfold.</p><kbd>Space</kbd><span className="hint">to play / pause</span></footer>
    </main>
  );
}
