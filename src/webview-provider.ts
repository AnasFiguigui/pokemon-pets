import * as vscode from 'vscode';
import { log } from './log';

export type MessageHandler = (message: unknown) => void;
export type VisibilityHandler = () => void;

export class WebViewProvider implements vscode.WebviewViewProvider, vscode.Disposable {

    public static readonly viewType = 'pokemon-pets';

    private view?: vscode.WebviewView;
    private messageHandler?: MessageHandler;
    private visibilityHandler?: VisibilityHandler;

    /** Listeners tied to the currently resolved view; disposed on re-resolve. */
    private viewDisposables: vscode.Disposable[] = [];

    constructor(private readonly context: vscode.ExtensionContext) {}

    /** Registers a callback invoked for every webview message. */
    public setMessageHandler(handler: MessageHandler): void {
        this.messageHandler = handler;
    }

    /** Registers a callback invoked when the view becomes visible. */
    public setVisibilityHandler(handler: VisibilityHandler): void {
        this.visibilityHandler = handler;
    }

    /** Sends a message to the webview. */
    public postMessage(message: unknown): void {
        this.view?.webview.postMessage(message);
    }

    public dispose(): void {
        this.disposeViewListeners();
    }

    private disposeViewListeners(): void {
        for (const disposable of this.viewDisposables) { disposable.dispose(); }
        this.viewDisposables = [];
    }

    public async resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ): Promise<void> {
        // The view can be re-created (collapse/expand, moving between
        // containers) — drop listeners bound to the previous instance first.
        this.disposeViewListeners();
        this.view = webviewView;

        const webview = webviewView.webview;
        webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')],
        };
        webview.html = await this.getHtmlContent(webview);

        this.viewDisposables.push(
            webview.onDidReceiveMessage(message => {
                this.messageHandler?.(message);
            }),
            webviewView.onDidChangeVisibility(() => {
                if (webviewView.visible) {
                    this.visibilityHandler?.();
                }
            }),
            webviewView.onDidDispose(() => {
                if (this.view === webviewView) {
                    this.view = undefined;
                    this.disposeViewListeners();
                }
            }),
        );
    }

    private async getHtmlContent(webview: vscode.Webview): Promise<string> {
        try {
            const htmlPath = vscode.Uri.joinPath(this.context.extensionUri, 'media', 'main.html');
            const fileData = await vscode.workspace.fs.readFile(htmlPath);
            const htmlContent = new TextDecoder().decode(fileData);

            return htmlContent
                .replaceAll('{media}', `${webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media'))}/`)
                .replaceAll('{cspSource}', webview.cspSource);
        } catch (error) {
            log('Failed to load webview HTML:', error);
            return '<html><body><p>Failed to load extension UI.</p></body></html>';
        }
    }
}
