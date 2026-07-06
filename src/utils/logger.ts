//* Package Imports
import pino from 'pino'

export const logger = pino(
  pino.destination({
    dest: '../../logs.log',
    mkdir: true,
    sync: false
  })
)
