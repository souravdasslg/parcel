// @flow strict-local
import type {FileSystem} from '@parcel/fs';

import path from 'path';

export default async function findPackageFolder(fs: FileSystem, start: string) {
  // Find the nearest package.json file within the current node_modules folder
  let dir = start;
  let root = path.parse(dir).root;
  while (dir !== root && path.basename(dir) !== 'node_modules') {
    if (await fs.exists(path.join(dir, 'package.json'))) {
      return dir;
    }

    dir = path.dirname(dir);
  }

  return null;
}
