import { getISOWeek, getISOWeeksInYear, getYear } from 'date-fns'

const YEARS_TO_PROCESS = ['2022', '2024'] as const

export const WeekStateEnum = {
  Yes: 'y',
  No: 'n',
  Unknown: 'u',
} as const

export type WeekState = (typeof WeekStateEnum)[keyof typeof WeekStateEnum]

interface Entry {
  date: string
  year: string
}

type EntriesByYear = Record<string, Entry[]>

type WeekStatesByYear = Record<(typeof YEARS_TO_PROCESS)[number], WeekState[]>

async function getEntries() {
  const dates = (await (
    await fetch('https://www.raygesualdo.com/api/publish-dates.json')
  ).json()) as string[]
  const entries = dates.map((date) => {
    const [year = ''] = date.split('-')
    return { date, year }
  })
  return entries
}

function deriveWeekStates(
  entriesByYear: EntriesByYear,
  currentWeek: number,
  currentYear: string
): WeekStatesByYear {
  // @ts-expect-error - TS doesn't understand the resulting object's keys will be `YEARS_TO_PROCESS`
  return Object.fromEntries(
    YEARS_TO_PROCESS.map((year) => {
      const numOfWeeksInYear = getISOWeeksInYear(
        new Date(Number.parseInt(year, 10), 0, 1)
      )
      const weeksWithEntries = new Set(
        entriesByYear[year]?.map((entry) => getISOWeek(new Date(entry.date)))
      )
      const weeks = Array.from({ length: numOfWeeksInYear - 1 }, (_, index) => {
        if (year > currentYear) return WeekStateEnum.Unknown
        const week = index + 1
        if (week > currentWeek && year === currentYear)
          return WeekStateEnum.Unknown
        return weeksWithEntries.has(week) ? WeekStateEnum.Yes : WeekStateEnum.No
      })

      return [year, weeks]
    })
  )
}

export interface DataPayload {
  weekStatesByYear: WeekStatesByYear
  currentWeekState: WeekState
}

export async function getData(): Promise<DataPayload> {
  const entries = await getEntries()
  const entriesByYear = entries.reduce<EntriesByYear>((acc, item) => {
    acc[item.year] ??= []
    acc[item.year].push(item)
    return acc
  }, {})
  return generateDataPayload(entriesByYear)
}

function generateDataPayload(entriesByYear: EntriesByYear): DataPayload {
  const currentWeek = getISOWeek(new Date())
  const currentYear = String(getYear(new Date()))
  const weekStatesByYear = deriveWeekStates(
    entriesByYear,
    currentWeek,
    currentYear
  )
  const currentWeekState = getCurrentWeekState(
    weekStatesByYear,
    currentWeek,
    currentYear
  )

  return {
    weekStatesByYear,
    currentWeekState,
  }
}

function getCurrentWeekState(
  result: WeekStatesByYear,
  currentWeek: number,
  currentYear: string
) {
  return result[currentYear as keyof WeekStatesByYear]?.[currentWeek - 1]
}
