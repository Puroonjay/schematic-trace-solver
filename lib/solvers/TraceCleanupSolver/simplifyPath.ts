import type { Point } from "graphics-debug"
import {
  isHorizontal,
  isVertical,
} from "lib/solvers/SchematicTraceLinesSolver/SchematicTraceSingleLineSolver2/collisions"

/**
 * Robustly simplifies a PCB trace path to ensure all lines are perfectly
 * horizontal or vertical, avoiding "crinks" while preserving component connections.
 * * This version uses the epsilon/threshold method but adds absolute protection
 * for the final segment to ensure vertical/horizontal entries are never lost.
 */
export const simplifyPath = (path: Point[], threshold = 0.1): Point[] => {
  // If the path is just a direct connection, keep it as is
  if (path.length <= 2) return [...path]

  // Pass 1: Snapping logic (The Epsilon Method)
  // We snap points to match the previous point's axes if they are within threshold.
  const snappedPath: Point[] = [path[0]]
  const lastIdx = path.length - 1

  for (let i = 1; i < path.length; i++) {
    const prev = snappedPath[snappedPath.length - 1]
    const current = { ...path[i] }

    // CRITICAL: If we are at the very last point, do NOT snap it to the previous point.
    // Instead, if the segment is slightly off, snap the PREVIOUS point to match the LAST point's axis.
    // This ensures the connection line exists and is vertical/horizontal.
    const isLastPoint = i === lastIdx

    if (!isLastPoint) {
      if (Math.abs(current.x - prev.x) < threshold) current.x = prev.x
      if (Math.abs(current.y - prev.y) < threshold) current.y = prev.y
    } else {
      // For the last point, if the segment is "almost" vertical/horizontal,
      // we modify the previous point in the snapped list to align with the destination.
      if (Math.abs(current.x - prev.x) < threshold) prev.x = current.x
      if (Math.abs(current.y - prev.y) < threshold) prev.y = current.y
    }

    // Only add if it's a unique coordinate or the final mandatory endpoint
    if (current.x !== prev.x || current.y !== prev.y || isLastPoint) {
      snappedPath.push(current)
    }
  }

  // Pass 2: Vertical/Horizontal Force
  // Ensure every single segment in the snapped path is strictly orthogonal.
  for (let i = 0; i < snappedPath.length - 1; i++) {
    const p1 = snappedPath[i]
    const p2 = snappedPath[i + 1]

    // If a segment is slanted, snap it to the dominant axis
    if (p1.x !== p2.x && p1.y !== p2.y) {
      if (Math.abs(p2.x - p1.x) < Math.abs(p2.y - p1.y)) {
        p2.x = p1.x
      } else {
        p2.y = p1.y
      }
    }
  }

  // Pass 3: Collinear Point Removal (Pruning)
  // Remove points that lie on a straight line between two others.
  const result: Point[] = [snappedPath[0]]

  for (let i = 1; i < snappedPath.length - 1; i++) {
    const p1 = result[result.length - 1]
    const p2 = snappedPath[i]
    const p3 = snappedPath[i + 1]

    // A turn is only necessary if the direction changes
    const isRedundant =
      (isHorizontal(p1, p2) && isHorizontal(p2, p3)) ||
      (isVertical(p1, p2) && isVertical(p2, p3))

    if (!isRedundant) {
      // Ensure we don't accidentally merge distinct points
      if (p2.x !== p1.x || p2.y !== p1.y) {
        result.push(p2)
      }
    }
  }

  // Final safeguard: Always append the destination
  const finalDest = snappedPath[snappedPath.length - 1]
  const currentEnd = result[result.length - 1]

  if (finalDest.x !== currentEnd.x || finalDest.y !== currentEnd.y) {
    result.push(finalDest)
  }

  return result
}
