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

export type MemberRole = 'surrounding' | 'outer' | 'inner'

export type Member = {
  id: string
  name: string
  email: string
  role: MemberRole
  access_token: string
  is_active: boolean
  created_at: string
}

export type ApplicationStatus = 'pending' | 'approved' | 'rejected'

export type Application = {
  id: string
  name: string
  email: string
  message: string | null
  status: ApplicationStatus
  created_at: string
}
