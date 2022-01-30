import { Fragment } from 'react'
import { json, LoaderFunction, useLoaderData } from 'remix'
import { DataPayload, getData, WeekState } from '~/lib/data.server'

const classMap: Record<WeekState, string> = {
  y: 'bg-green-300',
  n: 'bg-red-300',
  u: 'bg-gray-300',
}

export const loader: LoaderFunction = async () => {
  const data = await getData()
  return json(data)
}

export default function Index() {
  const data = useLoaderData<DataPayload>()
  return (
    <div className="px-8">
      <h1 className="font-light mt-16 text-5xl text-center">
        Did Ray write this week?
      </h1>
      <h2 className="mb-16 mt-8 text-8xl text-center">
        {data.currentWeekState === 'y' ? 'Yes' : 'No'}
      </h2>
      <div className="mx-auto w-max max-w-full">
        {Object.entries(data.weekStatesByYear).map(([year, weeks]) => {
          return (
            <Fragment key={year}>
              <h3 className="font-medium mb-2 text-xl">{year}</h3>
              <div className="flex gap-1 flex-wrap">
                {weeks.map((week, index) => {
                  return (
                    <div
                      key={index}
                      className={`h-4 rounded w-4 ${classMap[week]}`}
                    />
                  )
                })}
              </div>
            </Fragment>
          )
        })}
      </div>
      <div className="absolute bottom-2 px-2 text-center text-gray-600 text-xs w-full">
        Made with ❤️ by{' '}
        <a
          className="text-blue-600 underline"
          href="https://www.raygesualdo.com"
        >
          Ray Gesualdo
        </a>{' '}
        | Open sourced on{' '}
        <a
          className="text-blue-600 underline"
          href="https://github.com/raygesualdo/didraywritethisweek"
        >
          GitHub
        </a>
      </div>
    </div>
  )
}
