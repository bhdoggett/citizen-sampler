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
  isSelected?: boolean;
};

const SequencerEvent: React.FC<SequencerEventProps> = memo(({
  gridEvent,
  cellWidth,
  onDelete,
  onDragEnd,
  onResizeEnd,
  onResizeStartEnd,
  isSelected = false,
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

  // Calculate opacity based on velocity
  const velocityOpacity = Math.max(0.4, originalEvent.velocity);

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
      const deltaColumns = Math.round(deltaX / cellWidth);
      if (deltaColumns !== 0) {
        didInteractRef.current = true;
      }
      dragOffsetRef.current = deltaColumns;
      setDragOffset(deltaColumns);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      const newColumn = Math.max(0, columnStart + dragOffsetRef.current);
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
      const deltaColumns = Math.round(deltaX / cellWidth);
      const newWidth = Math.max(1, columnWidth + deltaColumns);
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

  const handleResizeStartMouseDown = (e: React.MouseEvent) => {
    if (!onResizeStartEnd) return;
    e.stopPropagation();
    e.preventDefault();

    setIsResizingStart(true);
    startXRef.current = e.clientX;
    resizeStartOffsetRef.current = 0;
    didInteractRef.current = false;

    // Snap: compute the right edge (anchored) as the nearest integer column
    const rightEdge = Math.round(columnStart + columnWidth);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startXRef.current;
      const deltaColumns = Math.round(deltaX / cellWidth);
      // Target snapped column for the new start
      const snappedTarget = Math.round(columnStart) + deltaColumns;
      // Clamp: can't go before 0 or make width less than 1
      const clampedStart = Math.max(0, Math.min(snappedTarget, rightEdge - 1));
      const offset = clampedStart - columnStart;
      if (offset !== 0) {
        didInteractRef.current = true;
      }
      resizeStartOffsetRef.current = offset;
      setResizeStartOffset(offset);
    };

    const handleMouseUp = () => {
      setIsResizingStart(false);
      const offset = resizeStartOffsetRef.current;
      if (didInteractRef.current && offset !== 0) {
        const newStart = Math.round(columnStart + offset);
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

  const displayColumn = isDragging
    ? Math.max(0, columnStart + dragOffset)
    : isResizingStart
      ? columnStart + resizeStartOffset
      : columnStart;
  const displayWidth = isResizing
    ? resizeWidth
    : isResizingStart
      ? columnWidth - resizeStartOffset
      : columnWidth;

  return (
    <div
      ref={eventRef}
      className={`absolute top-0.5 bottom-0.5 rounded cursor-pointer transition-colors pointer-events-auto
        ${isDragging || isResizing || isResizingStart ? "z-10" : "z-5"}
        ${isSelected ? "ring-2 ring-blue-400" : ""}
        ${isDragging ? "opacity-70" : ""}`}
      style={{
        left: `${displayColumn * cellWidth}px`,
        width: `${displayWidth * cellWidth - 2}px`,
        backgroundColor: `rgba(59, 130, 246, ${velocityOpacity})`,
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
    >
      {/* Resize handle on left edge */}
      {onResizeStartEnd && (
        <div
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-300/50"
          onMouseDown={handleResizeStartMouseDown}
        />
      )}
      {/* Resize handle on right edge */}
      {onResizeEnd && (
        <div
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-300/50"
          onMouseDown={handleResizeMouseDown}
        />
      )}
    </div>
  );
});

SequencerEvent.displayName = "SequencerEvent";

export default SequencerEvent;
