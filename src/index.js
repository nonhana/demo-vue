import { parse, transform, generate } from './compiler/index.js'

const template1 = `<p>Vue</p>`
const template2 = `<div><p>Vue</p></div>`
const template3 = `<div><p>Vue</p><p>React</p></div>`

const ast = parse(template1)
transform(ast)
const code = generate(ast.jsNode)
console.log(code)
