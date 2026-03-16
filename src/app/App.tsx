import { RouterProvider } from 'react-router-dom'
import { appRouter } from './providers/router'

export function App() {
  return <RouterProvider router={appRouter} />
}
