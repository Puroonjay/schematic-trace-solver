import type { Point } from "@tscircuit/math-utils"
import type { SolvedTracePath } from "../../SchematicTraceLinesSolver/SchematicTraceLinesSolver"
import { getSegmentIntersection } from "@tscircuit/math-utils/line-intersections"

export type CollisionInfo = {
  isColliding: boolean
  collidingTraceId?: string
  collisionPoint?: Point
}

/**
 * Checks if a given path collides with any other traces in a list of solved trace paths.
 * Updated to allow same-net traces to overlap for Bounty #34.
 */
export const isPathColliding = (
  path: Point[],
  allTraces: SolvedTracePath[],
  traceIdToExclude?: string,
): CollisionInfo => {
  if (path.length < 2) {
    return { isColliding: false }
  }

  // Find the trace we are currently evaluating to check its net identity
  const targetTrace = allTraces.find((t) => t.mspPairId === traceIdToExclude)

  for (let i = 0; i < path.length - 1; i++) {
    const pathSegP1 = path[i]
    const pathSegQ1 = path[i + 1]

    for (const existingTrace of allTraces) {
      // Logic for Bounty #34:
      // We skip collision detection if it's the same trace OR if they belong to the same net.
      const isSameNet =
        targetTrace &&
        targetTrace.globalConnNetId !== undefined &&
        targetTrace.globalConnNetId === existingTrace.globalConnNetId

      if (existingTrace.mspPairId === traceIdToExclude || isSameNet) {
        continue // Skip same-net or self-collision check
      }

      for (let j = 0; j < existingTrace.tracePath.length - 1; j++) {
        const existingSegP2 = existingTrace.tracePath[j]
        const existingSegQ2 = existingTrace.tracePath[j + 1]

        const intersectionPoint = getSegmentIntersection(
          pathSegP1,
          pathSegQ1,
          existingSegP2,
          existingSegQ2,
        )

        if (intersectionPoint) {
          return {
            isColliding: true,
            collidingTraceId: existingTrace.mspPairId as string,
            collisionPoint: intersectionPoint,
          }
        }
      }
    }
  }

  return { isColliding: false } // No collision found
}
