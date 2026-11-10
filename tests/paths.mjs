/** Portable test paths; generated state stays outside the distributable plugin. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const testsRoot = path.dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = path.dirname(testsRoot);
export const pluginDirectory = path.resolve(process.env.QUIET_YOAST_PLUGIN_DIR || repositoryRoot);
export const resultsDirectory = path.join(repositoryRoot, 'test-results');
export const cacheDirectory = path.join(repositoryRoot, '.cache', 'test-runtime');

fs.mkdirSync(resultsDirectory, { recursive: true });
if (!fs.existsSync(path.join(pluginDirectory, 'rktsky-quiet-yoast.php'))) {
	throw new Error('Run tests from a repository containing the plugin, or set QUIET_YOAST_PLUGIN_DIR to its directory.');
}
