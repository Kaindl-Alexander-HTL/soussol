import 'server-only'

export class RequestBodyError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 413
  ) {
    super(message)
  }
}

export async function readJsonBody(request: Request, maxBytes = 16 * 1024): Promise<unknown> {
  const declaredLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new RequestBodyError('Request too large.', 413)
  }

  if (!request.body) throw new RequestBodyError('Invalid request.', 400)

  const reader = request.body.getReader()
  const decoder = new TextDecoder()
  let bytesRead = 0
  let text = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytesRead += value.byteLength
      if (bytesRead > maxBytes) throw new RequestBodyError('Request too large.', 413)
      text += decoder.decode(value, { stream: true })
    }
    text += decoder.decode()
  } finally {
    reader.releaseLock()
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new RequestBodyError('Invalid request.', 400)
  }
}
