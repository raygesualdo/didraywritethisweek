import { json, LoaderFunction } from '@remix-run/node'
import { getData } from '~/lib/data.server'

export const loader: LoaderFunction = async () => {
  const data = await getData()
  return json(data, {
    headers: {
      'Cache-Control': 'max-age=300',
    },
  })
}
