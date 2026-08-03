import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/trophies')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/trophies"!</div>
}
