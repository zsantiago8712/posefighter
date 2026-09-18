import { useEffect, useRef } from "react";

import type { Classification } from "./classify";
import { type Connection, LM, type Landmark } from "./geometry";
import type { Delegate, PoseFrame } from "./usePoseLandmarker";

interface SkeletonProps {
  frame: PoseFrame | null;
  classification: Classification | null;
  connections: Connection[];
  showIds?: boolean;
}

/** Maps normalized landmarks onto a mirrored, object-fit: cover video sitting under the canvas. */
function makeProjector(canvasW: number, canvasH: number, videoW: number, videoH: number) {
  const scale = Math.max(canvasW / videoW, canvasH / videoH);
  const dw = videoW * scale;
  const dh = videoH * scale;
  const ox = (canvasW - dw) / 2;
  const oy = (canvasH - dh) / 2;
  return (lm: Landmark) => ({ x: canvasW - (ox + lm.x * dw), y: oy + lm.y * dh });
}

export function SkeletonCanvas({ frame, classification, connections, showIds = false }: SkeletonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
      canvas.width = W * dpr;
      canvas.height = H * dpr;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!frame?.landmarks || frame.width === 0) return;

    const lms = frame.landmarks;
    const P = makeProjector(W, H, frame.width, frame.height);
    const matched = classification && !classification.fallback && classification.confidence >= 0.5;
    const stroke = matched ? "#facc15" : "#22d3ee";

    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = stroke;
    ctx.shadowColor = stroke;
    ctx.shadowBlur = 8;
    for (const c of connections) {
      const a = lms[c.start];
      const b = lms[c.end];
      if (!a || !b) continue;
      if ((a.visibility ?? 1) < 0.3 || (b.visibility ?? 1) < 0.3) continue;
      const pa = P(a);
      const pb = P(b);
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    lms.forEach((lm, i) => {
      const v = lm.visibility ?? 1;
      const p = P(lm);
      ctx.fillStyle = v > 0.5 ? "#f0abfc" : "rgba(240,171,252,0.35)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      if (showIds) {
        ctx.fillStyle = "#fff";
        ctx.font = "10px ui-monospace, monospace";
        ctx.fillText(String(i), p.x + 5, p.y - 5);
      }
    });

    const f = classification?.features;
    if (f) {
      ctx.font = "bold 13px ui-monospace, monospace";
      ctx.fillStyle = "#fff";
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 4;
      const le = P(lms[LM.L_ELBOW]!);
      const re = P(lms[LM.R_ELBOW]!);
      ctx.fillText(`${f.leftElbowDeg.toFixed(0)}°`, le.x + 8, le.y + 4);
      ctx.fillText(`${f.rightElbowDeg.toFixed(0)}°`, re.x + 8, re.y + 4);
      const ls = P(lms[LM.L_SHOULDER]!);
      const rs = P(lms[LM.R_SHOULDER]!);
      ctx.fillText(`lean ${f.leanDeg.toFixed(0)}°`, (ls.x + rs.x) / 2 - 24, (ls.y + rs.y) / 2 - 10);
      ctx.shadowBlur = 0;
    }
  }, [frame, classification, connections, showIds]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />;
}

interface HudProps {
  classification: Classification | null;
  smoothed: Classification | null;
  fps: number;
  delegate: Delegate | null;
  speed: number;
}

const fmt = (v: number | null | undefined, d = 2) => (v === null || v === undefined ? "—" : v.toFixed(d));

export function DebugHud({ classification, smoothed, fps, delegate, speed }: HudProps) {
  const f = classification?.features;
  const s = classification?.scores;
  return (
    <div className="pointer-events-none absolute top-2 left-2 max-w-[70%] rounded bg-black/60 p-2 font-mono text-[11px] leading-tight text-white backdrop-blur-sm">
      <div className="text-yellow-300">
        {smoothed?.move ?? "—"} · conf {fmt(smoothed?.confidence)} · power {smoothed?.power ?? "—"}
      </div>
      <div>
        raw {classification?.move ?? "—"} {fmt(classification?.confidence)} · {fps} fps · {delegate ?? "…"}
      </div>
      {f ? (
        <>
          <div>
            vis {fmt(f.visibility)} · elbow L{f.leftElbowDeg.toFixed(0)} R{f.rightElbowDeg.toFixed(0)} · lean{" "}
            {f.leanDeg.toFixed(0)}° off {fmt(f.shoulderHipOffset)}
          </div>
          <div>
            reach L{fmt(f.leftReach)} R{fmt(f.rightReach)} · arm∠ L{f.leftArmAngleDeg.toFixed(0)} R
            {f.rightArmAngleDeg.toFixed(0)}
          </div>
          <div>
            wrist-nose L{fmt(f.leftWristAboveNose)} R{fmt(f.rightWristAboveNose)} · wrist-wrist{" "}
            {fmt(f.wristDistance)} · speed {fmt(speed)}
          </div>
          <div>
            ext {fmt(classification?.metrics?.extension)} bal {fmt(classification?.metrics?.balance)} · stance{" "}
            {f.ankleSpread === null ? "n/a" : fmt(f.ankleSpread)}
          </div>
        </>
      ) : (
        <div className="text-red-300">no landmarks</div>
      )}
      {s ? (
        <div className="text-cyan-200">
          SP {fmt(s.SPECIAL)} BL {fmt(s.BLOCK)} DO {fmt(s.DODGE)} HV {fmt(s.HEAVY_ATTACK)} PU {fmt(s.PUNCH)}
        </div>
      ) : null}
    </div>
  );
}

interface OverlayProps extends SkeletonProps, HudProps {}

export function DebugOverlay(props: OverlayProps) {
  return (
    <>
      <SkeletonCanvas
        frame={props.frame}
        classification={props.classification}
        connections={props.connections}
        showIds={props.showIds}
      />
      <DebugHud
        classification={props.classification}
        smoothed={props.smoothed}
        fps={props.fps}
        delegate={props.delegate}
        speed={props.speed}
      />
    </>
  );
}
