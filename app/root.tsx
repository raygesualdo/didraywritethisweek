import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  ScrollRestoration,
} from '@remix-run/react'
import type { LinksFunction, MetaFunction } from '@remix-run/node'
import stylesheet from '~/tailwind.css'

export const links: LinksFunction = () => {
  return [{ rel: 'stylesheet', href: stylesheet }]
}

export const meta: MetaFunction = () => {
  return [{ title: 'Did Ray write this week?' }]
}

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
        {process.env.NODE_ENV === 'production' && (
          <script
            defer
            data-domain="didraywritethisweek.raygesualdo.com"
            src="https://plausible.io/js/plausible.js"
          ></script>
        )}
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        {process.env.NODE_ENV === 'development' && <LiveReload />}
      </body>
    </html>
  )
}
