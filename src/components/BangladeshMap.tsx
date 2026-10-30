"use client";

import { useRef, useState, useCallback, useEffect, type PointerEvent, type MouseEvent } from "react";
import { projectX, projectY, MAP_WIDTH, MAP_HEIGHT } from "@/lib/projection";
import { CLUSTER_COLOR_VAR } from "@/lib/stations";
import { formatTime, toStatus, useStationStatus } from "@/lib/liveData";
import { BASEMAP_INNER_SVG } from "@/lib/basemapMarkup";
import type { Station } from "@/lib/types";
import StatusPill from "./StatusPill";

const MIN_SCALE = 1;
const MAX_SCALE = 6;
// Rough on-screen height of the popup card, used to decide whether it has
// room to open upward from the marker or should flip below it instead.
const POPUP_HEIGHT_ESTIMATE = 340;

interface ViewState {
  cx: number;
  cy: number;
  scale: number;
}

const DEFAULT_VIEW: ViewState = { cx: MAP_WIDTH / 2, cy: MAP_HEIGHT / 2, scale: 1 };

export default function BangladeshMap({
  stations,
  selectedStationId,
  onSelectStation,
}: {
  stations: Station[];
  selectedStationId: string | null;
  onSelectStation: (id: string | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<ViewState>(DEFAULT_VIEW);
  const dragState = useRef<{ startX: number; startY: number; startCx: number; startCy: number } | null>(null);
  const hasZoomedRef = useRef(false);
  // The popup follows the hovered marker; clicking a marker selects it for the side panel.
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const clampCenter = useCallback((cx: number, cy: number, scale: number) => {
    const vw = MAP_WIDTH / scale;
    const vh = MAP_HEIGHT / scale;
    const minCx = vw / 2;
    const maxCx = MAP_WIDTH - vw / 2;
    const minCy = vh / 2;
    const maxCy = MAP_HEIGHT - vh / 2;
    return {
      cx: minCx > maxCx ? MAP_WIDTH / 2 : Math.min(Math.max(cx, minCx), maxCx),
      cy: minCy > maxCy ? MAP_HEIGHT / 2 : Math.min(Math.max(cy, minCy), maxCy),
    };
  }, []);

  const vw = MAP_WIDTH / view.scale;
  const vh = MAP_HEIGHT / view.scale;
  const viewBox = `${view.cx - vw / 2} ${view.cy - vh / 2} ${vw} ${vh}`;

  function screenToSvg(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return { x: view.cx, y: view.cy };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: view.cx, y: view.cy };
    const svgPt = pt.matrixTransform(ctm.inverse());
    return { x: svgPt.x, y: svgPt.y };
  }

  function svgToContainer(x: number, y: number) {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = x;
    pt.y = y;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const screenPt = pt.matrixTransform(ctm);
    const rect = container.getBoundingClientRect();
    return { x: screenPt.x - rect.left, y: screenPt.y - rect.top };
  }

  function zoomBy(factor: number, focus?: { x: number; y: number }) {
    setView((prev) => {
      const nextScale = Math.min(Math.max(prev.scale * factor, MIN_SCALE), MAX_SCALE);
      let cx = prev.cx;
      let cy = prev.cy;
      if (focus) {
        cx = focus.x;
        cy = focus.y;
      } else if (!hasZoomedRef.current && selectedStationId) {
        const st = stations.find((s) => s.station_id === selectedStationId);
        if (st) {
          cx = projectX(st.longitude);
          cy = projectY(st.latitude);
        }
      }
      hasZoomedRef.current = true;
      const clamped = clampCenter(cx, cy, nextScale);
      return { ...clamped, scale: nextScale };
    });
  }

  function resetView() {
    hasZoomedRef.current = false;
    setView(DEFAULT_VIEW);
  }

  function handleDoubleClick(e: MouseEvent<SVGSVGElement>) {
    const pt = screenToSvg(e.clientX, e.clientY);
    zoomBy(1.6, pt);
  }

  function handlePointerDown(e: PointerEvent<SVGSVGElement>) {
    if (view.scale <= 1) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, startCx: view.cx, startCy: view.cy };
  }

  function handlePointerMove(e: PointerEvent<SVGSVGElement>) {
    if (!dragState.current || !svgRef.current) return;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return;
    const dxScreen = e.clientX - dragState.current.startX;
    const dyScreen = e.clientY - dragState.current.startY;
    const dxSvg = dxScreen / ctm.a;
    const dySvg = dyScreen / ctm.d;
    const next = clampCenter(dragState.current.startCx - dxSvg, dragState.current.startCy - dySvg, view.scale);
    setView((prev) => ({ ...prev, ...next }));
  }

  function handlePointerUp() {
    dragState.current = null;
  }

  const hoveredStation = stations.find((s) => s.station_id === hoveredId) ?? null;
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null);

  // Popup position is a DOM measurement (SVG screen CTM), not derivable during
  // render — it must be read after layout, and re-read whenever the hovered
  // station or the pan/zoom transform changes.
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!hoveredStation) {
      setPopupPos(null);
      return;
    }
    setPopupPos(svgToContainer(projectX(hoveredStation.longitude), projectY(hoveredStation.latitude)));
  }, [hoveredId, view.cx, view.cy, view.scale]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-[var(--radius-card)] border border-border bg-card"
    >
      <svg
        ref={svgRef}
        viewBox={viewBox}
        className={`h-full w-full touch-none ${view.scale > 1 ? "cursor-grab active:cursor-grabbing" : ""}`}
        onDoubleClick={handleDoubleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <g dangerouslySetInnerHTML={{ __html: BASEMAP_INNER_SVG }} />
        <rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} fill="none" stroke="var(--border)" strokeWidth={2} />

        {stations.map((s) => {
          const x = projectX(s.longitude);
          const y = projectY(s.latitude);
          const color = CLUSTER_COLOR_VAR[s.cluster];
          const isSelected = s.station_id === selectedStationId;
          return (
            <g
              key={s.station_id}
              onClick={() => onSelectStation(s.station_id)}
              onPointerEnter={() => setHoveredId(s.station_id)}
              onPointerLeave={() => setHoveredId((id) => (id === s.station_id ? null : id))}
              className="cursor-pointer"
            >
              {isSelected && (
                <circle cx={x} cy={y} r={10} fill="none" stroke={color} strokeWidth={1.5} opacity={0.5} />
              )}
              <circle cx={x} cy={y} r={isSelected ? 7 : 5} fill={color} stroke="#fff" strokeWidth={1.5} />
              <text
                x={x + 8}
                y={y + 3}
                fontSize={10}
                fontWeight={isSelected ? 700 : 500}
                fill="var(--text-primary)"
                style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3 }}
              >
                {s.station_name}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="absolute bottom-4 right-4 flex flex-col items-center gap-1 rounded-[var(--radius-card)] border border-border bg-card p-1 shadow-sm">
        <button
          type="button"
          onClick={() => zoomBy(1.4)}
          aria-label="Zoom in"
          className="flex h-10 w-10 items-center justify-center rounded-md text-xl text-text-secondary hover:bg-background"
        >
          +
        </button>
        <div className="font-mono text-[10px] text-text-tertiary">{Math.round(view.scale * 100)}%</div>
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.4)}
          aria-label="Zoom out"
          className="flex h-10 w-10 items-center justify-center rounded-md text-xl text-text-secondary hover:bg-background"
        >
          –
        </button>
      </div>
      <button
        type="button"
        onClick={resetView}
        className="absolute bottom-4 left-4 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-text-secondary shadow-sm hover:bg-background"
      >
        Reset view
      </button>

      {hoveredStation && popupPos && (
        <StationPopup
          station={hoveredStation}
          pos={popupPos}
          // Not enough room above the marker (e.g. stations near the top of
          // the map) — open the popup downward instead so it isn't clipped.
          openBelow={popupPos.y < POPUP_HEIGHT_ESTIMATE}
        />
      )}
    </div>
  );
}

function StationPopup({
  station,
  pos,
  openBelow,
}: {
  station: Station;
  pos: { x: number; y: number };
  openBelow: boolean;
}) {
  const statusMap = useStationStatus();
  const live = statusMap.state === "ready" ? statusMap.data.get(station.station_id) : undefined;
  const current = live?.current_wl ?? null;
  const dangerLevel = live?.danger_level ?? station.danger_level_m;

  return (
    <div
      // pointer-events-none: the card must not cover the marker and end its own hover
      className="pointer-events-none absolute z-10 w-72 rounded-[var(--radius-card)] border border-border bg-card p-4 shadow-lg"
      style={
        openBelow
          ? { left: pos.x, top: pos.y + 16, transform: "translate(-50%, 0)" }
          : { left: pos.x, top: Math.max(pos.y - 16, 16), transform: "translate(-50%, -100%)" }
      }
    >
      <div>
        <div className="text-sm font-semibold text-text-primary">{station.station_name}</div>
        <div className="font-mono text-xs text-text-tertiary">{station.station_id}</div>
      </div>
      <div className="mt-1 text-xs text-text-secondary">
        {station.cluster} · {station.river_name}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <div className="text-[11px] text-text-secondary">Current WL</div>
          <div className="font-mono text-lg font-semibold">
            {statusMap.state === "loading" ? "…" : current != null ? `${current.toFixed(2)} m` : "–"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-text-secondary">Danger level</div>
          <div className="font-mono text-sm text-text-tertiary">{dangerLevel.toFixed(2)} m</div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        {statusMap.state === "ready" && <StatusPill status={toStatus(live)} />}
        {live?.last_obs_time && (
          <span className="text-[11px] text-text-tertiary">{formatTime(live.last_obs_time)}</span>
        )}
      </div>
      {statusMap.state === "error" && (
        <div className="mt-2 text-[11px]" style={{ color: "var(--status-danger-fg)" }}>
          Couldn&apos;t load live data: {statusMap.message}
        </div>
      )}
    </div>
  );
}
