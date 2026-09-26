"use client";

import { useRef, useState, useCallback, useEffect, type PointerEvent, type MouseEvent } from "react";
import { projectX, projectY, MAP_WIDTH, MAP_HEIGHT } from "@/lib/projection";
import { CLUSTER_COLOR_VAR } from "@/lib/stations";
import { getCurrentWL, getStatus } from "@/lib/sampleData";
import { BASEMAP_INNER_SVG } from "@/lib/basemapMarkup";
import type { Station } from "@/lib/types";
import StatusPill from "./StatusPill";
import SampleDataBadge from "./SampleDataBadge";

const MIN_SCALE = 1;
const MAX_SCALE = 6;
const RIVER_ZOOM_THRESHOLD = 1.2;
// Rough on-screen height of the popup card, used to decide whether it has
// room to open upward from the marker or should flip below it instead.
const POPUP_HEIGHT_ESTIMATE = 340;

// Guide paths baked into public/bangladesh.svg for curved river labels,
// named rv_<River><index> — some rivers have multiple segments across the map.
const RIVER_LABELS: { id: string; name: string }[] = [
  { id: "rv_Tista0", name: "Tista" },
  { id: "rv_Brahmaputra1", name: "Brahmaputra" },
  { id: "rv_Brahmaputra2", name: "Brahmaputra" },
  { id: "rv_Ganges3", name: "Ganges" },
  { id: "rv_Ganges4", name: "Ganges" },
];

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
  // Dismissing the popup hides it without clearing the selection, so the
  // details panel stays put; picking a station (even the same one) reopens it.
  const [dismissedId, setDismissedId] = useState<string | null>(null);

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

  function selectStation(id: string) {
    // Re-clicking a marker should reopen the popup even if it was dismissed.
    setDismissedId(null);
    onSelectStation(id);
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

  const selectedStation = stations.find((s) => s.station_id === selectedStationId) ?? null;
  const popupOpen = !!selectedStation && selectedStationId !== dismissedId;
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null);

  // Popup position is a DOM measurement (SVG screen CTM), not derivable during
  // render — it must be read after layout, and re-read whenever the selection
  // or the pan/zoom transform changes.
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!selectedStation) {
      setPopupPos(null);
      return;
    }
    setPopupPos(svgToContainer(projectX(selectedStation.longitude), projectY(selectedStation.latitude)));
  }, [selectedStationId, view.cx, view.cy, view.scale]);
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

        <g
          style={{ opacity: view.scale > RIVER_ZOOM_THRESHOLD ? 1 : 0, transition: "opacity 300ms ease" }}
          pointerEvents="none"
        >
          {RIVER_LABELS.map(({ id, name }, i) => (
            <text
              key={id + i}
              fontSize={9}
              fontWeight={600}
              fill="#1F6FA0"
              style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 2.5 }}
            >
              <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
                {name}
              </textPath>
            </text>
          ))}
        </g>

        {stations.map((s) => {
          const x = projectX(s.longitude);
          const y = projectY(s.latitude);
          const color = CLUSTER_COLOR_VAR[s.cluster];
          const isSelected = s.station_id === selectedStationId;
          return (
            <g key={s.station_id} onClick={() => selectStation(s.station_id)} className="cursor-pointer">
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

      {popupOpen && selectedStation && popupPos && (
        <StationPopup
          station={selectedStation}
          pos={popupPos}
          // Not enough room above the marker (e.g. stations near the top of
          // the map) — open the popup downward instead so it isn't clipped.
          openBelow={popupPos.y < POPUP_HEIGHT_ESTIMATE}
          onClose={() => setDismissedId(selectedStationId)}
        />
      )}
    </div>
  );
}

function StationPopup({
  station,
  pos,
  openBelow,
  onClose,
}: {
  station: Station;
  pos: { x: number; y: number };
  openBelow: boolean;
  onClose: () => void;
}) {
  const current = getCurrentWL(station);
  const status = getStatus(current, station.danger_level_m);

  return (
    <div
      className="absolute z-10 w-72 rounded-[var(--radius-card)] border border-border bg-card p-4 shadow-lg"
      style={
        openBelow
          ? { left: pos.x, top: pos.y + 16, transform: "translate(-50%, 0)" }
          : { left: pos.x, top: Math.max(pos.y - 16, 16), transform: "translate(-50%, -100%)" }
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-text-primary">{station.station_name}</div>
          <div className="font-mono text-xs text-text-tertiary">{station.station_id}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-base text-text-tertiary hover:text-text-primary"
        >
          ✕
        </button>
      </div>
      <div className="mt-1 text-xs text-text-secondary">
        {station.cluster} · {station.river_name}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <div className="text-[11px] text-text-secondary">Current WL</div>
          <div className="font-mono text-lg font-semibold">{current.toFixed(2)} m</div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-text-secondary">Danger level</div>
          <div className="font-mono text-sm text-text-tertiary">{station.danger_level_m.toFixed(2)} m</div>
        </div>
      </div>
      <div className="mt-2">
        <StatusPill status={status} />
      </div>

      <div className="mt-3 flex justify-end">
        <SampleDataBadge />
      </div>
    </div>
  );
}
