/** Runs isolated suites serially without invoking a shell. */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { repositoryRoot, testsRoot } from './paths.mjs';

const suite = process.argv[2] || 'all';
if (!['all', 'native'].includes(suite)) {
	throw new Error('Unknown suite: ' + suite);
}
const scripts = ['integration.mjs', 'guards.mjs'];
if (suite === 'all') {
	scripts.push('counter-dom.mjs');
}
for (const script of scripts) {
	const child = spawnSync(process.execPath, ['--experimental-wasm-jspi', path.join(testsRoot, script)], {
		cwd: repositoryRoot,
		env: process.env,
		stdio: 'inherit'
	});
	if (child.error) {
		throw child.error;
	}
	if (child.status !== 0) {
		process.exit(child.status || 1);
	}
}
