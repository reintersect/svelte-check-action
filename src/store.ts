import type { Diagnostic } from './diagnostic';
import { fmt_path } from './files';
import type { CTX } from './ctx';

/**
 * Stores the diagnostics in an easy to use way, whilst keeping track of counts.
 */
export class DiagnosticStore {
	public readonly store = new Map<string, Diagnostic[]>();

	public warning_count = 0;
	public error_count = 0;

	get count() {
		return this.warning_count + this.error_count;
	}

	public filtered_error_count = 0;
	public filtered_warning_count = 0;

	get filtered_count() {
		return this.filtered_warning_count + this.filtered_error_count;
	}

	constructor(
		private readonly ctx: CTX,
		private readonly changed_files: string[] | null,
	) {}

	private should_skip(diagnostic: Diagnostic) {
		// If filter_changes is false then we should never remove
		// any diagnostics. changed_files should always be empty here
		// regardless, since we only load changed_files if filter_changes is truthy
		if (this.ctx.config.filter_changes === false || !this.changed_files) {
			return false;
		}

		// If the provided filter_changes glob pattern doesn't match
		// the diagnostic's path then we won't skip it
		if (
			typeof this.ctx.config.filter_changes !== 'boolean' &&
			!this.ctx.config.filter_changes(fmt_path(diagnostic.path, this.ctx))
		) {
			return false;
		}

		// Now we know that we want to filter for changes, we can
		// actually do that.
		return !this.changed_files.includes(diagnostic.path);
	}

	add(diagnostic: Diagnostic) {
		if (this.should_skip(diagnostic)) {
			return;
		}

		const current = this.store.get(diagnostic.path) ?? [];
		current.push(diagnostic);
		this.store.set(diagnostic.path, current);

		this[`${diagnostic.type}_count`]++;

		if (this.ctx.config.fail_filter(fmt_path(diagnostic.path, this.ctx))) {
			this[`filtered_${diagnostic.type}_count`]++;
		}
	}

	entries() {
		return this.store.entries();
	}

	list() {
		return Array.from(this.store.values()).flat();
	}
}
