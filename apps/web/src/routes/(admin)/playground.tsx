import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(admin)/playground')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/(admin)/playground"!</div>
}
