import { reactive, effect } from './reactivity/index.js'

const obj = reactive({ name: 'non_hana', age: 18 })

effect(() => {
  console.log(obj.name)
})

obj.name = 'hana'
