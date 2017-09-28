const html = require('choo/html')
const css = require('sheetify')

const {Page} = require('./util')

const prefix = css`
  section {
    max-width: 500px;
    margin: 0 auto;
    background-color: #ccc;
    margin-top: 10em;
    padding: 3em;
    height: 100%;
  }

  :host {}

  :host input {
    font-size: 1.2rem;
    padding: 0.5rem;
    margin-top: 0.5rem;
    border: none;
  }

  input:focus {
    outline: none;
    background-color: #eee;
  }
`

exports['_'] = state => Page('Login', html`<section class=${prefix}>
  <form method=post>
    <label>
      <h1>ENTER YOUR EMAIL ADDRESS, PILOT</h1>
      <input name=email type=email autofocus placeholder="seph@nasa.gov">
    </label>
  </form>
</section>`)