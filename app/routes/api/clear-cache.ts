import { LoaderFunction } from 'remix'
import { clearCache } from '~/lib/data.server'

export const loader: LoaderFunction = ({ request }) => {
  validateApiKey(request)
  clearCache()
  return new Response('OK')
}

function validateApiKey(request: Request) {
  const url = new URL(request.url)
  const apiKey = url.searchParams.get('apiKey')
  if (apiKey !== process.env.API_KEY) {
    throw new Response('Not Found', { status: 404 })
  }
}
