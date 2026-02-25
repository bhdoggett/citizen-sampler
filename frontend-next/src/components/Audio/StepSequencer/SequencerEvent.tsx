import React, { useRef, useState, memo } from "react";
import type { GridEvent } from "./hooks/useSequencerGrid";

type SequencerEventProps = {
  gridEvent: GridEvent;
  cellWidth: number;
  onDelete?: (padId: string, eventIndex: number) => void;
  onDragEnd?: (
    padId: string,
    eventIndex: number,
    newColumnStart: number
  ) => void;
  onResizeEnd?: (
    padId: string,
    eventIndex: number,
    newColumnWidth: number
  ) => void;
  onResizeStartEnd?: (
    padId: string,
    eventIndex: number,
    newColumnStart: number,
    newColumnWidth: number
  ) => void;
  onVelocityChange?: (
    padId: string,
    eventIndex: number,
    velocity: number
  ) => void;
  velocityPaintActive?: boolean;
  onVelocityPaintStart?: () => void;
  ctrlHeld?: boolean;
  isSelected?: boolean;
  snapToGrid?: boolean;
};

const SequencerEvent: React.FC<SequencerEventProps> = memo(({
  gridEvent,
  cellWidth,
  onDelete,
  onDragEnd,
  onResizeEnd,
  onResizeStartEnd,
  onVelocityChange,
  velocityPaintActive = false,
  onVelocityPaintStart,
  ctrlHeld = false,
  isSelected = false,
  snapToGrid = true,
}) => {
  const { columnStart, columnWidth, padId, eventIndex, originalEvent } =
    gridEvent;

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isResizingStart, setIsResizingStart] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [resizeWidth, setResizeWidth] = useState(columnWidth);
  const [resizeStartOffset, setResizeStartOffset] = useState(0);

  const eventRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  // Use refs to track current values during drag/resize (avoids stale closure)
  const dragOffsetRef = useRef(0);
  const resizeWidthRef = useRef(columnWidth);
  const resizeStartOffsetRef = useRef(0);
  // Track if a drag/resize actually occurred (mouse moved) to prevent delete on click
  const didInteractRef = useRef(false);

  // Velocity → HSL: high velocity = darker, more saturated (blue hue ~220)
  const v = Math.max(0, Math.min(1, originalEvent.velocity));
  const lightness = 30 + (1 - v) * 50;
  const saturation = 40 + v * 60;
  const velocityBg = `hsl(220, ${saturation}%, ${lightness}%)`;
  // Constrain velocity bar between a top and bottom margin inside the event
  const velocityMargin = 0.1;
  const clampedMargin = Math.max(0, Math.min(0.45, velocityMargin));
  const barPosition = clampedMargin + (1 - v) * (1 - 2 * clampedMargin);

  const applyVelocityFromClientY = (clientY: number) => {
    if (!onVelocityChange || !eventRef.current) return;
    const rect = eventRef.current.getBoundingClientRect();
    if (rect.height === 0) return;
    const yNorm = (clientY - rect.top) / rect.height;
    const clampedY = Math.max(0, Math.min(1, yNorm));
    const t = Math.max(
      0,
      Math.min(1, (clampedY - clampedMargin) / (1 - 2 * clampedMargin)),
    );
    const newVelocity = 1 - t;
    onVelocityChange(padId, eventIndex, newVelocity);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Only delete if no drag/resize interaction just happened
    if (didInteractRef.current) {
      didInteractRef.current = false;
      return;
    }
    if (onDelete) {
      onDelete(padId, eventIndex);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!onDragEnd) return;
    e.stopPropagation();
    e.preventDefault();

    setIsDragging(true);
    startXRef.current = e.clientX;
    dragOffsetRef.current = 0;
    didInteractRef.current = false;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startXRef.current;
      const deltaColumns = snapToGrid ? Math.round(deltaX / cellWidth) : deltaX / cellWidth;
      if (deltaColumns !== 0) {
        didInteractRef.current = true;
      }
      dragOffsetRef.current = deltaColumns;
      setDragOffset(deltaColumns);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      const dragBase = gridEvent.quantizedColumnStart ?? columnStart;
      const newColumn = snapToGrid
        ? Math.max(0, Math.round(dragBase + dragOffsetRef.current))
        : Math.max(0, dragBase + dragOffsetRef.current);
      if (didInteractRef.current && newColumn !== columnStart) {
        onDragEnd(padId, eventIndex, newColumn);
      }
      dragOffsetRef.current = 0;
      setDragOffset(0);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!onDragEnd) return;
    e.stopPropagation();

    setIsDragging(true);
    startXRef.current = e.touches[0].clientX;
    dragOffsetRef.current = 0;
    didInteractRef.current = false;

    const handleTouchMove = (moveEvent: TouchEvent) => {
      const deltaX = moveEvent.touches[0].clientX - startXRef.current;
      const deltaColumns = snapToGrid ? Math.round(deltaX / cellWidth) : deltaX / cellWidth;
      if (deltaColumns !== 0) {
        didInteractRef.current = true;
      }
      dragOffsetRef.current = deltaColumns;
      setDragOffset(deltaColumns);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      const dragBase = gridEvent.quantizedColumnStart ?? columnStart;
      const newColumn = snapToGrid
        ? Math.max(0, Math.round(dragBase + dragOffsetRef.current))
        : Math.max(0, dragBase + dragOffsetRef.current);
      if (didInteractRef.current && newColumn !== columnStart) {
        onDragEnd(padId, eventIndex, newColumn);
      }
      dragOffsetRef.current = 0;
      setDragOffset(0);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };

    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleTouchEnd);
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (!onResizeEnd) return;
    e.stopPropagation();
    e.preventDefault();

    setIsResizing(true);
    startXRef.current = e.clientX;
    resizeWidthRef.current = columnWidth;
    didInteractRef.current = false;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startXRef.current;
      const deltaColumns = snapToGrid ? Math.round(deltaX / cellWidth) : deltaX / cellWidth;
      const minWidth = snapToGrid ? 1 : 0.25;
      const newWidth = snapToGrid
        ? Math.max(minWidth, Math.round(columnWidth + deltaColumns))
        : Math.max(minWidth, columnWidth + deltaColumns);
      if (newWidth !== columnWidth) {
        didInteractRef.current = true;
      }
      resizeWidthRef.current = newWidth;
      setResizeWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (didInteractRef.current && resizeWidthRef.current !== columnWidth) {
        onResizeEnd(padId, eventIndex, resizeWidthRef.current);
      }
      resizeWidthRef.current = columnWidth;
      setResizeWidth(columnWidth);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleResizeTouchStart = (e: React.TouchEvent) => {
    if (!onResizeEnd) return;
    e.stopPropagation();

    setIsResizing(true);
    startXRef.current = e.touches[0].clientX;
    resizeWidthRef.current = columnWidth;
    didInteractRef.current = false;

    const handleTouchMove = (moveEvent: TouchEvent) => {
      const deltaX = moveEvent.touches[0].clientX - startXRef.current;
      const deltaColumns = snapToGrid ? Math.round(deltaX / cellWidth) : deltaX / cellWidth;
      const minWidth = snapToGrid ? 1 : 0.25;
      const newWidth = snapToGrid
        ? Math.max(minWidth, Math.round(columnWidth + deltaColumns))
        : Math.max(minWidth, columnWidth + deltaColumns);
      if (newWidth !== columnWidth) {
        didInteractRef.current = true;
      }
      resizeWidthRef.current = newWidth;
      setResizeWidth(newWidth);
    };

    const handleTouchEnd = () => {
      setIsResizing(false);
      if (didInteractRef.current && resizeWidthRef.current !== columnWidth) {
        onResizeEnd(padId, eventIndex, resizeWidthRef.current);
      }
      resizeWidthRef.current = columnWidth;
      setResizeWidth(columnWidth);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };

    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleTouchEnd);
  };

  const handleResizeStartMouseDown = (e: React.MouseEvent) => {
    if (!onResizeStartEnd) return;
    e.stopPropagation();
    e.preventDefault();

    setIsResizingStart(true);
    startXRef.current = e.clientX;
    resizeStartOffsetRef.current = 0;
    didInteractRef.current = false;

    const resizeBase = gridEvent.quantizedColumnStart ?? columnStart;
    const rightEdge = snapToGrid
      ? Math.round(resizeBase + columnWidth)
      : resizeBase + columnWidth;
    const minWidth = snapToGrid ? 1 : 0.25;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startXRef.current;
      if (snapToGrid) {
        const deltaColumns = Math.round(deltaX / cellWidth);
        const snappedTarget = Math.round(resizeBase) + deltaColumns;
        const clampedStart = Math.max(0, Math.min(snappedTarget, rightEdge - minWidth));
        const offset = clampedStart - resizeBase;
        if (offset !== 0) {
          didInteractRef.current = true;
        }
        resizeStartOffsetRef.current = offset;
        setResizeStartOffset(offset);
      } else {
        const deltaColumns = deltaX / cellWidth;
        const target = resizeBase + deltaColumns;
        const clampedStart = Math.max(0, Math.min(target, rightEdge - minWidth));
        const offset = clampedStart - resizeBase;
        if (offset !== 0) {
          didInteractRef.current = true;
        }
        resizeStartOffsetRef.current = offset;
        setResizeStartOffset(offset);
      }
    };

    const handleMouseUp = () => {
      setIsResizingStart(false);
      const offset = resizeStartOffsetRef.current;
      if (didInteractRef.current && offset !== 0) {
        const newStart = snapToGrid
          ? Math.round(resizeBase + offset)
          : resizeBase + offset;
        const newWidth = rightEdge - newStart;
        onResizeStartEnd(padId, eventIndex, newStart, newWidth);
      }
      resizeStartOffsetRef.current = 0;
      setResizeStartOffset(0);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleResizeStartTouchStart = (e: React.TouchEvent) => {
    if (!onResizeStartEnd) return;
    e.stopPropagation();

    setIsResizingStart(true);
    startXRef.current = e.touches[0].clientX;
    resizeStartOffsetRef.current = 0;
    didInteractRef.current = false;

    const resizeBase = gridEvent.quantizedColumnStart ?? columnStart;
    const rightEdge = snapToGrid
      ? Math.round(resizeBase + columnWidth)
      : resizeBase + columnWidth;
    const minWidth = snapToGrid ? 1 : 0.25;

    const handleTouchMove = (moveEvent: TouchEvent) => {
      const deltaX = moveEvent.touches[0].clientX - startXRef.current;
      if (snapToGrid) {
        const deltaColumns = Math.round(deltaX / cellWidth);
        const snappedTarget = Math.round(resizeBase) + deltaColumns;
        const clampedStart = Math.max(0, Math.min(snappedTarget, rightEdge - minWidth));
        const offset = clampedStart - resizeBase;
        if (offset !== 0) {
          didInteractRef.current = true;
        }
        resizeStartOffsetRef.current = offset;
        setResizeStartOffset(offset);
      } else {
        const deltaColumns = deltaX / cellWidth;
        const target = resizeBase + deltaColumns;
        const clampedStart = Math.max(0, Math.min(target, rightEdge - minWidth));
        const offset = clampedStart - resizeBase;
        if (offset !== 0) {
          didInteractRef.current = true;
        }
        resizeStartOffsetRef.current = offset;
        setResizeStartOffset(offset);
      }
    };

    const handleTouchEnd = () => {
      setIsResizingStart(false);
      const offset = resizeStartOffsetRef.current;
      if (didInteractRef.current && offset !== 0) {
        const newStart = snapToGrid
          ? Math.round(resizeBase + offset)
          : resizeBase + offset;
        const newWidth = rightEdge - newStart;
        onResizeStartEnd(padId, eventIndex, newStart, newWidth);
      }
      resizeStartOffsetRef.current = 0;
      setResizeStartOffset(0);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };

    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleTouchEnd);
  };

  const handleVelocityBarMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!onVelocityChange || !onVelocityPaintStart) return;
    didInteractRef.current = true;
    onVelocityPaintStart();
    applyVelocityFromClientY(e.clientY);
  };

  const handleVelocityBarTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (!onVelocityChange || !onVelocityPaintStart) return;
    didInteractRef.current = true;
    onVelocityPaintStart();
    applyVelocityFromClientY(e.touches[0].clientY);
  };

  const baseColumn = gridEvent.quantizedColumnStart ?? columnStart;

  const displayColumn = isDragging
    ? snapToGrid
      ? Math.max(0, Math.round(baseColumn + dragOffset))
      : Math.max(0, baseColumn + dragOffset)
    : isResizingStart
      ? baseColumn + resizeStartOffset
      : baseColumn;
  const displayWidth = isResizing
    ? resizeWidth
    : isResizingStart
      ? columnWidth - resizeStartOffset
      : columnWidth;

  return (
    <div
      ref={eventRef}
      className={`absolute top-0.5 bottom-0.5 rounded cursor-pointer transition-colors pointer-events-auto touch-none
        ${isDragging || isResizing || isResizingStart ? "z-10" : "z-5"}
        ${isSelected ? "ring-2 ring-blue-400" : ""}
        ${isDragging ? "opacity-70" : ""}`}
      style={{
        left: `${displayColumn * cellWidth}px`,
        width: `${displayWidth * cellWidth - 2}px`,
        backgroundColor: velocityBg,
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={(e) => {
        if (ctrlHeld && velocityPaintActive) {
          applyVelocityFromClientY(e.clientY);
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
      onTouchStart={handleTouchStart}
    >
      {/* Resize handle on left edge */}
      {onResizeStartEnd && (
        <div
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-300/50 touch-none"
          onMouseDown={handleResizeStartMouseDown}
          onTouchStart={handleResizeStartTouchStart}
        />
      )}
      {/* Resize handle on right edge */}
      {onResizeEnd && (
        <div
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-300/50 touch-none"
          onMouseDown={handleResizeMouseDown}
          onTouchStart={handleResizeTouchStart}
        />
      )}
      {/* Velocity bar: visible when Ctrl held; drag up/down to adjust velocity */}
      {ctrlHeld && onVelocityChange && (
        <div
          className="absolute left-0 right-0 h-0.5 cursor-ns-resize touch-none pointer-events-auto bg-black"
          style={{
            top: `${barPosition * 100}%`,
            transform: "translateY(-50%)",
          }}
          onMouseDown={handleVelocityBarMouseDown}
          onTouchStart={handleVelocityBarTouchStart}
        />
      )}
    </div>
  );
});

SequencerEvent.displayName = "SequencerEvent";

export default SequencerEvent;
