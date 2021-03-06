const views = require('../views')
const html = require('choo/html')
const choo = require('choo')
const json = require('ot-json1').type
const css = require('sheetify')

const app = choo()

// app.use(require('choo-log')())

// Rerender every second, if on screen.
app.use((state, emitter) => {
  setInterval(() => {
    if (!document.hidden) emitter.emit('render')
  }, 1000)
  window.onfocus = () => emitter.emit('render')
})

const objMap = (obj, fn) => Object.keys(obj).sort().map(k => fn(obj[k], k))


const workStyle = css`
  :host {
    background-color: black;
    width: 600px;
  }

  :host > div {
    background-color: red;
    margin: 2px;
  }
`

const pct = val => Math.max(Math.min(Math.round(val * 100), 100), 0)

const Work = (work) => html`
  <div class="${workStyle}">
    <div style="width: ${pct((Date.now() - work.startedAt) / (work.runAt - work.startedAt))}%">
      Work unit ${work.title} ${work.state === 'complete' ? 'complete' : null}
    </div>
  </div>

`

const MainView = game => html`
<div>
  ${objMap(game.work, Work)}
</div>`

// const connectedClass = css`
//   :host {
//     padding: 0.3rem;
//     color: white;
//     background-color: green;
//     border-radius: 3px;
//   }
// `
const disconnectedClass = css`
  :host {
    padding: 0.3rem;
    color: white;
    border-radius: 3px;
    background-color: red;
  }
`

app.route('/game', ({game, connected}) => html`
  <body>
    ${!connected ? html`<div style='margin: 1rem; float: right;'>
      <span class=${disconnectedClass}>Disconnected</span>
    </div>` : null}
    ${game ? MainView(game) : 'Loading...'}
  </body>
`)

app.mount('body')

const onGameUpdated = () => {
  console.log('game updated', app.state.game)
  app.emitter.emit('render')
}

window.app = app

const setConnected = (status) => {
  app.state.connected = status
  app.emitter.emit('render')
}

const gameReady = new Promise((resolve, reject) => {
  const connect = () => {

    const ws = new WebSocket(`ws://localhost:2345/game?id=${__INITIALUSER.currentGame}`)

    let state = 'initial'
    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data)
      if (state === 'initial') {
        const game = data
        app.state.game = game
        resolve(game)
        state = 'ops'
      } else if (state === 'ops') {
        app.state.game = json.apply(app.state.game, data)
        console.log('applied op', data)
      }
      onGameUpdated()
    }
    ws.onopen = () => {
      setConnected(true)
    }
    ws.onclose = () => {
      setConnected(false)
      console.log('ws closed')
      setTimeout(connect, 2000)
    }
  }
  setConnected(false)
  connect()
})

