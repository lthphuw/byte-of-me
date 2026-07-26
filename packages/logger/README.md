# @byte-of-me/logger

Tiny structured logger shared across the monorepo. Emits pretty-printed JSON,
colourized per level with `chalk`.

## Usage

```ts
import { logger } from '@byte-of-me/logger';

logger.info('Blog published', { slug, locale });
logger.error('Upload failed', { key, error: getErrorMessage(err) });
```

Each entry carries a `timestamp`, `level`, `message`, a `namespace`, and any
metadata you pass.

## Levels

`debug` < `info` < `warn` < `error` < `silent` — anything below the current level
is dropped.

The default is `debug` in development and `info` in production. Change it at
runtime with `logger.setLogLevel('warn')`; read it back with
`logger.getLogLevel()`.

Need a separate namespace? Construct your own instance:

```ts
import { Logger } from '@byte-of-me/logger';

const log = new Logger('storage');
```

## Notes

- Writes to `console` — on Vercel that lands in the function logs.
- Server-side use only; don't log server context from client components.
