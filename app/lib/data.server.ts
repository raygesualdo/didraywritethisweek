import * as fs from 'fs'
import * as path from 'path'
import matter from 'gray-matter'
import yaml from 'js-yaml'
import tempy from 'tempy'
import extract from 'extract-zip'
import { getISOWeek, getISOWeeksInYear, getYear } from 'date-fns'

const YEARS_TO_PROCESS = ['2022'] as const
const CURRENT_WEEK = getISOWeek(new Date())

export enum WeekState {
  Yes = 'y',
  No = 'n',
  Unknown = 'u',
}

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
    response.body?.pipe(filestream)
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
  return entries
}

function deriveWeekStates(
  entriesByYear: EntriesByYear,
  currentWeek: number
): WeekStatesByYear {
  return Object.fromEntries(
    YEARS_TO_PROCESS.map((year) => {
      if (!entriesByYear[year]) return []

      const numOfWeeksInYear = getISOWeeksInYear(new Date(year, 0, 1))
      const weeks = Array.from(
        { length: numOfWeeksInYear - 1 },
        (_, index) => index + 1
      )
      const weeksWithEntries = new Set(
        entriesByYear[year].map((entry) => entry.weekOfYear)
      )

      const yolo = weeks.map((week) => {
        if (week > currentWeek) return WeekState.Unknown
        return weeksWithEntries.has(week) ? WeekState.Yes : WeekState.No
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

let cachedData: DataPayload | undefined

export async function getData() {
  if (cachedData) {
    console.log('DEBUG: Data cache warm. Using cached data.')
    return cachedData
  }

  console.log('DEBUG: Data cache cold. Populating cache.')
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

  cachedData = {
    entriesByYear,
    weekStatesByYear,
    currentWeekState,
  }
  return cachedData
}

export function clearCache() {
  cachedData = undefined
}

function getCurrentWeekState(result: WeekStatesByYear, currentWeek: number) {
  const currentYear = getYear(new Date())
  return result[String(currentYear) as keyof WeekStatesByYear][CURRENT_WEEK - 1]
}
