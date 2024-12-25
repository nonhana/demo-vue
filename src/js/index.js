import { ref, computed, watch } from './responsiveData.js'

const obj = ref({ num1: 1, num2: 2 })

watch(
  obj,
  (newV, oldV) => {
    console.log('obj newV: ' + JSON.stringify(newV))
    console.log('obj oldV: ' + JSON.stringify(oldV))
  },
  { immediate: true }
)

const totalCount = computed(() => obj.num1 + obj.num2)

watch(
  totalCount,
  (newV, oldV) => {
    console.log('totalCount newV: ' + JSON.stringify(newV))
    console.log('totalCount oldV: ' + JSON.stringify(oldV))
  },
  { immediate: true }
)

obj.num1++
obj.num1++
obj.num1++
obj.num1++
obj.num1++
obj.num1++
