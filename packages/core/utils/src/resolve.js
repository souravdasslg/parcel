// @flow strict-local

import type {PackageJSON, FilePath, ModuleSpecifier} from '@parcel/types';
import type {ResolveOptions} from 'resolve';
import type {FileSystem} from '@parcel/fs';

// $FlowFixMe TODO: Type promisify
import promisify from './promisify';
import _resolve from 'resolve';
import path from 'path';

const resolveAsync = promisify(_resolve);

export type ResolveResult = {|
  resolved: FilePath | ModuleSpecifier,
  pkg?: ?PackageJSON
|};

async function loadPackage(fs, dir: string) {
  if (await fs.exists(path.join(dir, 'package.json'))) {
    return JSON.parse(
      await fs.readFile(path.join(dir, 'package.json'), 'utf8')
    );
  } else {
    return loadPackage(fs, path.dirname(dir));
  }
}

export async function resolve(
  fs: FileSystem,
  id: string,
  opts?: ResolveOptions
): Promise<ResolveResult> {
  let res;
  if (process.versions.pnp != null) {
    // $FlowFixMe - injected" at runtime
    res = require('pnpapi').resolveRequest(id, opts?.basedir || null, {
      extensions: opts?.extensions,
      considerBuiltins: true
    });
    if (res) {
      res = [res, await loadPackage(fs, path.dirname(res))];
    }
  } else {
    res = await resolveAsync(id, {
      ...opts,
      async readFile(filename, callback) {
        try {
          let res = await fs.readFile(filename);
          callback(null, res);
        } catch (err) {
          callback(err);
        }
      },
      async isFile(file, callback) {
        try {
          let stat = await fs.stat(file);
          callback(null, stat.isFile());
        } catch (err) {
          callback(null, false);
        }
      },
      async isDirectory(file, callback) {
        try {
          let stat = await fs.stat(file);
          callback(null, stat.isDirectory());
        } catch (err) {
          callback(null, false);
        }
      }
    });
  }

  if (typeof res === 'string') {
    return {
      resolved: res
    };
  }

  return {
    resolved: res[0],
    pkg: res[1]
  };
}

export function resolveSync(
  fs: FileSystem,
  id: string,
  opts?: ResolveOptions
): ResolveResult {
  let res;
  if (process.versions.pnp != null) {
    res =
      // $FlowFixMe - injected" at runtime
      require('pnpapi').resolveRequest(
        id,
        opts && opts.basedir != null ? opts.basedir + '/' : null,
        {
          extensions: opts?.extensions,
          considerBuiltins: true
        }
      ) || id;
  } else {
    // $FlowFixMe
    res = _resolve.sync(id, {
      ...opts,
      readFileSync: (...args) => {
        return fs.readFileSync(...args);
      },
      isFile: file => {
        try {
          let stat = fs.statSync(file);
          return stat.isFile();
        } catch (err) {
          return false;
        }
      },
      isDirectory: file => {
        try {
          let stat = fs.statSync(file);
          return stat.isDirectory();
        } catch (err) {
          return false;
        }
      }
    });
  }

  return {
    resolved: res
  };
}
