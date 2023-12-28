import Parser from 'rss-parser'
import { getISOWeek, getISOWeeksInYear, getYear } from 'date-fns'

const YEARS_TO_PROCESS = ['2022', '2023', '2024'] as const
const parser = new Parser()

export const WeekStateEnum = {
  Yes: 'y',
  No: 'n',
  Unknown: 'u',
} as const

export type WeekState = (typeof WeekStateEnum)[keyof typeof WeekStateEnum]

interface Entry {
  date: string
  year: string
  weekOfYear: number
}

type EntriesByYear = Record<string, Entry[]>

type WeekStatesByYear = Record<(typeof YEARS_TO_PROCESS)[number], WeekState[]>

function parseDate(date: string) {
  const match = date.match(/(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/)

  return {
    year: match?.groups?.year ?? '',
    month: match?.groups?.month ?? '',
    day: match?.groups?.day ?? '',
  }
}

async function getEntries() {
  const feed = await parser.parseURL('https://www.raygesualdo.com/rss.xml')
  const entries = feed.items.map((item) => {
    const date = item.isoDate?.slice(0, 10) ?? ''
    const { year } = parseDate(date)
    return { date, year, weekOfYear: getISOWeek(new Date(date)) }
  })
  return entries
}

function deriveWeekStates(
  entriesByYear: EntriesByYear,
  currentWeek: number
): WeekStatesByYear {
  // @ts-expect-error - TS doesn't understand the resulting object's keys will be `YEARS_TO_PROCESS`
  return Object.fromEntries(
    YEARS_TO_PROCESS.map((year) => {
      const numOfWeeksInYear = getISOWeeksInYear(
        new Date(Number.parseInt(year, 10), 0, 1)
      )
      const weeksWithEntries = new Set(
        entriesByYear[year]?.map((entry) => entry.weekOfYear) ?? []
      )

      const weeks = Array.from({ length: numOfWeeksInYear - 1 }, (_, index) => {
        const week = index + 1
        if (week > currentWeek) return WeekStateEnum.Unknown
        return weeksWithEntries.has(week) ? WeekStateEnum.Yes : WeekStateEnum.No
      })

      return [year, weeks]
    })
  )
}

export interface DataPayload {
  entriesByYear: EntriesByYear
  weekStatesByYear: WeekStatesByYear
  currentWeekState: WeekState
}

type CachedDataPayload = Pick<DataPayload, 'entriesByYear'>

const cache = new Map<string, CachedDataPayload>()
const cacheKey = 'data'

export async function getData(): Promise<DataPayload> {
  if (cache.has(cacheKey)) {
    console.log('CACHE: Data cache warm. Using cached data.')
    return generateDataPayload(cache.get(cacheKey)!)
  }

  console.log('CACHE: Data cache cold. Populating cache.')
  const entries = await getEntries()
  const entriesByYear = entries.reduce((acc, item) => {
    if (acc[item.year]) {
      acc[item.year].push(item)
    } else {
      acc[item.year] = [item]
    }

    return acc
  }, {} as EntriesByYear)

  cache.set(cacheKey, {
    entriesByYear,
  })
  return generateDataPayload(cache.get(cacheKey)!)
}

function generateDataPayload({
  entriesByYear,
}: CachedDataPayload): DataPayload {
  const currentWeek = getISOWeek(new Date())
  const weekStatesByYear = deriveWeekStates(entriesByYear, currentWeek)
  const currentWeekState = getCurrentWeekState(weekStatesByYear, currentWeek)

  return {
    entriesByYear,
    weekStatesByYear,
    currentWeekState,
  }
}

export function clearCache() {
  console.log('CACHE: Clearing cache.')
  cache.delete(cacheKey)
}

function getCurrentWeekState(result: WeekStatesByYear, currentWeek: number) {
  const currentYear = getYear(new Date())
  return result[String(currentYear) as keyof WeekStatesByYear]?.[
    currentWeek - 1
  ]
}
