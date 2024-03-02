import { Fragment } from 'react'
import { useLoaderData } from '@remix-run/react'
import { getData, WeekState } from '~/lib/data.server'

const classMap: Record<WeekState, string> = {
  y: 'bg-green-300',
  n: 'bg-red-300',
  u: 'bg-gray-300',
}

export const loader = async () => {
  const data = await getData()
  return data
}

export default function Index() {
  const data = useLoaderData<typeof loader>()
  return (
    <div className="px-8">
      <h1 className="font-light mt-16 text-5xl text-center">
        Did Ray write this week?
      </h1>
      <h2 className="mb-12 mt-8 text-8xl text-center">
        {data.currentWeekState === 'y' ? 'Yes' : 'No'}
      </h2>
      <div className="mx-auto w-max max-w-full">
        {Object.entries(data.weekStatesByYear)
          .reverse()
          .map(([year, weeks]) => {
            return (
              <Fragment key={year}>
                <h3 className="font-medium first:mt-0 mt-4 mb-1 text-xl">
                  {year}
                </h3>
                <div className="flex gap-1 flex-wrap group">
                  {weeks.map((week, index) => {
                    return (
                      <div
                        key={index}
                        className={`grid place-content-center h-4 rounded w-4 ${classMap[week]}`}
                      >
                        <span className="text-[10px] hidden group-hover:block cursor-default text-slate-700">
                          {index + 1}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </Fragment>
            )
          })}
      </div>
      <div className="absolute left-0 bottom-2 px-2 text-center text-gray-600 text-xs w-full flex flex-col sm:block">
        <span>
          Made with ❤️ by{' '}
          <a
            className="text-blue-600 underline"
            href="https://www.raygesualdo.com"
          >
            Ray Gesualdo
          </a>
        </span>
        <span className="hidden sm:inline"> | </span>
        <span>
          Open sourced on{' '}
          <a
            className="text-blue-600 underline"
            href="https://github.com/raygesualdo/didraywritethisweek"
          >
            GitHub
          </a>
        </span>
        <span className="hidden sm:inline"> | </span>
        <span>
          Analytics responsibly gathered via{' '}
          <a
            className="text-blue-600 underline"
            href="https://plausible.io/didraywritethisweek.raygesualdo.com"
          >
            Plausible
          </a>
        </span>
      </div>
    </div>
  )
}
