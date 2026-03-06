import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(admin)/questions')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/(admin)/qa"!</div>
}
