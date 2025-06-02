// Based on MIT Licenced code from SvelteLab
// https://github.com/SvelteLab/SvelteLab/blob/a3fb823356a9ed1d16eb8535340c9813b7eb547d/src/lib/stores/editor_errors_store.ts#L19
// https://github.com/SvelteLab/SvelteLab/blob/a3fb823356a9ed1d16eb8535340c9813b7eb547d/src/lib/webcontainer.ts#L301

import { readFile } from 'node:fs/promises';
import { setFailed } from '@actions/core';
import * as core from '@actions/core';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import exec from 'nanoexec';
import { z } from 'zod';

const diagnosticSchema = z.object({
	type: z
		.string()
		.toLowerCase()
		.refine((type): type is 'error' | 'warning' => ['error', 'warning'].includes(type)),
	filename: z.string().transform((filename) => `./${filename}`),
	start: z.object({
		line: z.number().transform((line) => line + 1),
		character: z.number(),
	}),
	end: z.object({
		line: z.number().transform((line) => line + 1),
		character: z.number(),
	}),
	message: z.string(),
	code: z.union([z.number(), z.string()]).optional(),
	source: z.string().optional(),
});

type RawDiagnostic = z.infer<typeof diagnosticSchema>;

/**
 * A svelte-check diagnostic provides an issue in the codebase
 * patched to include an aboslute file path
 */
export interface Diagnostic extends Omit<RawDiagnostic, 'filename'> {
	fileName: string;
	path: string;
}

/**
 * Run svelte-check at a given directory and return all the issues it finds
 * @param cwd The directory to run svelte-check in
 * @returns Diagnostics
 */
export async function get_diagnostics(cwd: string) {
	await try_run_svelte_kit_sync(cwd);

	const result = await exec('npx', ['-y', 'svelte-check@4', '--output=machine-verbose'], {
		shell: true,
		cwd,
	});

	if (result.code != null && result.code > 1) {
		console.error('Failed to run svelte-check', result.stderr.toString());
		setFailed(`Failed to run svelte-check: "${result.stderr}"`);
		process.exit(1);
	}

	const diagnostics: Diagnostic[] = [];

	for (const line of result.stdout.toString().split('\n')) {
		const tail = line.trim().slice(line.indexOf(' ') + 1);

		if (tail.length === 0 || tail.startsWith('START') || tail.startsWith('COMPLETED')) {
			// We don't need empty lines, or the start/end lines
			continue;
		}

		try {
			const raw = JSON.parse(tail);
			const { filename, ...diagnostic } = diagnosticSchema.parse(raw);

			diagnostics.push({
				...diagnostic,
				fileName: filename,
				path: join(cwd, filename),
			});
		} catch (e) {
			core.startGroup('failed to parse a diagnostic');
			console.error(`cwd: "${cwd}"`);
			console.error(`line: "${line}"`);
			// prettier-ignore
			console.error(`error: `, e instanceof z.ZodError ? e.format() : e instanceof Error ? `"${e.message}"` : `"${e}"`);
			core.endGroup();
		}
	}

	return diagnostics;
}

async function try_run_svelte_kit_sync(cwd: string) {
	const pkg_path = join(cwd, 'package.json');
	if (!existsSync(pkg_path)) return;

	const pkg = JSON.parse(await readFile(pkg_path, 'utf-8'));

	if (pkg.dependencies?.['@sveltejs/kit'] || pkg.devDependencies?.['@sveltejs/kit']) {
		console.log(`running svelte-kit sync at "${cwd}"`);

		const result = await exec('npx', ['-y', 'svelte-kit', 'sync'], { shell: true, cwd });

		if (!result.ok) {
			console.error('svelte-kit sync failed', {
				...result,
				cwd,
			});
		}
	}
}
