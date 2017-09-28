const html = require('choo/html')

const Page = exports.Page = (title, head, content) => {
  if (content == null) [head, content] = [null, head]

  return html`<html>
    <head>
      <title>${title}</title>
      <link href="https://fonts.googleapis.com/css?family=Hammersmith+One" rel="stylesheet">
      <link href="bundle.css" rel="stylesheet">
      ${head}
    </head>
    ${content}
  </html>`
}
