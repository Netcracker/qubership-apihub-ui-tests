import type { ReadStream } from 'fs'

/**
 * playwright-core declares `export type Serializable = any` in types/structs.d.ts. That file is
 * not published by the package's `exports` map - only types/types.d.ts is, and it imports
 * Serializable without re-exporting it - so the name is genuinely internal to playwright rather
 * than merely unreachable. `moduleResolution: node` ignored the exports map and let the deep
 * import through; `bundler` does not.
 *
 * Declared locally rather than reached for through a paths mapping, which is what the other two
 * cases of this in the fleet needed. Those packages named a .d.ts in "types" and simply failed to
 * expose it, so pointing at the shipped file recovered real type information. Here the upstream
 * type is `any`, so there is nothing to recover: this alias is the identical contract without the
 * boundary violation.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Serializable = any

export type PostOptions = {
  /**
   * Allows to set post data of the request. If the data parameter is an object, it will be serialized to json string
   * and `content-type` header will be set to `application/json` if not explicitly set. Otherwise, the `content-type`
   * header will be set to `application/octet-stream` if not explicitly set.
   */
  data?: string | Buffer | Serializable

  /**
   * Whether to throw on response codes other than 2xx and 3xx. By default, response object is returned for all status
   * codes.
   */
  failOnStatusCode?: boolean

  /**
   * Provides an object that will be serialized as html form using `application/x-www-form-urlencoded` encoding and sent
   * as this request body. If this parameter is specified `content-type` header will be set to
   * `application/x-www-form-urlencoded` unless explicitly provided.
   */
  form?: { [key: string]: string | number | boolean }

  /**
   * Allows to set HTTP headers. These headers will apply to the fetched request as well as any redirects initiated by
   * it.
   */
  headers?: { [key: string]: string }

  /**
   * Whether to ignore HTTPS errors when sending network requests. Defaults to `false`.
   */
  ignoreHTTPSErrors?: boolean

  /**
   * Maximum number of request redirects that will be followed automatically. An error will be thrown if the number is
   * exceeded. Defaults to `20`. Pass `0` to not follow redirects.
   */
  maxRedirects?: number

  /**
   * Provides an object that will be serialized as html form using `multipart/form-data` encoding and sent as this
   * request body. If this parameter is specified `content-type` header will be set to `multipart/form-data` unless
   * explicitly provided. File values can be passed either as
   * [`fs.ReadStream`](https://nodejs.org/api/fs.html#fs_class_fs_readstream) or as file-like object containing file
   * name, mime-type and its content.
   */
  multipart?: {
    [key: string]: string | number | boolean | ReadStream | {
      /**
       * File name
       */
      name: string

      /**
       * File type
       */
      mimeType: string

      /**
       * File content
       */
      buffer: Buffer
    }
  }

  /**
   * Query parameters to be sent with the URL.
   */
  params?: { [key: string]: string | number | boolean }

  /**
   * Request timeout in milliseconds. Defaults to `30000` (30 seconds). Pass `0` to disable timeout.
   */
  timeout?: number
}
