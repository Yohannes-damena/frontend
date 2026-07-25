import type { ReactElement } from 'react'

import { StatusMarkerGlyph, type StatusMarker } from '../../kit/index.ts'
import type { ApiRoomReadiness } from '../../api/types.ts'
import { roomMarker, roomStateLabel } from './overviewFixtures.ts'
import styles from './TenantOverviewPage.module.css'

type ReadinessSpineProps = {
  readonly rooms: readonly ApiRoomReadiness[]
}

function markerToneClass(marker: StatusMarker): string {
  if (marker === 'dot') return styles.markerSuccess
  if (marker === 'ring') return styles.markerWarning
  if (marker === 'cross') return styles.markerDanger
  return styles.markerNeutral
}

export function ReadinessSpine({ rooms }: ReadinessSpineProps): ReactElement {
  return (
    <nav className={styles.spineWrap} aria-label="Room readiness spine">
      <ol className={styles.spineList}>
        {rooms.map((room) => {
          const marker = roomMarker(room)
          return (
            <li key={room.id} className={styles.spineItem}>
              <a
                href={`#room-${room.id}`}
                className={styles.spineSegment}
                aria-label={`Room ${room.storyOrder}. ${room.title}. ${roomStateLabel(room)}. Jump to room details.`}
              >
                <span className={`${styles.segmentOrder} text-caption numeric`}>
                  {room.storyOrder}
                </span>
                <span className={markerToneClass(marker)}>
                  <StatusMarkerGlyph marker={marker} size={12} />
                </span>
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
