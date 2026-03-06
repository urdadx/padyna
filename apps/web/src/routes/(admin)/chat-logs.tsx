import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(admin)/chat-logs')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/(admin)/chat-logs"!</div>
}
