const views = module.exports = {}

const addAll = (prefix, mod) => {
  for (const k in mod) {
    const path = k === '_' ? prefix : `${prefix}/${k}`
    views[path] = mod[k]
  }
}

addAll('/login', require('./login'))
addAll('/game', require('./game'))

views['404'] = () => '404'



const css = require('sheetify')
css`
  html {
    box-sizing: border-box;
    font-size: 16px;
    font-family: 'Hammersmith One', sans-serif;
  }

  body, h1, h2, h3, h4, h5, h6, p, ol, ul {
    margin: 0;
    padding: 0;
    font-weight: normal;
  }

  ol, ul {
    list-style: none;
  }

  img {
    max-width: 100%;
    height: auto;
  }

`