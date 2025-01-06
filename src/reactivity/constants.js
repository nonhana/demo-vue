export const RAW = Symbol()
export const ITERATE_KEY = Symbol()
export const MAP_KEY_ITERATE_KEY = Symbol()

// TS 中直接用 enum
export const TriggerType = {
  SET: 'SET',
  ADD: 'ADD',
  DELETE: 'DELETE',
}

// TS 中直接用 enum
export const IterationMethodType = {
  KEY: 'KEY',
  VALUE: 'VALUE',
  PAIR: 'PAIR',
}
