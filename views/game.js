const html = require('choo/html')
const css = require('sheetify')
const {Page} = require('./util')
const jsesc = require('jsesc')

const raw = require('choo/html/raw')

  // const __GAME = ${raw(jsesc(state.game))}
exports['_'] = state => Page('Game', html`<script>
  const __INITIALUSER = ${raw(jsesc(state.user))}
</script>`, html`
  <div>
    Loading...
    <script src="bundle.js"></script>
  </div>
`)