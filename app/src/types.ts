export type WeekDay = 'sun' | 'mon' | 'tue' | 'wed' | 'thu'

export type EmployeeRole =
  | 'occupational_therapist'
  | 'speech_therapist'
  | 'physiotherapist'
  | 'social_worker'
  | 'art_therapist'

export interface WorkingDay {
  day: WeekDay
  startTime: string // 'HH:mm'
  endTime: string // 'HH:mm'
}

export interface Employee {
  id: string
  firstName: string
  lastName: string
  role: EmployeeRole
  workingHours: WorkingDay[]
  weeklySessionCount: number
}

export interface Room {
  id: string
  name: string
}

export interface Session {
  id: string
  employeeId: string
  roomId: string
  day: WeekDay
  startTime: string // 'HH:mm'
  endTime: string // 'HH:mm'
}

export interface ScheduleConfig {
  dailyFixedPeriods: Array<{
    id: string
    name: string
    startTime: string // 'HH:mm'
    endTime: string // 'HH:mm'
  }>
  sessionMinutes: number
  maxConsecutiveSessions: number
  breakMinutesAfterMax: number
}

export interface AppState {
  employees: Employee[]
  rooms: Room[]
  sessions: Session[]
  config: ScheduleConfig
}


