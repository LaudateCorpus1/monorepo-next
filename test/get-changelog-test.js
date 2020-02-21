'use strict';

const { describe, it } = require('./helpers/mocha');
const { expect } = require('./helpers/chai');
const getChangelog = require('../src/get-changelog');
const { promisify } = require('util');
const tmpDir = promisify(require('tmp').dir);
const fixturify = require('fixturify');
const stringifyJson = require('../src/json').stringify;
const exec = promisify(require('child_process').exec);
const { gitInit } = require('git-fixtures');
const path = require('path');
const standardVersion = require('standard-version');

const originalCwd = process.cwd();

describe(getChangelog, function() {
  let tmpPath;

  beforeEach(async function() {
    tmpPath = await tmpDir();

    await gitInit({ cwd: tmpPath });
    await exec('git commit --allow-empty -m "first"', { cwd: tmpPath });
  });

  afterEach(function() {
    process.chdir(originalCwd);
  });

  it('works pre tag', async function() {
    fixturify.writeSync(tmpPath, {
      'packages': {
        'my-app': {
          'package.json': stringifyJson({
            'name': '@scope/my-app',
            'version': '1.0.0',
          }),
        },
      },
      'package.json': stringifyJson({
        'private': true,
        'workspaces': [
          'packages/*',
        ],
      }),
    });

    await exec('git add .', { cwd: tmpPath });
    await exec('git commit -m "chore: release"', { cwd: tmpPath });

    process.chdir(path.join(tmpPath, 'packages/my-app'));

    await standardVersion({
      path: path.join(tmpPath, 'packages/my-app'),
      tagPrefix: '@scope/my-app@',
      firstRelease: true,
    });

    fixturify.writeSync(tmpPath, {
      'packages': {
        'my-app': {
          'index.js': 'foo',
        },
      },
    });

    await exec('git add .', { cwd: tmpPath });
    await exec('git commit -m "fix: foo"', { cwd: tmpPath });

    let changelog = await getChangelog({
      cwd: path.join(tmpPath, 'packages/my-app'),
    });

    expect(changelog).to.include('[1.0.1]');
    expect(changelog).to.include('* foo');
    expect(changelog).to.not.include('[1.0.0]');
  });

  it('works post tag', async function() {
    fixturify.writeSync(tmpPath, {
      'packages': {
        'my-app': {
          'package.json': stringifyJson({
            'name': '@scope/my-app',
            'version': '1.0.0',
          }),
        },
      },
      'package.json': stringifyJson({
        'private': true,
        'workspaces': [
          'packages/*',
        ],
      }),
    });

    await exec('git add .', { cwd: tmpPath });
    await exec('git commit -m "chore: release"', { cwd: tmpPath });

    process.chdir(path.join(tmpPath, 'packages/my-app'));

    await standardVersion({
      path: path.join(tmpPath, 'packages/my-app'),
      tagPrefix: '@scope/my-app@',
      firstRelease: true,
    });

    fixturify.writeSync(tmpPath, {
      'packages': {
        'my-app': {
          'index.js': 'foo',
        },
      },
    });

    await exec('git add .', { cwd: tmpPath });
    await exec('git commit -m "fix: foo"', { cwd: tmpPath });

    await standardVersion({
      path: path.join(tmpPath, 'packages/my-app'),
      tagPrefix: '@scope/my-app@',
    });

    let changelog = await getChangelog({
      cwd: path.join(tmpPath, 'packages/my-app'),
    });

    expect(changelog).to.include('[1.0.1]');
    expect(changelog).to.include('* foo');
    expect(changelog).to.not.include('[1.0.0]');
  });
});