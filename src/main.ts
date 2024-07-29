#!/usr/bin/env node

import chalk from 'chalk';
import * as fs from 'fs/promises';
import { execa } from 'execa';

function log(s: unknown) {
  // eslint-disable-next-line no-console
  console.log(s);
}

function logError(s: unknown) {
  return log(chalk.red(s));
}

function printError(err: unknown) {
  if (err instanceof Error) {
    logError(err.message);
  } else {
    logError(`${err}`);
  }
}

async function getDirNames(source: string) {
  return (await fs.readdir(source, { withFileTypes: true }))
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
}

async function hasUncommittedChanges(dir: string) {
  try {
    const { stdout } = await execa('git', ['status', '--porcelain'], { cwd: dir });
    return stdout !== '';
  } catch (err) {
    return true;
  }
}

async function isGitRepo(dir: string) {
  try {
    await execa('git', ['rev-parse', '--is-inside-work-tree'], { cwd: dir });
    return true;
  } catch (err) {
    return false;
  }
}

async function hasUnpushedChanges(dir: string) {
  const { stdout } = await execa('git', ['cherry', '-v'], { cwd: dir });
  return stdout !== '';
}

async function scanDir(dir: string) {
  try {
    const isGit = await isGitRepo(dir);
    if (!isGit) {
      return;
    }
    const uncommittedChanges = await hasUncommittedChanges(dir);
    if (uncommittedChanges) {
      log(` 🔴 ${dir} has uncommitted changes`);
      return;
    }
    const unpushedChanges = await hasUnpushedChanges(dir);
    if (unpushedChanges) {
      log(` 🟠 ${dir} has unpushed changes`);
    }
  } catch (err) {
    logError(`Error scanning ${dir}: ${err}`);
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
  try {
    const cwd = process.cwd();
    log(`>> Scanning ${cwd}`);
    const dirNames = await getDirNames(cwd);
    await Promise.all(dirNames.map((dir) => scanDir(dir)));
  } catch (err) {
    printError(err);
  }
})();
