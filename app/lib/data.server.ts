import * as fs from 'fs'
import * as path from 'path'
import matter from 'gray-matter'
import yaml from 'js-yaml'
import tempy from 'tempy'
import extract from 'extract-zip'
import { getISOWeek, getISOWeeksInYear, getYear } from 'date-fns'

const YEARS_TO_PROCESS = ['2022'] as const

export const WeekStateEnum = {
  Yes: 'y',
  No: 'n',
  Unknown: 'u',
} as const

export type WeekState = typeof WeekStateEnum[keyof typeof WeekStateEnum]

interface Entry {
  date: string
  year: string
  weekOfYear: number
}

type EntriesByYear = Record<string, Entry[]>

type WeekStatesByYear = Record<typeof YEARS_TO_PROCESS[number], WeekState[]>

async function downloadFile(url: string, filepath: string) {
  const response = await fetch(url)
  const filestream = fs.createWriteStream(filepath)
  return new Promise((resolve, reject) => {
    // @ts-expect-error Types for `Response.body` aren't quite right
    response.body?.pipe(filestream)
    // @ts-expect-error Types for `Response.body` aren't quite right
    response.body?.on('error', reject)
    filestream.on('finish', resolve)
  })
}

const betterMatter = (input: string) => {
  return matter(input, {
    engines: {
      yaml: (s) => yaml.load(s, { schema: yaml.JSON_SCHEMA }) as object,
    },
  })
}

function parseDate(date: string) {
  const match = date.match(/(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/)

  return {
    year: match?.groups?.year ?? '',
    month: match?.groups?.month ?? '',
    day: match?.groups?.day ?? '',
  }
}

async function getEntries() {
  let entries: Entry[]
  await tempy.directory.task(async (tempPath) => {
    const archivePath = path.join(tempPath, 'archive.zip')
    const unzippedArchivePath = path.join(tempPath, 'archive')
    await downloadFile(
      'https://github.com/raygesualdo/raygesualdo.com/archive/refs/heads/main.zip',
      archivePath
    )
    await extract(archivePath, { dir: unzippedArchivePath })
    const blogPostsPath = path.join(
      unzippedArchivePath,
      'raygesualdo.com-main',
      'content',
      'posts'
    )
    entries = fs
      .readdirSync(blogPostsPath)
      .map((filePath) =>
        fs.readFileSync(path.join(blogPostsPath, filePath), 'utf-8')
      )
      .map((markdown) => (betterMatter(markdown).data.date as string) ?? '')
      .filter(Boolean)
      .map((date) => {
        const { year } = parseDate(date)
        return { date, year, weekOfYear: getISOWeek(new Date(date)) }
      })
  })
  // @ts-expect-error Assigning `entries` in the tempy task doesn't sit well with TS
  return entries
}

function deriveWeekStates(
  entriesByYear: EntriesByYear,
  currentWeek: number
): WeekStatesByYear {
  return Object.fromEntries(
    YEARS_TO_PROCESS.map((year) => {
      if (!entriesByYear[year]) return []

      const numOfWeeksInYear = getISOWeeksInYear(
        new Date(Number.parseInt(year, 10), 0, 1)
      )
      const weeks = Array.from(
        { length: numOfWeeksInYear - 1 },
        (_, index) => index + 1
      )
      const weeksWithEntries = new Set(
        entriesByYear[year].map((entry) => entry.weekOfYear)
      )

      const yolo = weeks.map((week) => {
        if (week > currentWeek) return WeekStateEnum.Unknown
        return weeksWithEntries.has(week) ? WeekStateEnum.Yes : WeekStateEnum.No
      })

      return [year, yolo]
    })
  )
}

export interface DataPayload {
  entriesByYear: EntriesByYear
  weekStatesByYear: WeekStatesByYear
  currentWeekState: WeekState
}

const cache = new Map<string, DataPayload>()
const cacheKey = 'data'

export async function getData() {
  if (cache.has(cacheKey)) {
    console.log('CACHE: Data cache warm. Using cached data.')
    return cache.get(cacheKey)
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

  const currentWeek = getISOWeek(new Date())
  const weekStatesByYear = deriveWeekStates(entriesByYear, currentWeek)
  const currentWeekState = getCurrentWeekState(weekStatesByYear, currentWeek)

  cache.set(cacheKey, {
    entriesByYear,
    weekStatesByYear,
    currentWeekState,
  })
  return cache.get(cacheKey)
}

export function clearCache() {
  console.log('CACHE: Clearing cache.')
  cache.delete(cacheKey)
}

function getCurrentWeekState(result: WeekStatesByYear, currentWeek: number) {
  const currentYear = getYear(new Date())
  return result[String(currentYear) as keyof WeekStatesByYear][currentWeek - 1]
}
