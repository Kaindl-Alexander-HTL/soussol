export type MementoKind = 'polaroid' | 'note' | 'stamp' | 'scan' | 'strava' | 'other'

export type Memento = {
  id: string
  kind: MementoKind
  image_url: string | null
  caption: string | null
  body: string | null
  date_label: string | null
  event_id: string | null
  x: number
  y: number
  rotation: number
  scale: number
  z_index: number
  is_visible: boolean
}
