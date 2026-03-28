import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import mapData from '../assets/map_topology.json';
import { TopologicalMapProps } from '../TopologicalMap';

/* ── helpers (light-mode-optimised palette) ─────────────────── */
function pressureColor(pressure: number | undefined, status?: string) {
  if (status === 'SURGE_EPICENTER') return '#b91c1c';
  if (status === 'SURGE_CONE') return '#d97706';
  if (status === 'AI_BOOSTING') return '#0d9488';
  if (status === 'AI_REROUTING') return '#6366f1';
  if (status === 'AI_PRIORITIZED') return '#0d9488';
  if (status === 'AI_BALANCED') return '#059669';
  if (status === 'AI_STABILIZED') return '#047857';
  if (status === 'ALTERNATE_SUPPLY') return '#6366f1';
  if (status === 'ELEVATION_VULNERABLE') return '#d97706';
  if (status === 'CRITICAL_VULNERABLE') return '#b91c1c';
  if (status === 'SUPPLY_REDUCED') return '#d97706';
  if (status === 'ISOLATED') return '#9ca3af';
  if (pressure === null || pressure === undefined) return '#0d9488';
  if (pressure >= 18) return '#059669';
  if (pressure >= 12) return '#d97706';
  if (pressure >= 6) return '#dc2626';
  return '#991b1b';
}

/* ── lookup maps (built once) ──────────────────────────────── */
const nodeMap = new Map<string, any>();
mapData.nodes.forEach((n: any) => nodeMap.set(n.id, n));

const nodeLinks = new Map<string, any[]>();
mapData.links.forEach((link: any) => {
  if (!nodeLinks.has(link.from)) nodeLinks.set(link.from, []);
  if (!nodeLinks.has(link.to)) nodeLinks.set(link.to, []);
  nodeLinks.get(link.from)!.push(link);
  nodeLinks.get(link.to)!.push(link);
});

/* ── BFS sector expansion ──────────────────────────────────── */
function expandSector(seedIds: string[], depth = 2): Set<string> {
  const visited = new Set(seedIds);
  let frontier = [...seedIds];
  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const nid of frontier) {
      for (const link of (nodeLinks.get(nid) || [])) {
        const neighbor = link.from === nid ? link.to : link.from;
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          next.push(neighbor);
        }
      }
    }
    frontier = next;
  }
  return visited;
}

/* ── centre of the projected network ───────────────────────── */
const lats = mapData.nodes.map((n: any) => n.lat).filter(Boolean) as number[];
const lngs = mapData.nodes.map((n: any) => n.lng).filter(Boolean) as number[];
const centerLat = lats.length ? (Math.min(...lats) + Math.max(...lats)) / 2 : 30.735;
const centerLng = lngs.length ? (Math.min(...lngs) + Math.max(...lngs)) / 2 : 76.785;

/* ── light-mode tiles ──────────────────────────────────────── */
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://carto.com/">CARTO</a>';

/* ── Fit-bounds helper ─────────────────────────────────────── */
function FitBounds() {
  const map = useMap();
  React.useEffect(() => {
    if (lats.length > 0) {
      map.fitBounds([
        [Math.min(...lats) - 0.003, Math.min(...lngs) - 0.003],
        [Math.max(...lats) + 0.003, Math.max(...lngs) + 0.003],
      ]);
    }
  }, [map]);
  return null;
}

/* ═══════════════════════════════════════════════════════════════
   Imperative Canvas Layer — renders ALL pipes + nodes in ONE
   Leaflet layer using L.canvas(), avoiding 1700 React components.
   ═══════════════════════════════════════════════════════════════ */
interface CanvasLayerProps {
  scenario: string;
  activeTarget: string | null;
  selectedTargets: Set<string>;
  anomalyNode?: string;
  nodeStates: Record<string, any>;
  linkStates: Record<string, any>;
  closedLinks: string[];
  onSelectTarget: (id: string | null) => void;
  onMultiSelect: (ids: Set<string>) => void;
}

function CanvasNetworkLayer({
  scenario, activeTarget, selectedTargets, anomalyNode,
  nodeStates, linkStates, closedLinks, onSelectTarget, onMultiSelect,
}: CanvasLayerProps) {
  const map = useMap();
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const rendererRef = useRef<L.Canvas | null>(null);
  const closedSet = useMemo(() => new Set(closedLinks), [closedLinks]);

  // Stable callbacks
  const handleClick = useCallback((id: string, e: L.LeafletMouseEvent) => {
    if (e.originalEvent.shiftKey) {
      const sector = expandSector([id], 2);
      onMultiSelect(sector);
    } else if (e.originalEvent.ctrlKey || e.originalEvent.metaKey) {
      const next = new Set(selectedTargets);
      if (next.has(id)) next.delete(id); else next.add(id);
      onMultiSelect(next);
    } else {
      onSelectTarget(id);
    }
  }, [selectedTargets, onSelectTarget, onMultiSelect]);

  useEffect(() => {
    // Create a single canvas renderer (shared by all shapes)
    if (!rendererRef.current) {
      rendererRef.current = L.canvas({ padding: 0.3 });
    }
    const renderer = rendererRef.current;

    // Clean up previous layer group
    if (layerGroupRef.current) {
      layerGroupRef.current.clearLayers();
      map.removeLayer(layerGroupRef.current);
    }

    const group = L.layerGroup();
    layerGroupRef.current = group;

    const zoom = map.getZoom();
    const nodeRadius = zoom >= 16 ? 5 : zoom >= 14 ? 3.5 : 2;
    const pipeWeight = zoom >= 16 ? 3 : zoom >= 14 ? 2 : 1.2;

    // ── Draw pipes ───────────────────────────────────────
    for (const link of mapData.links) {
      const from = nodeMap.get(link.from);
      const to = nodeMap.get(link.to);
      if (!from || !to || !from.lat || !to.lat) continue;

      const isClosed = closedSet.has(link.id);
      const isAnomaly = anomalyNode === link.id;
      const isSelected = activeTarget === link.id || selectedTargets.has(link.id);
      const flowLps = linkStates[link.id]?.flow_lps;
      const isIsolated = isClosed || flowLps === 0;

      let color = '#1e3a5f';
      if (isAnomaly && scenario === 'RUPTURE') color = '#b91c1c';
      else if (isAnomaly && scenario === 'SURGE') color = '#b45309';
      else if (isIsolated) color = '#d1d5db';
      else if (isSelected) color = '#7c3aed';
      else if (scenario === 'AI_RECOVERY') color = '#0d9488';

      const w = isSelected ? pipeWeight + 2 : isClosed ? pipeWeight * 0.6 : pipeWeight;

      const line = L.polyline(
        [[from.lat, from.lng], [to.lat, to.lng]],
        {
          color, weight: w, opacity: 0.8,
          dashArray: isClosed ? '6 8' : undefined,
          renderer,
        }
      );
      const linkId = link.id;
      const linkType = link.link_type;
      const linkLen = link.length;
      line.on('click', (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        handleClick(linkId, e);
      });
      line.bindTooltip(() => {
        const live = linkStates[linkId] || {};
        return `<div class="hm-tip-header">${linkId} <span class="hm-tip-badge">${linkType}</span></div>
          <div class="hm-tip-grid">
            <span class="hm-tip-label">Flow</span><span class="hm-tip-val">${live.flow_lps?.toFixed(2) ?? '—'} L/s</span>
            <span class="hm-tip-label">Velocity</span><span class="hm-tip-val">${live.velocity_ms?.toFixed(2) ?? '—'} m/s</span>
            <span class="hm-tip-label">Length</span><span class="hm-tip-val">${linkLen} m</span>
          </div>`;
      }, { sticky: true, direction: 'top', offset: [0, -8], className: 'hm-leaflet-tooltip' });
      group.addLayer(line);
    }

    // ── Draw nodes ───────────────────────────────────────
    for (const node of mapData.nodes) {
      if (!node.lat || !node.lng) continue;

      const isSelected = activeTarget === node.id || selectedTargets.has(node.id);
      const isAnomaly = anomalyNode === node.id;
      const live = nodeStates[node.id] || {};
      const p = live.pressure_m;
      const status = live.status;

      let fillColor = node.is_source ? '#1d4ed8'
        : node.is_leaf ? '#b45309'
        : pressureColor(p, status);
      if (isAnomaly && scenario === 'SURGE') fillColor = '#b45309';

      const r = node.is_source ? nodeRadius + 4 : isAnomaly ? nodeRadius + 3 : node.is_leaf ? nodeRadius + 1 : nodeRadius;

      const marker = L.circleMarker([node.lat, node.lng], {
        radius: r,
        fillColor,
        fillOpacity: 0.95,
        color: isSelected ? '#7c3aed' : isAnomaly ? '#1f2937' : '#374151',
        weight: isSelected ? 3 : isAnomaly ? 2 : 0.8,
        renderer,
      });

      const nodeId = node.id;
      const nodeType = node.type;
      const nodeElev = node.elevation;
      const nodeZone = node.zone_id || '—';
      const isSrc = node.is_source;
      const isLeaf = node.is_leaf;
      marker.on('click', (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        handleClick(nodeId, e);
      });
      marker.bindTooltip(() => {
        const live = nodeStates[nodeId] || {};
        const pv = live.pressure_m;
        const badgeBg = isSrc ? '#1d4ed8' : isLeaf ? '#b45309' : '#0d9488';
        return `<div class="hm-tip-header">${nodeId} <span class="hm-tip-badge" style="background:${badgeBg}20;color:${badgeBg}">${nodeType}</span></div>
          <div class="hm-tip-grid">
            <span class="hm-tip-label">Pressure</span><span class="hm-tip-val">${pv !== undefined ? pv.toFixed(1) + ' m' : '—'}</span>
            <span class="hm-tip-label">Elevation</span><span class="hm-tip-val">${nodeElev} m</span>
            <span class="hm-tip-label">Zone</span><span class="hm-tip-val">${nodeZone}</span>
          </div>`;
      }, { direction: 'top', offset: [0, -6], className: 'hm-leaflet-tooltip' });
      group.addLayer(marker);
    }

    group.addTo(map);

    return () => {
      if (layerGroupRef.current) {
        layerGroupRef.current.clearLayers();
        map.removeLayer(layerGroupRef.current);
      }
    };
  }, [map, scenario, activeTarget, selectedTargets, anomalyNode,
      nodeStates, linkStates, closedSet, handleClick]);

  // Re-draw on zoom changes
  useMapEvents({
    zoomend: () => {
      // Force re-render by triggering state update in parent
      // The useEffect above depends on map.getZoom() implicitly
    },
  });

  return null;
}

/* ═══════════════════════════════════════════════════════════════
   CityMap — Leaflet view with imperative Canvas network layer
   ═══════════════════════════════════════════════════════════════ */
const CityMap: React.FC<TopologicalMapProps> = ({
  scenario,
  activeTarget,
  selectedTargets = new Set(),
  onSelectTarget,
  onMultiSelect,
  anomalyNode,
  nodeStates = {},
  linkStates = {},
  closedLinks = [],
}) => {

  return (
    <div className="city-map-container w-full h-full relative" style={{ minHeight: 400 }}>
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={14}
        preferCanvas={true}
        style={{ width: '100%', height: '100%', borderRadius: 16, background: '#f5f3f0' }}
        zoomControl={false}
        attributionControl={false}
      >
        <FitBounds />
        <TileLayer url={TILE_URL} attribution={TILE_ATTR} />
        <CanvasNetworkLayer
          scenario={scenario}
          activeTarget={activeTarget}
          selectedTargets={selectedTargets}
          anomalyNode={anomalyNode}
          nodeStates={nodeStates}
          linkStates={linkStates}
          closedLinks={closedLinks}
          onSelectTarget={onSelectTarget}
          onMultiSelect={onMultiSelect}
        />
      </MapContainer>

      {/* ── Map Legend ── */}
      <div className="absolute bottom-4 left-4 z-[1000] rounded-xl p-3 pointer-events-none"
           style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#475569' }}>
          <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#1d4ed8', marginRight: 4 }}/>Source</span>
          <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#b45309', marginRight: 4 }}/>Leaf</span>
          <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#059669', marginRight: 4 }}/>Healthy</span>
          <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#dc2626', marginRight: 4 }}/>Critical</span>
        </div>
      </div>

      {/* City label */}
      <div className="absolute top-3 right-3 z-[1000] px-3 py-1.5 rounded-full text-[10px] font-semibold tracking-wider"
        style={{ background: 'rgba(255,255,255,0.9)', color: '#0d9488', border: '1px solid rgba(13,148,136,0.2)', backdropFilter: 'blur(6px)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        📍 CHANDIGARH GRID
      </div>

      {/* Selection count */}
      {selectedTargets.size > 1 && (
        <div className="absolute bottom-4 right-4 z-[1000] rounded-xl px-3 py-2 text-[10px]"
             style={{ background: 'rgba(255,255,255,0.9)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.2)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <b>{selectedTargets.size}</b> selected · Ctrl+Click to add
        </div>
      )}
    </div>
  );
};

export default CityMap;
