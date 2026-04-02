import { Hono } from 'hono'
import { upgradeWebSocket, websocket } from 'hono/bun'
import { html } from 'hono/html'

const app = new Hono()

const ws = app.get(
'/ws',
upgradeWebSocket((c) => {
let intervalId
return {
onOpen(\_event, ws) {
intervalId = setInterval(() => {
ws.send(new Date().toString())
}, 200)
},
onClose() {
clearInterval(intervalId)
},
}
})
)

export default {
fetch: app.fetch,
websocket,
}
