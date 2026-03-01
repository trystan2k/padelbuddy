import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export function toProjectFileUrl(relativePath) {
  return pathToFileURL(resolve(process.cwd(), relativePath))
}
