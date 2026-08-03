import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/online')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/online"!</div>
}
