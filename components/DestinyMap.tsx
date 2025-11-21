import React, { useMemo, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { StorySegment, GameState } from "../types";

interface DestinyMapProps {
  gameState: GameState;
  onNavigate: (nodeId: string) => void;
  onClose: () => void;
}

interface TreeNode {
  id: string;
  segment: StorySegment;
  children: TreeNode[];
  x: number;
  y: number;
  depth: number;
  isMainPath: boolean;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;
const LEVEL_SPACING = 250; // Horizontal distance between turns
const BRANCH_SPACING = 100; // Vertical distance between siblings

export const DestinyMap: React.FC<DestinyMapProps> = ({
  gameState,
  onNavigate,
  onClose,
}) => {
  const { t } = useTranslation();
  const { nodes, activeNodeId, rootNodeId } = gameState;
  const containerRef = useRef<HTMLDivElement>(null);

  // Panning & Zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  const [isReady, setIsReady] = useState(false); // Prevent initial flash

  // Build Tree and Layout
  const { treeRoot, width, height, flatNodes } = useMemo(() => {
    if (!rootNodeId || !nodes[rootNodeId])
      return { treeRoot: null, width: 0, height: 0, flatNodes: [] };

    // 1. Build Hierarchy
    const nodeMap = new Map<string, TreeNode>();
    const allSegments = Object.values(nodes) as StorySegment[];

    // Initialize wrapper objects
    allSegments.forEach((seg) => {
      nodeMap.set(seg.id, {
        id: seg.id,
        segment: seg,
        children: [],
        x: 0,
        y: 0,
        depth: 0,
        isMainPath: false,
      });
    });

    // Identify main path for highlighting
    let curr: string | null = activeNodeId;
    while (curr && nodeMap.has(curr)) {
      nodeMap.get(curr)!.isMainPath = true;
      curr = nodes[curr].parentId;
    }

    // Link children
    let root: TreeNode | null = null;
    allSegments.forEach((seg) => {
      const node = nodeMap.get(seg.id)!;
      if (!seg.parentId) {
        root = node;
      } else {
        const parent = nodeMap.get(seg.parentId);
        if (parent) {
          parent.children.push(node);
        }
      }
    });

    if (!root) return { treeRoot: null, width: 0, height: 0, flatNodes: [] };

    // 2. Calculate Layout (Horizontal Tree)
    // We use a simple recursive traversal.
    // Y-position is determined by leaf counting or simple spacing to avoid overlap.

    let maxY = 0;
    let maxX = 0;
    const flatList: TreeNode[] = [];

    // Helper to assign coordinates
    // Returns the vertical center of this subtree
    const layoutNode = (
      node: TreeNode,
      depth: number,
      startY: number,
    ): number => {
      node.depth = depth;
      node.x = 50 + depth * LEVEL_SPACING;
      maxX = Math.max(maxX, node.x);

      // If leaf, assign Y and increment global Y tracker
      if (node.children.length === 0) {
        node.y = startY;
        maxY = Math.max(maxY, startY);
        flatList.push(node);
        return startY + BRANCH_SPACING;
      }

      // If branch, layout children vertically
      let currentChildY = startY;
      const childCenters: number[] = [];

      // Sort children to keep main path somewhat central or consistent
      node.children.sort((a, b) => a.segment.timestamp - b.segment.timestamp);

      node.children.forEach((child) => {
        const nextYStart = layoutNode(child, depth + 1, currentChildY);
        // The child's Y was set to the center of ITS children (or itself)
        childCenters.push(child.y);
        currentChildY = nextYStart; // Shift down for next sibling's block
      });

      // Parent Y is average of children Ys
      const minChildY = childCenters[0];
      const maxChildY = childCenters[childCenters.length - 1];
      node.y = (minChildY + maxChildY) / 2;

      maxY = Math.max(maxY, node.y);
      flatList.push(node);

      // Return the next available Y slot below this entire subtree
      return currentChildY;
    };

    layoutNode(root, 0, 100);

    return {
      treeRoot: root,
      width: maxX + NODE_WIDTH + 500, // Ensure enough width based on actual node positions
      height: maxY + 200,
      flatNodes: flatList,
    };
  }, [nodes, rootNodeId, activeNodeId]);

  // Helper to center a node
  const centerNode = (targetId: string | null, targetScale = scale) => {
    if (!targetId || !containerRef.current) return;
    const target = flatNodes.find((n) => n.id === targetId);
    if (target) {
      const containerW = containerRef.current.clientWidth;
      const containerH = containerRef.current.clientHeight;

      // Calculate center with scale consideration
      // We want: pan.x + target.x * scale + NODE_WIDTH/2 * scale = containerW / 2
      // So: pan.x = containerW / 2 - (target.x + NODE_WIDTH/2) * scale

      setPan({
        x: containerW / 2 - (target.x + NODE_WIDTH / 2) * targetScale,
        y: containerH / 2 - target.y * targetScale,
      });
    }
  };

  // Initial centering
  useEffect(() => {
    if (flatNodes.length > 0 && containerRef.current && !isReady) {
      centerNode(activeNodeId, 1);
      // Small timeout to ensure layout is stable and prevent flash
      requestAnimationFrame(() => setIsReady(true));
    }
  }, [flatNodes, activeNodeId]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch Support
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setLastMouse({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const dx = e.touches[0].clientX - lastMouse.x;
    const dy = e.touches[0].clientY - lastMouse.y;
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
    setLastMouse({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchEnd = () => setIsDragging(false);

  // Zoom Handlers
  const handleZoom = (delta: number) => {
    const newScale = Math.min(Math.max(0.2, scale + delta), 2);
    // Zoom towards center of screen
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      // Current center in world coords
      // CenterX = (clientWidth/2 - pan.x) / scale
      const worldCenterX = (clientWidth / 2 - pan.x) / scale;
      const worldCenterY = (clientHeight / 2 - pan.y) / scale;

      // New pan to keep worldCenter at screen center
      // pan.x = clientWidth/2 - worldCenterX * newScale
      setPan({
        x: clientWidth / 2 - worldCenterX * newScale,
        y: clientHeight / 2 - worldCenterY * newScale,
      });
    }
    setScale(newScale);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleAmount = -e.deltaY * 0.001;
    handleZoom(scaleAmount);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/35 backdrop-blur flex flex-col animate-fade-in text-theme-text">
      {/* Header */}
      <div className="flex-none p-6 border-b border-theme-border bg-theme-surface flex justify-between items-center shadow-lg z-10">
        <div>
          <h2 className="text-3xl font-fantasy text-theme-primary tracking-wide">
            {t("tree.map")}
          </h2>
          <p className="text-xs text-theme-muted mt-1">
            Timeline Browser • {Object.keys(nodes).length} Moments • Drag to Pan
            • Scroll to Zoom
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-theme-muted hover:text-theme-primary transition-colors p-2 border border-transparent hover:border-theme-muted rounded-full"
        >
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative bg-theme-bg cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        style={{ opacity: isReady ? 1 : 0, transition: "opacity 0.3s ease-in" }}
      >
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>

        <svg
          style={{
            transformOrigin: "0 0",
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transition: isDragging ? "none" : "transform 0.3s ease-out",
          }}
          width={Math.max(4000, width)}
          height={Math.max(2000, height)}
          className="block"
        >
          {/* Connections */}
          {flatNodes.map((node) => {
            return node.children.map((child) => {
              const isMainPath = node.isMainPath && child.isMainPath;
              // Horizontal Cubic Bezier
              const midX = (node.x + NODE_WIDTH + child.x) / 2;
              const d = `M ${node.x + NODE_WIDTH} ${node.y} C ${midX} ${node.y}, ${midX} ${child.y}, ${child.x} ${child.y}`;

              return (
                <path
                  key={`${node.id}-${child.id}`}
                  d={d}
                  fill="none"
                  stroke={
                    isMainPath ? "var(--theme-primary)" : "var(--theme-border)"
                  }
                  strokeWidth={isMainPath ? 3 : 1.5}
                  strokeOpacity={isMainPath ? 0.8 : 0.4}
                />
              );
            });
          })}

          {/* Nodes */}
          {flatNodes.map((node) => {
            const isCurrent = node.id === activeNodeId;
            const isModel = node.segment.role === "model";
            const isActivePath = node.isMainPath;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent drag trigger
                  onNavigate(node.id);
                  onClose();
                }}
                className="cursor-pointer hover:opacity-80"
                style={{ transition: "transform 0.3s" }}
              >
                {/* Node Content Box */}
                <rect
                  x="0"
                  y={-NODE_HEIGHT / 2}
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  rx="4"
                  fill={
                    isCurrent
                      ? "var(--theme-surface-highlight)"
                      : "var(--theme-surface)"
                  }
                  stroke={
                    isCurrent
                      ? "var(--theme-primary)"
                      : isActivePath
                        ? "var(--theme-border)"
                        : "var(--theme-border)"
                  }
                  strokeWidth={isCurrent ? 2 : 1}
                  className="shadow-sm"
                />

                {/* Role Badge */}
                <rect
                  x="0"
                  y={-NODE_HEIGHT / 2}
                  width="4"
                  height={NODE_HEIGHT}
                  rx="2"
                  fill={isModel ? "var(--theme-primary)" : "var(--theme-muted)"}
                  opacity={0.5}
                />

                {/* Text */}
                <foreignObject
                  x="12"
                  y={-NODE_HEIGHT / 2 + 8}
                  width={NODE_WIDTH - 20}
                  height={NODE_HEIGHT - 16}
                >
                  <div className="flex flex-col h-full justify-center pointer-events-none">
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider mb-1 ${isCurrent ? "text-theme-primary" : "text-theme-muted"}`}
                    >
                      {isModel ? t("narrator") : t("you")}
                    </span>
                    <p className="text-[10px] leading-tight text-theme-text line-clamp-2 opacity-80">
                      {node.segment.text}
                    </p>
                  </div>
                </foreignObject>

                {/* Current Indicator Dot */}
                {isCurrent && (
                  <circle
                    cx={NODE_WIDTH}
                    cy="0"
                    r="5"
                    fill="var(--theme-primary)"
                    className="animate-pulse"
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Controls overlay */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        <div className="px-4 py-2 bg-theme-surface-highlight/90 backdrop-blur rounded-full border border-theme-border text-xs text-theme-muted flex items-center gap-4 shadow-xl">
          {/* Navigation Controls */}
          <div className="flex gap-2 border-r border-theme-border pr-4">
            <button
              onClick={() => centerNode(rootNodeId)}
              className="p-2 hover:bg-theme-surface rounded-full hover:text-theme-primary transition-colors"
              title="Go to Start"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                ></path>
              </svg>
            </button>
            <button
              onClick={() => centerNode(activeNodeId)}
              className="p-2 hover:bg-theme-surface rounded-full hover:text-theme-primary transition-colors"
              title="Go to Current"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                ></path>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                ></path>
              </svg>
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex gap-2 items-center">
            <button
              onClick={() => handleZoom(-0.2)}
              className="p-2 hover:bg-theme-surface rounded-full hover:text-theme-primary transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M20 12H4"
                ></path>
              </svg>
            </button>
            <span className="w-8 text-center font-mono opacity-70">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => handleZoom(0.2)}
              className="p-2 hover:bg-theme-surface rounded-full hover:text-theme-primary transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 4v16m8-8H4"
                ></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
