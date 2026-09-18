import type { CaptureOutput } from "@posefighter/backend/convex/shared/contracts";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CaptureScreen } from "./CaptureScreen";
import { type Classification, toPoseResult } from "./classify";
import { DebugOverlay } from "./DebugOverlay";
import { runFixtureChecks } from "./fixtures";
import { captureSnapshot } from "./snapshot";
import {
  DEFAULT_THRESHOLDS,
  type ThresholdKey,
  resetThresholds,
  setThresholds,
  useThresholds,
} from "./thresholds";
import { useLivePose } from "./useLivePose";

type Tab = "live" | "capture";

const btn =
  "h-11 rounded-lg border border-white/20 bg-white/10 px-4 text-sm font-bold uppercase tracking-wide active:scale-95 disabled:opacity-40";

export function VisionDebugPage() {
  const [tab, setTab] = useState<Tab>("live");
  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-black text-white">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2">
        <span className="font-black italic tracking-tighter text-yellow-300 uppercase">Vision debug</span>
        <div className="ml-auto flex gap-1">
          {(["live", "capture"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`h-9 rounded-md px-3 text-xs font-bold uppercase ${tab === t ? "bg-yellow-300 text-black" : "bg-white/10"}`}
            >
              {t === "live" ? "Live" : "CaptureScreen"}
            </button>
          ))}
        </div>
      </div>
      {tab === "live" ? <LiveTab /> : <CaptureTab />}
    </div>
  );
}

function LiveTab() {
  const live = useLivePose();
  const [overlay, setOverlay] = useState(true);
  const [showIds, setShowIds] = useState(false);
  const [last, setLast] = useState<{ output: CaptureOutput; url: string; full: Classification } | null>(null);

  useEffect(() => {
    return () => {
      if (last) URL.revokeObjectURL(last.url);
    };
  }, [last]);

  const captureNow = async () => {
    const video = live.videoRef.current;
    const smoothed = live.getSmoothed();
    if (!video || !smoothed) {
      toast.error("Nothing to capture yet");
      return;
    }
    try {
      const photo = await captureSnapshot(video);
      setLast({ output: { pose: toPoseResult(smoothed), photo }, url: URL.createObjectURL(photo), full: smoothed });
      toast.success(`${smoothed.move} · ${Math.round(photo.size / 1024)} KB`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Snapshot failed");
    }
  };

  const copyLandmarks = async () => {
    const frame = live.getFrame();
    if (!frame?.landmarks) {
      toast.error("No landmarks in frame");
      return;
    }
    const compact = frame.landmarks.map((l) => ({
      x: +l.x.toFixed(4),
      y: +l.y.toFixed(4),
      z: +(l.z ?? 0).toFixed(4),
      visibility: +(l.visibility ?? 0).toFixed(3),
    }));
    await navigator.clipboard.writeText(JSON.stringify({ aspect: frame.width / frame.height, landmarks: compact }));
    toast.success("Landmarks JSON copied");
  };

  const { camera, model } = live;

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,420px)_1fr]">
      <div>
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-neutral-900" onPointerDown={camera.play}>
          <video
            ref={live.videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 h-full w-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
          {overlay ? (
            <DebugOverlay
              frame={live.frame}
              classification={live.classification}
              smoothed={live.smoothed}
              connections={model.connections}
              fps={model.fps}
              delegate={model.delegate}
              speed={live.speed}
              showIds={showIds}
            />
          ) : null}
          {live.hint ? (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-500/90 px-3 py-1 text-xs font-bold text-black uppercase">
              {live.hint}
            </div>
          ) : null}
          {camera.error || model.error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-4 text-center">
              <p className="text-sm text-red-300">{camera.error ?? model.error}</p>
              <button type="button" className={btn} onClick={camera.retry}>
                Retry camera
              </button>
            </div>
          ) : null}
        </div>
        <div className="mt-2 font-mono text-xs text-white/70">
          camera {camera.status} · model {model.status} · {model.delegate ?? "—"} · {model.fps} fps
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={btn} onClick={() => setOverlay((v) => !v)}>
            {overlay ? "Hide overlay" : "Show overlay"}
          </button>
          <button type="button" className={btn} onClick={() => setShowIds((v) => !v)}>
            {showIds ? "Hide IDs" : "Show IDs"}
          </button>
          <button type="button" className={btn} onClick={captureNow} disabled={camera.status !== "ready"}>
            Capture now
          </button>
          <button type="button" className={btn} onClick={copyLandmarks}>
            Copy landmarks JSON
          </button>
        </div>
        <ResultCard title="Smoothed (what CaptureScreen would emit)" c={live.smoothed} />
        {last ? (
          <div className="mt-4 rounded-xl border border-white/10 p-3">
            <div className="mb-2 text-xs font-bold tracking-wide text-white/60 uppercase">Last capture</div>
            <div className="flex gap-3">
              <img src={last.url} alt="capture" className="h-40 w-30 rounded-lg object-cover" />
              <pre className="min-w-0 flex-1 overflow-x-auto font-mono text-[11px] text-lime-200">
                {JSON.stringify({ ...last.output.pose, photoBytes: last.output.photo.size }, null, 2)}
              </pre>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <ThresholdPanel />
        <FixturePanel />
      </div>
    </div>
  );
}

function ResultCard({ title, c }: { title: string; c: Classification | null }) {
  return (
    <div className="mt-4 rounded-xl border border-white/10 p-3">
      <div className="mb-1 text-xs font-bold tracking-wide text-white/60 uppercase">{title}</div>
      {c ? (
        <>
          <div className="text-3xl font-black italic tracking-tighter text-yellow-300 uppercase">{c.move}</div>
          <div className="font-mono text-sm">
            confidence {c.confidence.toFixed(2)} · power {c.power}
            {c.fallback ? <span className="ml-2 text-orange-300">FALLBACK</span> : null}
          </div>
          <div className="mt-2 grid gap-1">
            {(Object.entries(c.scores) as [string, number][]).map(([move, s]) => (
              <div key={move} className="flex items-center gap-2 font-mono text-[11px]">
                <span className="w-24">{move}</span>
                <div className="h-2 flex-1 overflow-hidden rounded bg-white/10">
                  <div className={`h-full ${s >= 0.5 ? "bg-yellow-300" : "bg-cyan-400"}`} style={{ width: `${s * 100}%` }} />
                </div>
                <span className="w-8 text-right">{s.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="mt-1 font-mono text-[11px] text-white/60">
            ext {c.metrics?.extension ?? "—"} · bal {c.metrics?.balance ?? "—"} · spd {c.metrics?.speed ?? "—"}
          </div>
        </>
      ) : (
        <div className="text-sm text-white/50">waiting for frames…</div>
      )}
    </div>
  );
}

function ThresholdPanel() {
  const t = useThresholds();
  const keys = Object.keys(DEFAULT_THRESHOLDS) as ThresholdKey[];
  return (
    <div className="rounded-xl border border-white/10 p-3">
      <div className="mb-2 flex items-center">
        <div className="text-xs font-bold tracking-wide text-white/60 uppercase">Thresholds (runtime, applies live)</div>
        <button type="button" className={`${btn} ml-auto h-8 px-3 text-xs`} onClick={resetThresholds}>
          Reset
        </button>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 md:grid-cols-3">
        {keys.map((k) => {
          const v = t[k];
          const changed = v !== DEFAULT_THRESHOLDS[k];
          return (
            <label key={k} className="flex items-center gap-2 font-mono text-[11px]">
              <span className={`min-w-0 flex-1 truncate ${changed ? "text-yellow-300" : "text-white/70"}`}>{k}</span>
              <input
                type="number"
                step={Math.abs(DEFAULT_THRESHOLDS[k]) < 5 ? 0.05 : 1}
                value={v}
                onChange={(e) => {
                  const n = Number.parseFloat(e.target.value);
                  if (!Number.isNaN(n)) setThresholds({ [k]: n });
                }}
                className="h-7 w-20 rounded border border-white/20 bg-black px-1 text-right"
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}

function FixturePanel() {
  const t = useThresholds();
  const checks = useMemo(() => runFixtureChecks(), [t]);
  const passed = checks.filter((c) => c.pass).length;
  return (
    <div className="rounded-xl border border-white/10 p-3">
      <div className="mb-2 text-xs font-bold tracking-wide text-white/60 uppercase">
        Fixture self-test · {passed}/{checks.length} pass
      </div>
      <table className="w-full font-mono text-[11px]">
        <tbody>
          {checks.map((c) => (
            <tr key={c.name} className="border-t border-white/5">
              <td className={`py-1 ${c.pass ? "text-lime-300" : "text-red-300"}`}>{c.pass ? "PASS" : "FAIL"}</td>
              <td>{c.name}</td>
              <td className="text-white/60">→</td>
              <td>{c.result.move}</td>
              <td className="text-right text-white/60">
                {c.result.confidence.toFixed(2)} / {c.result.power}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CaptureTab() {
  const [mountKey, setMountKey] = useState(0);
  const [mounted, setMounted] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [debug, setDebug] = useState(true);
  const [last, setLast] = useState<{ output: CaptureOutput; url: string; at: number } | null>(null);
  const [events, setEvents] = useState<string[]>([]);

  const log = (m: string) => setEvents((e) => [`${new Date().toLocaleTimeString()} ${m}`, ...e].slice(0, 8));

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,420px)_1fr]">
      <div>
        <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-neutral-900">
          {mounted ? (
            <CaptureScreen
              key={mountKey}
              countdownSeconds={countdown}
              debug={debug}
              onReady={() => log("onReady")}
              onError={(m) => log(`onError: ${m}`)}
              onCapture={(output) => {
                log(`onCapture ${output.pose.move} power ${output.pose.power} · ${Math.round(output.photo.size / 1024)} KB`);
                setLast((prev) => {
                  if (prev) URL.revokeObjectURL(prev.url);
                  return { output, url: URL.createObjectURL(output.photo), at: Date.now() };
                });
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-white/50">unmounted — camera should be off</div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className={btn}
            onClick={() => {
              setMounted(true);
              setMountKey((k) => k + 1);
            }}
          >
            Mount again
          </button>
          <button type="button" className={btn} onClick={() => setMounted((m) => !m)}>
            {mounted ? "Unmount" : "Mount"}
          </button>
          <button type="button" className={btn} onClick={() => setDebug((d) => !d)}>
            debug {debug ? "on" : "off"}
          </button>
          <label className="flex items-center gap-2 font-mono text-xs">
            countdown
            <input
              type="number"
              min={1}
              max={10}
              value={countdown}
              onChange={(e) => setCountdown(Math.max(1, Number.parseInt(e.target.value) || 3))}
              className="h-9 w-14 rounded border border-white/20 bg-black px-1 text-right"
            />
          </label>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <div className="rounded-xl border border-white/10 p-3">
          <div className="mb-2 text-xs font-bold tracking-wide text-white/60 uppercase">Last CaptureOutput</div>
          {last ? (
            <div className="flex gap-3">
              <img src={last.url} alt="capture" className="h-56 w-42 rounded-lg object-cover" />
              <pre className="min-w-0 flex-1 overflow-x-auto font-mono text-[11px] text-lime-200">
                {JSON.stringify(
                  { pose: last.output.pose, photo: { type: last.output.photo.type, bytes: last.output.photo.size } },
                  null,
                  2,
                )}
              </pre>
            </div>
          ) : (
            <div className="text-sm text-white/50">no capture yet</div>
          )}
        </div>
        <div className="rounded-xl border border-white/10 p-3">
          <div className="mb-2 text-xs font-bold tracking-wide text-white/60 uppercase">Events</div>
          <pre className="font-mono text-[11px] text-white/80">{events.join("\n") || "—"}</pre>
        </div>
      </div>
    </div>
  );
}
