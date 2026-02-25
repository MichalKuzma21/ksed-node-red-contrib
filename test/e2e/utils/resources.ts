import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { FileSystem } from '@effect/platform';
import { Effect } from 'effect';

const getResourcePath = (resourcePath: string) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  return join(__dirname, '..', 'resources', resourcePath);
};

export const loadResource = (resourcePath: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    return yield* fs.readFileString(getResourcePath(resourcePath), 'utf8');
  });
