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
  isSelected?: boolean;
};

const SequencerEvent: React.FC<SequencerEventProps> = memo(({
  gridEvent,
  cellWidth,
  onDelete,
  onDragEnd,
  onResizeEnd,
  isSelected = false,
}) => {
  const { columnStart, columnWidth, padId, eventIndex, originalEvent } =
    gridEvent;

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [resizeWidth, setResizeWidth] = useState(columnWidth);

  const eventRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  // Use refs to track current values during drag/resize (avoids stale closure)
  const dragOffsetRef = useRef(0);
  const resizeWidthRef = useRef(columnWidth);
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

  const displayColumn = isDragging
    ? Math.max(0, columnStart + dragOffset)
    : columnStart;
  const displayWidth = isResizing ? resizeWidth : columnWidth;

  return (
    <div
      ref={eventRef}
      className={`absolute top-0.5 bottom-0.5 rounded cursor-pointer transition-colors pointer-events-auto
        ${isDragging || isResizing ? "z-10" : "z-5"}
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
