import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(admin)/website')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/(admin)/website"!</div>
}
