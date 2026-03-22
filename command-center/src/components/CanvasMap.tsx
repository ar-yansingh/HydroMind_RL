import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import mapData from '../assets/map_topology.json';
import { TopologicalMapProps } from '../TopologicalMap';
import { useUIStore } from '../store/uiStore';

/* --- Helpers --- */
function pressureColor(pressure: number | undefined) {
    if (pressure === null || pressure === undefined) return '#38bdf8';
    if (pressure >= 18) return '#10b981';
    if (pressure >= 12) return '#eab308';
    if (pressure >= 6) return '#f97316';
    return '#ef4444';
}

const nodeMap = new Map();
if (mapData && mapData.nodes) {
    mapData.nodes.forEach(n => nodeMap.set(n.id, n));
}
const nodeLinks = new Map();
if (mapData && mapData.links) {
    mapData.links.forEach((link: any) => {
        if (!nodeLinks.has(link.from)) nodeLinks.set(link.from, []);
        if (!nodeLinks.has(link.to)) nodeLinks.set(link.to, []);
        nodeLinks.get(link.from).push(link);
        nodeLinks.get(link.to).push(link);
    });
}

function expandSector(seedIds: string[], depth = 2) {
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

export default function CanvasMap(props: TopologicalMapProps) {
    const {
        scenario, valvePct = 100, leakRate, activeTarget,
        selectedTargets = new Set(), onSelectTarget, onMultiSelect,
        anomalyNode, nodeStates = {}, linkStates = {}, closedLinks = []
    } = props;
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const minimapRef = useRef<HTMLCanvasElement>(null);
    const [tooltip, setTooltip] = useState<any>(null);
    const { showMinimap } = useUIStore();
    
    // Viewport matrix
    const transform = useRef({ x: 0, y: 0, scale: 1 });
    const isDraggingMap = useRef(false);
    const lastMouse = useRef({ x: 0, y: 0 });
    
    // Box selection
    const isLassoing = useRef(false);
    const lassoStart = useRef({ x: 0, y: 0 });
    const lassoCurrent = useRef({ x: 0, y: 0 });
    const didLasso = useRef(false);

    // Animation Ref
    const reqRef = useRef<number>(0);
    const dashOffset = useRef(0);
    
    const closedLinksSet = useMemo(() => new Set(closedLinks), [closedLinks]);

    // Reroute path memo
    const reroutePath = useMemo(() => {
        if (!anomalyNode || closedLinksSet.size === 0) return new Set();
        const target = anomalyNode;
        const queue: string[] = [];
        const cameFrom: Record<string, string | null> = {}; 
        
        for (const n of mapData.nodes) {
            if (n.is_source) { queue.push(n.id); cameFrom[n.id] = null; }
        }
        
        let found = false;
        let head = 0;
        while(head < queue.length) {
            const curr: string = queue[head++];
            if (curr === target) { found = true; break; }
            const links: any[] = nodeLinks.get(curr) || [];
            for (const link of links) {
                if (closedLinksSet.has(link.id)) continue;
                const nxt: string = link.from === curr ? link.to : link.from;
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
                const link = mapData.links.find((l: any) => l.id === linkId);
                if (!link) break;
                curr = link.from === curr ? link.to : link.from;
            }
        }
        return pathLinks;
    }, [anomalyNode, closedLinksSet]);

    // Screen to World coords
    const getPointInWorld = useCallback((clientX: number, clientY: number) => {
        if (!canvasRef.current || !containerRef.current) return { x: 0, y: 0 };
        const rect = containerRef.current.getBoundingClientRect();
        const x = (clientX - rect.left - transform.current.x) / transform.current.scale;
        const y = (clientY - rect.top - transform.current.y) / transform.current.scale;
        return { x, y };
    }, []);

    const centerMap = useCallback(() => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        if (!mapData || !mapData.nodes) return;
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        mapData.nodes.forEach(n => {
            if (n.x < minX) minX = n.x;
            if (n.y < minY) minY = n.y;
            if (n.x > maxX) maxX = n.x;
            if (n.y > maxY) maxY = n.y;
        });
        
        const mapW = maxX - minX;
        const mapH = maxY - minY;
        const scale = Math.min(rect.width / (mapW + 100), rect.height / (mapH + 100));
        
        transform.current = {
            x: rect.width / 2 - (minX + mapW / 2) * scale,
            y: rect.height / 2 - (minY + mapH / 2) * scale,
            scale
        };
    }, []);

    useEffect(() => {
        centerMap();
    }, [centerMap]);

    // --- RENDER LOOP ---
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(transform.current.x, transform.current.y);
        ctx.scale(transform.current.scale, transform.current.scale);

        // 1. Draw Links
        mapData.links.forEach((link: any) => {
            const fromNode = nodeMap.get(link.from);
            const toNode = nodeMap.get(link.to);
            if (!fromNode || !toNode) return;

            let drawFrom = fromNode, drawTo = toNode;
            if (toNode.is_source && !fromNode.is_source) {
                drawFrom = toNode; drawTo = fromNode;
            } else if (!fromNode.is_source && !toNode.is_source && fromNode.elevation < toNode.elevation) {
                drawFrom = toNode; drawTo = fromNode;
            }

            const isTargeted = activeTarget === link.id || selectedTargets.has(link.id);
            const isAnomaly = anomalyNode === link.id;
            const isClosed = closedLinksSet.has(link.id);
            const flowLps = linkStates[link.id]?.flow_lps;
            const isPhysicsIsolated = flowLps === 0.0;
            const isIsolated = (isAnomaly && scenario === 'AI_RECOVERY') || isClosed || isPhysicsIsolated;
            const isReroute = reroutePath.has(link.id);
            const isAiRestricted = scenario === 'AI_RECOVERY' && valvePct < 99 && !isIsolated;

            let pipeColor = '#0ea5e9'; // cyan default
            if (isAnomaly && scenario === 'RUPTURE') pipeColor = '#ef4444';
            if (isIsolated) pipeColor = '#475569';
            if (isAnomaly && scenario === 'SURGE') pipeColor = '#facc15';
            if (isTargeted && !isAnomaly) pipeColor = '#a78bfa';
            if (isReroute) pipeColor = '#f97316';
            if (isAiRestricted && !isTargeted) pipeColor = '#22d3ee';

            // Base thick stroke
            ctx.beginPath();
            ctx.moveTo(drawFrom.x, drawFrom.y);
            ctx.lineTo(drawTo.x, drawTo.y);
            ctx.lineWidth = isTargeted ? 12 : 10;
            ctx.strokeStyle = isTargeted ? '#a78bfa' : '#1e293b';
            ctx.lineCap = 'round';
            ctx.stroke();

            // Inner flow
            ctx.beginPath();
            ctx.moveTo(drawFrom.x, drawFrom.y);
            ctx.lineTo(drawTo.x, drawTo.y);
            ctx.lineWidth = 6;
            ctx.strokeStyle = pipeColor;

            if (isIsolated) {
                ctx.setLineDash([]);
                ctx.stroke();
            } else if (isClosed) {
                ctx.strokeStyle = '#ef4444';
                ctx.setLineDash([6, 8]);
                ctx.stroke();
            } else {
                ctx.setLineDash([20, 20]);
                const speedMult = scenario === 'AI_RECOVERY' 
                    ? Math.max(0.2, (valvePct / 100)) 
                    : (leakRate > 1.0 || scenario === 'SURGE' ? 3 : 1);
                ctx.lineDashOffset = -dashOffset.current * speedMult;
                
                if (isAiRestricted || isReroute) {
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = pipeColor;
                }
                
                ctx.stroke();
                ctx.shadowBlur = 0; // reset
            }
            
            ctx.setLineDash([]); // reset

            // Arrows (approximate in middle)
            if (!isClosed && !isIsolated) {
                const mx = (drawFrom.x + drawTo.x) / 2;
                const my = (drawFrom.y + drawTo.y) / 2;
                const angle = Math.atan2(drawTo.y - drawFrom.y, drawTo.x - drawFrom.x);
                ctx.save();
                ctx.translate(mx, my);
                ctx.rotate(angle);
                ctx.beginPath();
                ctx.moveTo(-5, -5);
                ctx.lineTo(5, 0);
                ctx.lineTo(-5, 5);
                ctx.fillStyle = pipeColor;
                ctx.fill();
                ctx.restore();
            } else if (isClosed) {
                const mx = (drawFrom.x + drawTo.x) / 2;
                const my = (drawFrom.y + drawTo.y) / 2;
                ctx.fillStyle = '#ef4444';
                ctx.font = "bold 18px Arial";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("X", mx, my);
            }
        });

        // 2. Draw Nodes
        mapData.nodes.forEach((node: any) => {
            const isSingleTarget = activeTarget === node.id;
            const isInSelection = selectedTargets.has(node.id);
            const isSelected = isSingleTarget || isInSelection;
            const isAnomaly = anomalyNode === node.id;
            const live = nodeStates[node.id] || {};
            const p = live.pressure_m;
            
            const fillColor = isAnomaly && scenario === 'SURGE'
                ? '#facc15' : node.is_source
                    ? '#3b82f6' : node.is_leaf
                        ? '#f59e0b' : pressureColor(p);

            // Selection indicator
            if (isSelected) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, isInSelection ? 22 : 25, 0, Math.PI * 2);
                ctx.fillStyle = isInSelection ? 'rgba(167,139,250,0.1)' : 'transparent';
                ctx.fill();
                ctx.lineWidth = isInSelection ? 2.5 : 3;
                ctx.strokeStyle = isInSelection ? '#a78bfa' : '#ffffff';
                ctx.setLineDash([5, 5]);
                // Rotation for dashed circle could be added here
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Draw shape
            if (node.is_source) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = fillColor;
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i - Math.PI / 2;
                    const hx = node.x + 16 * Math.cos(angle);
                    const hy = node.y + 16 * Math.sin(angle);
                    if (i === 0) ctx.moveTo(hx, hy);
                    else ctx.lineTo(hx, hy);
                }
                ctx.closePath();
                ctx.fillStyle = fillColor;
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#60a5fa';
                ctx.stroke();
                ctx.shadowBlur = 0;
                
                ctx.fillStyle = "white";
                ctx.font = "bold 8px Arial";
                ctx.textAlign = "center";
                ctx.fillText(node.type === 'reservoir' ? 'R' : 'T', node.x, node.y + 3);
            } else if (node.is_leaf) {
                ctx.beginPath();
                const r = 12;
                ctx.moveTo(node.x, node.y - r);
                ctx.lineTo(node.x + r * 0.7, node.y);
                ctx.lineTo(node.x, node.y + r);
                ctx.lineTo(node.x - r * 0.7, node.y);
                ctx.closePath();
                ctx.fillStyle = fillColor;
                ctx.fill();
                ctx.lineWidth = 1.5;
                ctx.strokeStyle = '#d97706';
                ctx.stroke();
            } else {
                ctx.beginPath();
                const rad = isAnomaly ? 16 : 7;
                ctx.arc(node.x, node.y, rad, 0, Math.PI * 2);
                ctx.fillStyle = fillColor;
                ctx.fill();
                if (isAnomaly) {
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = '#fff';
                    ctx.stroke();
                }
            }
        });

        // 3. Draw Lasso Selection Rect
        if (isLassoing.current) {
            const minX = Math.min(lassoStart.current.x, lassoCurrent.current.x);
            const minY = Math.min(lassoStart.current.y, lassoCurrent.current.y);
            const w = Math.abs(lassoCurrent.current.x - lassoStart.current.x);
            const h = Math.abs(lassoCurrent.current.y - lassoStart.current.y);
            
            ctx.fillStyle = 'rgba(167, 139, 250, 0.08)';
            ctx.fillRect(minX, minY, w, h);
            ctx.strokeStyle = '#a78bfa';
            ctx.lineWidth = 2 / transform.current.scale; // keep border thickness constant
            ctx.setLineDash([8 / transform.current.scale, 4 / transform.current.scale]);
            ctx.strokeRect(minX, minY, w, h);
            ctx.setLineDash([]);
        }

        // 4. Draw Node Labels at medium+ zoom
        if (transform.current.scale > 1.5) {
            mapData.nodes.forEach((node: any) => {
                ctx.fillStyle = 'rgba(226,232,240,0.6)';
                ctx.font = `${Math.max(6, 9 / transform.current.scale * 1.5)}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(node.id, node.x, node.y + (node.is_source ? 20 : node.is_leaf ? 16 : 12));
            });
        }

        ctx.restore();

        // 5. Draw Minimap
        if (showMinimap && minimapRef.current && containerRef.current) {
            const mCanvas = minimapRef.current;
            const mCtx = mCanvas.getContext('2d');
            if (mCtx) {
                const mW = mCanvas.width;
                const mH = mCanvas.height;
                mCtx.clearRect(0, 0, mW, mH);
                
                // Map bounds
                let mapMinX = Infinity, mapMinY = Infinity, mapMaxX = -Infinity, mapMaxY = -Infinity;
                mapData.nodes.forEach((n: any) => {
                    if (n.x < mapMinX) mapMinX = n.x;
                    if (n.y < mapMinY) mapMinY = n.y;
                    if (n.x > mapMaxX) mapMaxX = n.x;
                    if (n.y > mapMaxY) mapMaxY = n.y;
                });
                const mMapW = mapMaxX - mapMinX;
                const mMapH = mapMaxY - mapMinY;
                const mScale = Math.min((mW - 10) / mMapW, (mH - 10) / mMapH);
                const mOffX = (mW - mMapW * mScale) / 2 - mapMinX * mScale;
                const mOffY = (mH - mMapH * mScale) / 2 - mapMinY * mScale;
                
                // Draw links
                mCtx.strokeStyle = 'rgba(56,189,248,0.3)';
                mCtx.lineWidth = 1;
                mapData.links.forEach((link: any) => {
                    const f = nodeMap.get(link.from);
                    const t = nodeMap.get(link.to);
                    if (!f || !t) return;
                    mCtx.beginPath();
                    mCtx.moveTo(f.x * mScale + mOffX, f.y * mScale + mOffY);
                    mCtx.lineTo(t.x * mScale + mOffX, t.y * mScale + mOffY);
                    mCtx.stroke();
                });
                
                // Draw nodes
                mapData.nodes.forEach((n: any) => {
                    mCtx.beginPath();
                    mCtx.arc(n.x * mScale + mOffX, n.y * mScale + mOffY, n.is_source ? 3 : 1.5, 0, Math.PI * 2);
                    mCtx.fillStyle = n.is_source ? '#3b82f6' : n.is_leaf ? '#f59e0b' : '#94a3b8';
                    mCtx.fill();
                });
                
                // Draw viewport rect
                const cRect = containerRef.current.getBoundingClientRect();
                const vpLeft = (-transform.current.x / transform.current.scale) * mScale + mOffX;
                const vpTop = (-transform.current.y / transform.current.scale) * mScale + mOffY;
                const vpW = (cRect.width / transform.current.scale) * mScale;
                const vpH = (cRect.height / transform.current.scale) * mScale;
                
                mCtx.strokeStyle = 'rgba(167,139,250,0.7)';
                mCtx.lineWidth = 1.5;
                mCtx.strokeRect(vpLeft, vpTop, vpW, vpH);
                mCtx.fillStyle = 'rgba(167,139,250,0.05)';
                mCtx.fillRect(vpLeft, vpTop, vpW, vpH);
            }
        }
    }, [activeTarget, selectedTargets, nodeStates, linkStates, scenario, valvePct, leakRate, closedLinksSet, reroutePath, anomalyNode]);

    // Render loop ticker
    useEffect(() => {
        let lastTime = performance.now();
        const tick = (now: number) => {
            const delta = now - lastTime;
            lastTime = now;
            dashOffset.current += (delta / 16) * 0.5; // shift dashes
            draw();
            reqRef.current = requestAnimationFrame(tick);
        };
        reqRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(reqRef.current);
    }, [draw]);

    // Handle Resize
    useEffect(() => {
        const resize = () => {
            if (containerRef.current && canvasRef.current) {
                canvasRef.current.width = containerRef.current.clientWidth;
                canvasRef.current.height = containerRef.current.clientHeight;
                centerMap();
            }
        };
        window.addEventListener('resize', resize);
        resize();
        return () => window.removeEventListener('resize', resize);
    }, [centerMap]);

    // --- EVENTS ---
    const getHitTarget = (wx: number, wy: number) => {
        // Hit test nodes (reverse for top-level)
        for (let i = mapData.nodes.length - 1; i >= 0; i--) {
            const n = mapData.nodes[i];
            const dist = Math.hypot(n.x - wx, n.y - wy);
            if (dist < 15 / transform.current.scale) return { type: 'node', id: n.id, data: n };
        }
        // Hit test links (rough)
        for (let i = mapData.links.length - 1; i >= 0; i--) {
            const l = mapData.links[i];
            const f = nodeMap.get(l.from);
            const t = nodeMap.get(l.to);
            if (!f || !t) continue;
            // Point to line segment distance
            const l2 = (f.x - t.x)**2 + (f.y - t.y)**2;
            if (l2 === 0) continue;
            let tParam = ((wx - f.x) * (t.x - f.x) + (wy - f.y) * (t.y - f.y)) / l2;
            tParam = Math.max(0, Math.min(1, tParam));
            const projX = f.x + tParam * (t.x - f.x);
            const projY = f.y + tParam * (t.y - f.y);
            const dist = Math.hypot(wx - projX, wy - projY);
            if (dist < 10 / transform.current.scale) return { type: 'link', id: l.id, data: l };
        }
        return null;
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        const { x: wx, y: wy } = getPointInWorld(e.clientX, e.clientY);
        const hit = getHitTarget(wx, wy);

        if (e.button === 1 || e.altKey || (!hit && !e.shiftKey && !e.ctrlKey)) {
            // Middle button, alt key, or background drag
            isDraggingMap.current = true;
            lastMouse.current = { x: e.clientX, y: e.clientY };
        } else if (!hit) {
            // Background lasso
            isLassoing.current = true;
            lassoStart.current = { x: wx, y: wy };
            lassoCurrent.current = { x: wx, y: wy };
            didLasso.current = false;
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        const { x: wx, y: wy } = getPointInWorld(e.clientX, e.clientY);

        if (isDraggingMap.current) {
            const dx = e.clientX - lastMouse.current.x;
            const dy = e.clientY - lastMouse.current.y;
            transform.current.x += dx;
            transform.current.y += dy;
            lastMouse.current = { x: e.clientX, y: e.clientY };
            return;
        }

        if (isLassoing.current) {
            lassoCurrent.current = { x: wx, y: wy };
            if (Math.hypot(lassoCurrent.current.x - lassoStart.current.x, lassoCurrent.current.y - lassoStart.current.y) > 5) {
                didLasso.current = true;
            }
            return;
        }

        // Tooltip hover
        const hit = getHitTarget(wx, wy);
        if (hit) {
            const rect = containerRef.current!.getBoundingClientRect();
            setTooltip({
                kind: hit.type,
                id: hit.id,
                x: e.clientX - rect.left + 15,
                y: e.clientY - rect.top - 15,
                data: hit.data
            });
        } else {
            setTooltip(null);
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        isDraggingMap.current = false;
        if (isLassoing.current) {
            isLassoing.current = false;
            if (didLasso.current) {
                const minX = Math.min(lassoStart.current.x, lassoCurrent.current.x);
                const maxX = Math.max(lassoStart.current.x, lassoCurrent.current.x);
                const minY = Math.min(lassoStart.current.y, lassoCurrent.current.y);
                const maxY = Math.max(lassoStart.current.y, lassoCurrent.current.y);
                
                const enclosed = new Set<string>();
                mapData.nodes.forEach((n: any) => {
                    if (n.x >= minX && n.x <= maxX && n.y >= minY && n.y <= maxY) enclosed.add(n.id);
                });
                mapData.links.forEach((l: any) => {
                    const f = nodeMap.get(l.from);
                    const t = nodeMap.get(l.to);
                    if (f && t && f.x >= minX && f.x <= maxX && f.y >= minY && f.y <= maxY && t.x >= minX && t.x <= maxX && t.y >= minY && t.y <= maxY) {
                        enclosed.add(l.id);
                    }
                });
                if (enclosed.size > 0) onMultiSelect(enclosed);
            }
            return;
        }

        if (didLasso.current) { didLasso.current = false; return; }

        const { x: wx, y: wy } = getPointInWorld(e.clientX, e.clientY);
        const hit = getHitTarget(wx, wy);
        
        if (hit) {
            if (e.shiftKey && hit.type === 'node') {
                onMultiSelect(expandSector([hit.id], 2));
            } else if (e.ctrlKey || e.metaKey) {
                const next = new Set(selectedTargets);
                if (next.has(hit.id)) next.delete(hit.id);
                else next.add(hit.id);
                onMultiSelect(next);
            } else {
                onSelectTarget(hit.id);
            }
        } else {
            onSelectTarget(null);
            onMultiSelect(new Set());
        }
    };

    // Separate handler for pointer leave — only reset drag/lasso state, NEVER clear selection
    const handlePointerLeave = () => {
        isDraggingMap.current = false;
        isLassoing.current = false;
        setTooltip(null);
    };

    const handleWheel = (e: React.WheelEvent) => {
        const scaleBy = 1.1;
        const oldScale = transform.current.scale;
        const newScale = e.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
        
        const rect = containerRef.current!.getBoundingClientRect();
        const mousePointTo = {
            x: (e.clientX - rect.left - transform.current.x) / oldScale,
            y: (e.clientY - rect.top - transform.current.y) / oldScale,
        };
        
        transform.current = {
            x: e.clientX - rect.left - mousePointTo.x * newScale,
            y: e.clientY - rect.top - mousePointTo.y * newScale,
            scale: newScale
        };
    };

    return (
        <div ref={containerRef} className="w-full h-full bg-[var(--hm-bg)] rounded-xl border border-slate-800/50 shadow-2xl overflow-hidden relative" onWheel={handleWheel}>
            <canvas ref={canvasRef} 
                onPointerDown={handlePointerDown} 
                onPointerMove={handlePointerMove} 
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerLeave}
                className="w-full h-full"
            />

            {/* ── Zoom Controls ── */}
            <div className="absolute top-3 right-3 z-30 flex flex-col gap-1">
                <button onClick={() => { transform.current.scale *= 1.3; }} 
                    className="w-8 h-8 rounded-lg bg-slate-900/80 border border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:text-white transition-all text-sm font-bold backdrop-blur">+</button>
                <button onClick={() => { transform.current.scale /= 1.3; }} 
                    className="w-8 h-8 rounded-lg bg-slate-900/80 border border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:text-white transition-all text-sm font-bold backdrop-blur">−</button>
                <button onClick={centerMap} 
                    className="w-8 h-8 rounded-lg bg-slate-900/80 border border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:text-white transition-all text-[10px] font-bold backdrop-blur" title="Fit to view">⊞</button>
            </div>

            {/* ── Minimap ── */}
            {showMinimap && (
                <canvas ref={minimapRef} width={160} height={120}
                    className="absolute bottom-3 right-3 z-30 rounded-lg border border-slate-700/50 bg-slate-950/90 backdrop-blur" />
            )}

            {/* ── Tooltip ── */}
            {tooltip && (
                <div className="tooltip-hydro" style={{ left: tooltip.x, top: tooltip.y }}>
                    <div className="tooltip-title">
                        <span className={`tooltip-badge ${tooltip.kind === 'node' ? 'badge-junction' : 'badge-pipe'}`}>
                            {tooltip.kind}
                        </span>
                        {tooltip.id}
                    </div>
                    {tooltip.kind === 'node' ? (
                        <>
                            <div className="tooltip-row"><span>Pressure</span><span className="tooltip-val">{nodeStates[tooltip.id]?.pressure_m?.toFixed(2) || '—'} m</span></div>
                            <div className="tooltip-row"><span>Demand</span><span className="tooltip-val">{nodeStates[tooltip.id]?.demand_lps?.toFixed(2) || (tooltip.data.base_demand*1000).toFixed(2)} L/s</span></div>
                        </>
                    ) : (
                        <>
                            <div className="tooltip-row"><span>Flow</span><span className="tooltip-val">{linkStates[tooltip.id]?.flow_lps?.toFixed(2) || '—'} L/s</span></div>
                            <div className="tooltip-row"><span>Velocity</span><span className="tooltip-val">{linkStates[tooltip.id]?.velocity_ms?.toFixed(2) || '—'} m/s</span></div>
                        </>
                    )}
                </div>
            )}

            {/* ── Legend ── */}
            <div className="legend-hydro">
                <div className="legend-item"><span className="legend-swatch" style={{ background: '#3b82f6' }}></span>Source</div>
                <div className="legend-item"><span className="legend-swatch" style={{ background: '#f59e0b' }}></span>Leaf</div>
                <div className="legend-item"><span className="legend-swatch" style={{ background: '#10b981' }}></span>Healthy</div>
                <div className="legend-item"><span className="legend-swatch" style={{ background: '#ef4444' }}></span>Critical</div>
                <div className="legend-item"><span className="legend-swatch" style={{ background: '#a78bfa' }}></span>Selected</div>
            </div>

            {/* ── Selection Help Bar ── */}
            {selectedTargets.size > 0 && (
                <div className="selection-bar">
                    <span className="selection-count">{selectedTargets.size}</span> elements selected
                    <span className="selection-hint">• Ctrl+Click toggle • Shift+Click sector • Drag lasso</span>
                </div>
            )}
        </div>
    );
}
