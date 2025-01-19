import { tokenize, parse, dump, transform } from './compiler/index.js'

const template1 = `<p>Vue</p>`
const template2 = `<div><p>Vue</p></div>`
const template3 = `<div><p>Vue</p><p>React</p></div>`

// console.log(JSON.stringify(parse(template3), '', 2))
const ast = parse(template3)
transform(ast)
