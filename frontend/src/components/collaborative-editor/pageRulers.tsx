import React, { useEffect, useMemo, useState } from "react";
import type { DEFAULT_MARGINS } from "./editorTypes";

type PageMargins = typeof DEFAULT_MARGINS;

type RulerMetrics = {
  ready: boolean;
  horizontalLeft: number;
  horizontalWidth: number;
  verticalTop: number;
  verticalHeight: number;
};

type RulerMetricRefs = {
  pageRef: React.RefObject<HTMLElement | null>;
  canvasRef: React.RefObject<HTMLElement | null>;
  workareaRef: React.RefObject<HTMLElement | null>;
  horizontalRulerRef: React.RefObject<HTMLDivElement | null>;
};

const EMPTY_METRICS: RulerMetrics = {
  ready: false,
  horizontalLeft: 0,
  horizontalWidth: 0,
  verticalTop: 0,
  verticalHeight: 0,
};

export function usePageRulerMetrics(
  refs: RulerMetricRefs,
  dependencies: React.DependencyList
) {
  const [metrics, setMetrics] = useState<RulerMetrics>(EMPTY_METRICS);

  useEffect(() => {
    const page = refs.pageRef.current;
    const canvas = refs.canvasRef.current;
    const workarea = refs.workareaRef.current;
    const horizontalRuler = refs.horizontalRulerRef.current;
    if (!page || !canvas || !workarea || !horizontalRuler) {
      setMetrics(EMPTY_METRICS);
      return;
    }

    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const pageRect = page.getBoundingClientRect();
        const horizontalRect = horizontalRuler.getBoundingClientRect();
        const workareaRect = workarea.getBoundingClientRect();
        setMetrics({
          ready: true,
          horizontalLeft: pageRect.left - horizontalRect.left,
          horizontalWidth: pageRect.width,
          verticalTop: pageRect.top - workareaRect.top,
          verticalHeight: pageRect.height,
        });
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(page);
    observer.observe(canvas);
    observer.observe(workarea);
    window.addEventListener("resize", measure);
    canvas.addEventListener("scroll", measure, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", measure);
      canvas.removeEventListener("scroll", measure);
    };
  }, dependencies);

  return metrics;
}

export function HorizontalPageRuler({
  pageWidthIn,
  margins,
  metrics,
  rulerRef,
  onMarginsChange,
}: {
  pageWidthIn: number;
  margins: PageMargins;
  metrics: RulerMetrics;
  rulerRef: React.Ref<HTMLDivElement>;
  onMarginsChange: (margins: PageMargins) => void;
}) {
  const ticks = useRulerTicks(pageWidthIn);
  const leftMarginWidth = (margins.left / 72 / pageWidthIn) * metrics.horizontalWidth;
  const rightMarginWidth = (margins.right / 72 / pageWidthIn) * metrics.horizontalWidth;
  const startHorizontalMarginDrag = (side: "left" | "right") => (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!metrics.horizontalWidth) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startMargins = margins;
    const pointsPerPx = (pageWidthIn * 72) / metrics.horizontalWidth;
    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaPoints = (moveEvent.clientX - startX) * pointsPerPx;
      const next = side === "left"
        ? {
          ...startMargins,
          left: clampMargin(startMargins.left + deltaPoints, 18, (pageWidthIn * 72) - startMargins.right - 72),
        }
        : {
          ...startMargins,
          right: clampMargin(startMargins.right - deltaPoints, 18, (pageWidthIn * 72) - startMargins.left - 72),
        };
      onMarginsChange(roundMargin(next));
    };
    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  return (
    <div
      ref={rulerRef}
      className="ficct-word-ruler-row"
      style={{
        ["--ficct-ruler-left" as string]: `${metrics.horizontalLeft}px`,
        ["--ficct-ruler-width" as string]: `${metrics.horizontalWidth}px`,
      }}
    >
      <div className="ficct-word-ruler-corner" />
      <div className={metrics.ready ? "ficct-word-ruler ready" : "ficct-word-ruler"}>
        <div
          className="ficct-word-ruler-margin left"
          style={{ width: `${(margins.left / 72 / pageWidthIn) * 100}%` }}
        />
        <div
          className="ficct-word-ruler-margin right"
          style={{ width: `${(margins.right / 72 / pageWidthIn) * 100}%` }}
        />
        <button
          type="button"
          className="ficct-ruler-handle horizontal left"
          style={{ left: `${leftMarginWidth}px` }}
          onPointerDown={startHorizontalMarginDrag("left")}
          title={`Margen izquierdo: ${pointsToInchesLabel(margins.left)}`}
        />
        <button
          type="button"
          className="ficct-ruler-handle horizontal right"
          style={{ left: `${Math.max(0, metrics.horizontalWidth - rightMarginWidth)}px` }}
          onPointerDown={startHorizontalMarginDrag("right")}
          title={`Margen derecho: ${pointsToInchesLabel(margins.right)}`}
        />
        {ticks.map((tick) => (
          <span
            key={tick.key}
            className={`tick ${tick.kind}`}
            style={{ left: `${tick.percent}%` }}
          >
            {tick.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function VerticalPageRuler({
  pageHeightIn,
  margins,
  metrics,
  onMarginsChange,
}: {
  pageHeightIn: number;
  margins: PageMargins;
  metrics: RulerMetrics;
  onMarginsChange: (margins: PageMargins) => void;
}) {
  const ticks = useRulerTicks(pageHeightIn);
  const topMarginHeight = (margins.top / 72 / pageHeightIn) * metrics.verticalHeight;
  const bottomMarginHeight = (margins.bottom / 72 / pageHeightIn) * metrics.verticalHeight;
  const startVerticalMarginDrag = (side: "top" | "bottom") => (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!metrics.verticalHeight) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const startY = event.clientY;
    const startMargins = margins;
    const pointsPerPx = (pageHeightIn * 72) / metrics.verticalHeight;
    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaPoints = (moveEvent.clientY - startY) * pointsPerPx;
      const next = side === "top"
        ? {
          ...startMargins,
          top: clampMargin(startMargins.top + deltaPoints, 18, (pageHeightIn * 72) - startMargins.bottom - 72),
        }
        : {
          ...startMargins,
          bottom: clampMargin(startMargins.bottom - deltaPoints, 18, (pageHeightIn * 72) - startMargins.top - 72),
        };
      onMarginsChange(roundMargin(next));
    };
    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  return (
    <aside
      className={metrics.ready ? "ficct-word-vertical-ruler ready" : "ficct-word-vertical-ruler"}
      style={{
        ["--ficct-ruler-top" as string]: `${metrics.verticalTop}px`,
        ["--ficct-ruler-height" as string]: `${metrics.verticalHeight}px`,
      }}
    >
      <div
        className="ficct-word-ruler-margin top"
        style={{
          top: `${metrics.verticalTop}px`,
          height: `${(margins.top / 72 / pageHeightIn) * metrics.verticalHeight}px`,
        }}
      />
      <div
        className="ficct-word-ruler-margin bottom"
        style={{
          top: `${metrics.verticalTop + metrics.verticalHeight - ((margins.bottom / 72 / pageHeightIn) * metrics.verticalHeight)}px`,
          height: `${(margins.bottom / 72 / pageHeightIn) * metrics.verticalHeight}px`,
        }}
      />
      <button
        type="button"
        className="ficct-ruler-handle vertical top"
        style={{ top: `${metrics.verticalTop + topMarginHeight}px` }}
        onPointerDown={startVerticalMarginDrag("top")}
        title={`Margen superior: ${pointsToInchesLabel(margins.top)}`}
      />
      <button
        type="button"
        className="ficct-ruler-handle vertical bottom"
        style={{ top: `${metrics.verticalTop + Math.max(0, metrics.verticalHeight - bottomMarginHeight)}px` }}
        onPointerDown={startVerticalMarginDrag("bottom")}
        title={`Margen inferior: ${pointsToInchesLabel(margins.bottom)}`}
      />
      {ticks.map((tick) => (
        <span
          key={tick.key}
          className={`tick ${tick.kind}`}
          style={{ top: `${metrics.verticalTop + ((tick.percent / 100) * metrics.verticalHeight)}px` }}
        >
          {tick.label}
        </span>
      ))}
    </aside>
  );
}

function useRulerTicks(sizeIn: number) {
  return useMemo(() => {
    const total = Math.max(1, Math.round(sizeIn * 8));
    return Array.from({ length: total + 1 }, (_, index) => {
      const inch = index / 8;
      const isMajor = index % 8 === 0;
      const isHalf = index % 4 === 0;
      return {
        key: `${sizeIn}-${index}`,
        percent: (inch / sizeIn) * 100,
        kind: isMajor ? "major" : isHalf ? "half" : "minor",
        label: isMajor && index > 0 ? String(index / 8) : "",
      };
    });
  }, [sizeIn]);
}

function clampMargin(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundMargin(margins: PageMargins): PageMargins {
  return {
    top: Math.round(margins.top),
    right: Math.round(margins.right),
    bottom: Math.round(margins.bottom),
    left: Math.round(margins.left),
  };
}

function pointsToInchesLabel(points: number) {
  return `${(points / 72).toFixed(2)}"`;
}
