import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/cplay')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/cplay"!</div>
}
