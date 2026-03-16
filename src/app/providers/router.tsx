import { createBrowserRouter } from 'react-router-dom'
import { PlaygroundPage } from '../../pages/playground/ui/PlaygroundPage'

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <PlaygroundPage />,
  },
])
