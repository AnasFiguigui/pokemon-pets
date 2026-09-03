/**
 * Minimal logger indirection so modules that run in tests (without the
 * `vscode` module) can still log. The extension injects an OutputChannel
 * at activation; before that (or in tests) messages go nowhere.
 */
export interface LogSink {
    appendLine(value: string): void;
}

let sink: LogSink | undefined;

export function setLogSink(channel: LogSink | undefined): void {
    sink = channel;
}

export function log(message: string, error?: unknown): void {
    const suffix = error === undefined ? '' : ` ${error instanceof Error ? error.message : String(error)}`;
    sink?.appendLine(`[${new Date().toISOString()}] ${message}${suffix}`);
}
