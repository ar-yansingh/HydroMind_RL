// @ts-nocheck
import React, { useMemo, useState, useCallback, useRef } from 'react';
import mapData from './assets/map_topology.json';

// ── Pressure → Color gradient ───────────────────────────────────────
function pressureColor(pressure) {
    if (pressure === null || pressure === undefined) return '#38bdf8';
    if (pressure >= 18) return '#10b981';
    if (pressure >= 12) return '#eab308';
    if (pressure >= 6) return '#f97316';
    return '#ef4444';
}

// ── SVG shape helpers ───────────────────────────────────────────────
function hexagonPoints(cx, cy, r) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
    }
    return pts.join(' ');
}

function diamondPoints(cx, cy, r) {
    return `${cx},${cy - r} ${cx + r * 0.7},${cy} ${cx},${cy + r} ${cx - r * 0.7},${cy}`;
}

// ── Lookup maps ─────────────────────────────────────────────────────
const nodeMap = {};
if (mapData && mapData.nodes) {
    mapData.nodes.forEach(n => { nodeMap[n.id] = n; });
}

// Build adjacency: which links connect to a given node (for sector expansion)
const nodeLinks = {};
if (mapData && mapData.links) {
    mapData.links.forEach(link => {
        if (!nodeLinks[link.from]) nodeLinks[link.from] = [];
        if (!nodeLinks[link.to]) nodeLinks[link.to] = [];
        nodeLinks[link.from].push(link);
        nodeLinks[link.to].push(link);
    });
}

// ── Sector expansion: BFS to find nearby connected nodes ────────────
function expandSector(seedIds, depth = 2) {
    const visited = new Set(seedIds);
    let frontier = [...seedIds];
    for (let d = 0; d < depth; d++) {
        const next = [];
        for (const nid of frontier) {
            for (const link of (nodeLinks[nid] || [])) {
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

import { NodeState, LinkState } from './store/telemetryStore';

export interface TopologicalMapProps {
    scenario: string;
    valvePct: number;
    leakRate: number;
    activeTarget: string | null;
    selectedTargets: Set<string>;
    onSelectTarget: (id: string | null) => void;
    onMultiSelect: (selection: Set<string>) => void;
    anomalyNode?: string | null;
    nodeStates: Record<string, NodeState>;
    linkStates: Record<string, LinkState>;
    closedLinks: string[];
}

const TopologicalMap = ({
    scenario,
    valvePct = 100,
    leakRate,
    activeTarget,
    selectedTargets = new Set(),
    onSelectTarget,
    onMultiSelect,
    anomalyNode,
    nodeStates = {},
    linkStates = {},
    closedLinks = [],
}: TopologicalMapProps) => {
    const [tooltip, setTooltip] = useState<any>(null);
    const [dragRect, setDragRect] = useState<any>(null);
    const svgRef = useRef(null);
    const isDragging = useRef(false);
    const didDrag = useRef(false);

    const closedLinksSet = useMemo(() => new Set(closedLinks), [closedLinks]);

    const reroutePath = useMemo(() => {
        if (!anomalyNode || closedLinksSet.size === 0) return new Set();
        
        const target = anomalyNode;
        const queue = [];
        const cameFrom = {}; // child: parent_link_id
        
        // Find sources
        for (const n of mapData.nodes) {
            if (n.is_source) {
                queue.push(n.id);
                cameFrom[n.id] = null;
            }
        }
        
        let found = false;
        let head = 0;
        while(head < queue.length) {
            const curr = queue[head++];
            if (curr === target) {
                found = true;
                break;
            }
            const links = nodeLinks[curr] || [];
            for (const link of links) {
                if (closedLinksSet.has(link.id)) continue;
                const nxt = link.from === curr ? link.to : link.from;
                if (cameFrom[nxt] === undefined) {
                    cameFrom[nxt] = link.id;
                    queue.push(nxt);
                }
            }
        }
        
        const pathLinks = new Set();
        if (found) {
            let curr = target;
            while (cameFrom[curr] !== null && cameFrom[curr] !== undefined) {
                const linkId = cameFrom[curr];
                pathLinks.add(linkId);
                const link = mapData.links.find(l => l.id === linkId);
                if (!link) break;
                curr = link.from === curr ? link.to : link.from;
            }
        }
        return pathLinks;
    }, [anomalyNode, closedLinksSet]);

    const viewBox = useMemo(() => {
        if (!mapData || !mapData.nodes) return '0 0 1000 1000';
        const xs = mapData.nodes.map(n => n.x);
        const ys = mapData.nodes.map(n => n.y);
        return `${Math.min(...xs) - 50} ${Math.min(...ys) - 50} ${Math.max(...xs) - Math.min(...xs) + 100} ${Math.max(...ys) - Math.min(...ys) + 100}`;
    }, []);

    // Parse viewBox for coordinate conversion
    const vbParts = useMemo(() => {
        const p = viewBox.split(' ').map(Number);
        return { x: p[0], y: p[1], w: p[2], h: p[3] };
    }, [viewBox]);

    const flowDuration = scenario === 'AI_RECOVERY'
        ? Math.max(0.2, (100 / Math.max(0.1, valvePct)) * 0.5) + 's'
        : (leakRate > 1.0 || scenario === 'SURGE' ? '0.5s' : '3s');

    // ── SVG coordinate conversion ───────────────────────────────────
    const screenToSvg = useCallback((clientX, clientY) => {
        if (!svgRef.current) return { x: 0, y: 0 };
        const rect = svgRef.current.getBoundingClientRect();
        const scaleX = vbParts.w / rect.width;
        const scaleY = vbParts.h / rect.height;
        return {
            x: (clientX - rect.left) * scaleX + vbParts.x,
            y: (clientY - rect.top) * scaleY + vbParts.y,
        };
    }, [vbParts]);

    // ── Tooltip handlers ────────────────────────────────────────────
    const showTooltip = useCallback((e, content) => {
        const container = e.currentTarget.closest('.relative');
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const rawX = e.clientX - rect.left + 14;
        const rawY = e.clientY - rect.top - 10;
        const tooltipW = 200, tooltipH = 140;
        const x = rawX + tooltipW > rect.width ? rawX - tooltipW - 28 : rawX;
        const y = rawY + tooltipH > rect.height ? rawY - tooltipH : rawY;
        setTooltip({ x, y, ...content });
    }, []);

    const hideTooltip = useCallback(() => setTooltip(null), []);

    // ── Node hover content ──────────────────────────────────────────
    const nodeHoverContent = useCallback((node) => {
        const live = nodeStates[node.id] || {};
        return {
            kind: 'node', id: node.id, nodeType: node.type,
            pressure: live.pressure_m ?? '—',
            demand: live.demand_lps ?? (node.base_demand * 1000).toFixed(3),
            elevation: node.elevation,
            isSource: node.is_source, isLeaf: node.is_leaf,
        };
    }, [nodeStates]);

    // ── Link hover content ──────────────────────────────────────────
    const linkHoverContent = useCallback((link) => {
        const live = linkStates[link.id] || {};
        return {
            kind: 'link', id: link.id, linkType: link.link_type,
            flow: live.flow_lps ?? '—', velocity: live.velocity_ms ?? '—',
            length: link.length, diameter: (link.diameter * 1000).toFixed(0),
        };
    }, [linkStates]);

    // ── Click handler: single / Ctrl+click / Shift+sector ───────────
    const handleNodeClick = useCallback((e, nodeId) => {
        e.stopPropagation();
        if (e.shiftKey) {
            // Shift+Click: Select sector (BFS neighbors)
            const sector = expandSector([nodeId], 2);
            onMultiSelect(sector);
        } else if (e.ctrlKey || e.metaKey) {
            // Ctrl+Click: Toggle this node in selection
            const next = new Set(selectedTargets);
            if (next.has(nodeId)) next.delete(nodeId);
            else next.add(nodeId);
            onMultiSelect(next);
        } else {
            // Normal click: single select
            onSelectTarget(nodeId);
        }
    }, [selectedTargets, onSelectTarget, onMultiSelect]);

    const handleLinkClick = useCallback((e, linkId) => {
        e.stopPropagation();
        if (e.ctrlKey || e.metaKey) {
            const next = new Set(selectedTargets);
            if (next.has(linkId)) next.delete(linkId);
            else next.add(linkId);
            onMultiSelect(next);
        } else {
            onSelectTarget(linkId);
        }
    }, [selectedTargets, onSelectTarget, onMultiSelect]);

    // ── Drag-to-select rectangle ────────────────────────────────────
    const handleMouseDown = useCallback((e) => {
        // Only start drag on background (not on a node/link)
        if (e.target.tagName === 'svg' || e.target.classList.contains('drag-bg')) {
            const pt = screenToSvg(e.clientX, e.clientY);
            isDragging.current = true;
            setDragRect({ x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y });
        }
    }, [screenToSvg]);

    const handleMouseMove = useCallback((e) => {
        if (!isDragging.current || !dragRect) return;
        const pt = screenToSvg(e.clientX, e.clientY);
        setDragRect(prev => prev ? { ...prev, x2: pt.x, y2: pt.y } : null);
    }, [screenToSvg, dragRect]);

    const handleMouseUp = useCallback(() => {
        if (!isDragging.current || !dragRect) {
            isDragging.current = false;
            return;
        }
        isDragging.current = false;

        // Compute bounding box
        const minX = Math.min(dragRect.x1, dragRect.x2);
        const maxX = Math.max(dragRect.x1, dragRect.x2);
        const minY = Math.min(dragRect.y1, dragRect.y2);
        const maxY = Math.max(dragRect.y1, dragRect.y2);

        // Minimum drag size to distinguish from click
        if (maxX - minX < 5 && maxY - minY < 5) {
            setDragRect(null);
            return;
        }

        // Mark that a drag just finished (suppress the subsequent onClick)
        didDrag.current = true;
        setTimeout(() => { didDrag.current = false; }, 50);

        // Find all nodes inside the rectangle
        const enclosed = new Set();
        mapData.nodes.forEach(n => {
            if (n.x >= minX && n.x <= maxX && n.y >= minY && n.y <= maxY) {
                enclosed.add(n.id);
            }
        });

        // Also select links whose both endpoints are enclosed
        mapData.links.forEach(l => {
            const f = nodeMap[l.from];
            const t = nodeMap[l.to];
            if (f && t && f.x >= minX && f.x <= maxX && f.y >= minY && f.y <= maxY &&
                t.x >= minX && t.x <= maxX && t.y >= minY && t.y <= maxY) {
                enclosed.add(l.id);
            }
        });

        if (enclosed.size > 0) {
            onMultiSelect(enclosed);
        }
        setDragRect(null);
    }, [dragRect, onMultiSelect]);

    // ── Clear selection on background click ─────────────────────────
    const handleBgClick = useCallback((e) => {
        // Suppress click if it was the end of a drag-select
        if (didDrag.current) return;
        // Only clear if clicking directly on the SVG background
        if (e.target.tagName === 'svg' || e.target.classList.contains('drag-bg')) {
            onMultiSelect(new Set());
            onSelectTarget(null);
        }
    }, [onMultiSelect, onSelectTarget]);

    // Drag rect display coordinates
    const dragRectDisplay = dragRect ? {
        x: Math.min(dragRect.x1, dragRect.x2),
        y: Math.min(dragRect.y1, dragRect.y2),
        width: Math.abs(dragRect.x2 - dragRect.x1),
        height: Math.abs(dragRect.y2 - dragRect.y1),
    } : null;

    return (
        <div className="w-full h-full bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center p-4 shadow-2xl overflow-hidden relative">
            <svg ref={svgRef} viewBox={viewBox} className="w-full h-full"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onClick={handleBgClick}
            >
                {/* Transparent background for drag detection */}
                <rect className="drag-bg" x={vbParts.x} y={vbParts.y}
                    width={vbParts.w} height={vbParts.h} fill="transparent" />

                {/* ── SVG Defs ─────────────────────────────────────── */}
                <defs>
                    <marker id="flow-arrow" viewBox="0 0 10 10" refX="5" refY="5"
                        markerWidth="5" markerHeight="5" orient="auto-start-reverse"
                        markerUnits="strokeWidth">
                        <path d="M 0 2 L 6 5 L 0 8 z" fill="#0ea5e9" opacity="0.7" />
                    </marker>
                    <marker id="flow-arrow-red" viewBox="0 0 10 10" refX="5" refY="5"
                        markerWidth="5" markerHeight="5" orient="auto-start-reverse"
                        markerUnits="strokeWidth">
                        <path d="M 0 2 L 6 5 L 0 8 z" fill="#ef4444" opacity="0.8" />
                    </marker>
                    <marker id="flow-arrow-gray" viewBox="0 0 10 10" refX="5" refY="5"
                        markerWidth="5" markerHeight="5" orient="auto-start-reverse"
                        markerUnits="strokeWidth">
                        <path d="M 0 2 L 6 5 L 0 8 z" fill="#475569" opacity="0.5" />
                    </marker>
                    <filter id="source-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="ai-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComponentTransfer in="blur" result="glow"><feFuncA type="linear" slope="2" /></feComponentTransfer>
                        <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>

                {/* ── PIPES (LINKS) ────────────────────────────────── */}
                {mapData.links.map((link) => {
                    let fromNode = nodeMap[link.from];
                    let toNode = nodeMap[link.to];
                    if (!fromNode || !toNode) return null;

                    // Correct flow direction: always AWAY from sources
                    let drawFrom = fromNode;
                    let drawTo = toNode;
                    if (toNode.is_source && !fromNode.is_source) {
                        drawFrom = toNode; drawTo = fromNode;
                    } else if (!fromNode.is_source && !toNode.is_source) {
                        if (fromNode.elevation < toNode.elevation) {
                            drawFrom = toNode; drawTo = fromNode;
                        }
                    }

                    const isTargeted = activeTarget === link.id || selectedTargets.has(link.id);
                    const isAnomaly = anomalyNode === link.id;
                    const isClosed = closedLinksSet.has(link.id);
                    const flowLps = linkStates[link.id]?.flow_lps;
                    const isPhysicsIsolated = flowLps === 0.0;
                    const isIsolated = (isAnomaly && scenario === 'AI_RECOVERY') || isClosed || isPhysicsIsolated;
                    const isReroute = reroutePath.has(link.id);
                    const isAiRestricted = scenario === 'AI_RECOVERY' && valvePct < 99 && !isIsolated;

                    let pipeColor = '#0ea5e9';
                    let arrowId = 'flow-arrow';
                    let filterProp = 'none';

                    if (isAnomaly && scenario === 'RUPTURE') { pipeColor = '#ef4444'; arrowId = 'flow-arrow-red'; }
                    if (isIsolated) { pipeColor = '#475569'; arrowId = 'flow-arrow-gray'; }
                    if (isAnomaly && scenario === 'SURGE') pipeColor = '#facc15';
                    if (isTargeted && !isAnomaly) pipeColor = '#a78bfa'; // violet selection tint
                    if (isReroute) { pipeColor = '#f97316'; arrowId = 'flow-arrow'; } // orange for reroute
                    if (isAiRestricted) { pipeColor = '#22d3ee'; filterProp = 'url(#ai-glow)'; } // cyan glow for AI control

                    const mx = (drawFrom.x + drawTo.x) / 2;
                    const my = (drawFrom.y + drawTo.y) / 2;

                    return (
                        <g key={`link-${link.id}`}
                            className="cursor-pointer hover:opacity-80"
                            onClick={(e) => handleLinkClick(e, link.id)}
                            onMouseEnter={(e) => showTooltip(e, linkHoverContent(link))}
                            onMouseMove={(e) => showTooltip(e, linkHoverContent(link))}
                            onMouseLeave={hideTooltip}
                        >
                            <line x1={drawFrom.x} y1={drawFrom.y} x2={drawTo.x} y2={drawTo.y}
                                stroke="transparent" strokeWidth="25" />
                            <line x1={drawFrom.x} y1={drawFrom.y} x2={drawTo.x} y2={drawTo.y}
                                stroke={isTargeted ? '#a78bfa' : '#1e293b'}
                                strokeWidth={isTargeted ? '12' : '10'}
                                strokeLinecap="round" />
                            
                            {isClosed ? (
                                <line x1={drawFrom.x} y1={drawFrom.y} x2={drawTo.x} y2={drawTo.y}
                                    stroke="#ef4444" strokeWidth="6" strokeDasharray="6, 8" />
                            ) : (
                                <line x1={drawFrom.x} y1={drawFrom.y} x2={drawTo.x} y2={drawTo.y}
                                    className={`pipe-flow ${isIsolated ? 'pipe-isolated' : ''} ${isReroute ? 'drop-shadow-[0_0_8px_rgba(249,115,22,1)]' : ''}`}
                                    stroke={pipeColor}
                                    strokeWidth="6"
                                    strokeDasharray="20, 20"
                                    style={{ animationDuration: flowDuration }}
                                    markerMid={`url(#${arrowId})`}
                                    filter={filterProp}
                                />
                            )}
                            
                            {!isClosed && (
                                <line x1={drawFrom.x} y1={drawFrom.y} x2={mx} y2={my}
                                    stroke="transparent" strokeWidth="1"
                                    markerEnd={`url(#${arrowId})`} />
                            )}

                            {isClosed && (
                                <text x={mx} y={my} fill="#ef4444" fontSize="18" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle">X</text>
                            )}
                        </g>
                    );
                })}

                {/* ── NODES ────────────────────────────────────────── */}
                {mapData.nodes.map((node) => {
                    const isSingleTarget = activeTarget === node.id;
                    const isInSelection = selectedTargets.has(node.id);
                    const isSelected = isSingleTarget || isInSelection;
                    const isAnomaly = anomalyNode === node.id;
                    const live = nodeStates[node.id] || {};
                    const p = live.pressure_m;
                    const fillColor = isAnomaly && scenario === 'SURGE'
                        ? '#facc15'
                        : node.is_source
                            ? '#3b82f6'
                            : node.is_leaf
                                ? '#f59e0b'
                                : pressureColor(p);

                    return (
                        <g key={`node-${node.id}`}
                            className="cursor-pointer"
                            onClick={(e) => handleNodeClick(e, node.id)}
                            onMouseEnter={(e) => showTooltip(e, nodeHoverContent(node))}
                            onMouseMove={(e) => showTooltip(e, nodeHoverContent(node))}
                            onMouseLeave={hideTooltip}
                        >
                            {/* Selection ring (larger for multi-select) */}
                            {isSelected && (
                                <circle cx={node.x} cy={node.y}
                                    r={isInSelection ? '22' : '25'}
                                    fill={isInSelection ? 'rgba(167,139,250,0.1)' : 'none'}
                                    stroke={isInSelection ? '#a78bfa' : '#ffffff'}
                                    strokeWidth={isInSelection ? '2.5' : '3'}
                                    strokeDasharray="5,5"
                                    className="animate-[spin_4s_linear_infinite]" />
                            )}

                            {/* ── Source nodes: hexagon ──────────────── */}
                            {node.is_source && (
                                <>
                                    <polygon
                                        points={hexagonPoints(node.x, node.y, 22)}
                                        fill={fillColor} opacity="0.25"
                                        filter="url(#source-glow)"
                                        className="source-pulse" />
                                    <polygon
                                        points={hexagonPoints(node.x, node.y, 16)}
                                        fill={fillColor} stroke="#60a5fa" strokeWidth="2"
                                        className="transition-all" />
                                    <text x={node.x} y={node.y + 4} textAnchor="middle"
                                        fill="white" fontSize="8" fontWeight="bold"
                                        style={{ pointerEvents: 'none' }}>
                                        {node.type === 'reservoir' ? 'R' : 'T'}
                                    </text>
                                </>
                            )}

                            {/* ── Leaf nodes: diamond ────────────────── */}
                            {node.is_leaf && !node.is_source && (
                                <polygon
                                    points={diamondPoints(node.x, node.y, 12)}
                                    fill={fillColor} stroke="#d97706" strokeWidth="1.5"
                                    className="transition-all hover:brightness-125" />
                            )}

                            {/* ── Standard junctions: circle ──────────── */}
                            {!node.is_source && !node.is_leaf && (
                                <circle
                                    cx={node.x} cy={node.y}
                                    r={isAnomaly ? '16' : '7'}
                                    fill={fillColor}
                                    className="transition-all hover:brightness-125"
                                    stroke={isAnomaly ? '#ffffff' : 'none'}
                                    strokeWidth={isAnomaly ? '2' : '0'} />
                            )}
                        </g>
                    );
                })}

                {/* ── Drag Selection Rectangle ─────────────────────── */}
                {dragRectDisplay && (
                    <rect
                        x={dragRectDisplay.x} y={dragRectDisplay.y}
                        width={dragRectDisplay.width} height={dragRectDisplay.height}
                        fill="rgba(167, 139, 250, 0.08)"
                        stroke="#a78bfa" strokeWidth="2" strokeDasharray="8,4"
                        className="pointer-events-none" />
                )}
            </svg>

            {/* ── Floating Tooltip ──────────────────────────────── */}
            {tooltip && (
                <div className="tooltip-hydro" style={{ left: tooltip.x, top: tooltip.y }}>
                    {tooltip.kind === 'node' ? (
                        <>
                            <div className="tooltip-title">
                                <span className={`tooltip-badge ${tooltip.isSource ? 'badge-source' : tooltip.isLeaf ? 'badge-leaf' : 'badge-junction'}`}>
                                    {tooltip.nodeType}
                                </span>
                                {tooltip.id}
                            </div>
                            <div className="tooltip-row"><span>Pressure</span><span className="tooltip-val">{typeof tooltip.pressure === 'number' ? `${tooltip.pressure.toFixed(1)} m` : tooltip.pressure}</span></div>
                            <div className="tooltip-row"><span>Demand</span><span className="tooltip-val">{typeof tooltip.demand === 'number' ? `${tooltip.demand.toFixed(3)} L/s` : `${tooltip.demand} L/s`}</span></div>
                            <div className="tooltip-row"><span>Elevation</span><span className="tooltip-val">{tooltip.elevation} m</span></div>
                        </>
                    ) : (
                        <>
                            <div className="tooltip-title">
                                <span className={`tooltip-badge badge-${tooltip.linkType}`}>{tooltip.linkType}</span>
                                {tooltip.id}
                            </div>
                            <div className="tooltip-row"><span>Flow</span><span className="tooltip-val">{typeof tooltip.flow === 'number' ? `${tooltip.flow.toFixed(2)} L/s` : tooltip.flow}</span></div>
                            <div className="tooltip-row"><span>Velocity</span><span className="tooltip-val">{typeof tooltip.velocity === 'number' ? `${tooltip.velocity.toFixed(2)} m/s` : tooltip.velocity}</span></div>
                            <div className="tooltip-row"><span>Length</span><span className="tooltip-val">{tooltip.length} m</span></div>
                            <div className="tooltip-row"><span>Diameter</span><span className="tooltip-val">{tooltip.diameter} mm</span></div>
                        </>
                    )}
                </div>
            )}

            {/* ── Map Legend ────────────────────────────────────── */}
            <div className="legend-hydro">
                <div className="legend-item"><span className="legend-swatch" style={{ background: '#3b82f6' }}></span>Source</div>
                <div className="legend-item"><span className="legend-swatch" style={{ background: '#f59e0b' }}></span>Leaf</div>
                <div className="legend-item"><span className="legend-swatch" style={{ background: '#10b981' }}></span>Healthy</div>
                <div className="legend-item"><span className="legend-swatch" style={{ background: '#ef4444' }}></span>Critical</div>
                <div className="legend-item"><span className="legend-swatch" style={{ background: '#a78bfa' }}></span>Selected</div>
            </div>

            {/* ── Selection help bar ─────────────────────────────── */}
            {selectedTargets.size > 0 && (
                <div className="selection-bar">
                    <span className="selection-count">{selectedTargets.size}</span> elements selected
                    <span className="selection-hint">• Ctrl+Click to toggle • Shift+Click for sector • Drag to lasso</span>
                </div>
            )}
        </div>
    );
};

export default TopologicalMap;