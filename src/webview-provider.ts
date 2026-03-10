import * as vscode from 'vscode';

export type MessageHandler = (message: any) => void;
export type VisibilityHandler = () => void;

export class WebViewProvider implements vscode.WebviewViewProvider {

    public static readonly viewType = 'pokemon-pets';

    private view?: vscode.WebviewView;
    private messageHandler?: MessageHandler;
    private visibilityHandler?: VisibilityHandler;

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

    public async resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ): Promise<void> {
        this.view = webviewView;

        const webview = webviewView.webview;
        webview.options = { enableScripts: true };
        webview.html = await this.getHtmlContent(webview);

        const messageDisposable = webview.onDidReceiveMessage(message => {
            this.messageHandler?.(message);
        });
        this.context.subscriptions.push(messageDisposable);

        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this.visibilityHandler?.();
            }
        });
    }

    private async getHtmlContent(webview: vscode.Webview): Promise<string> {
        const htmlPath = vscode.Uri.joinPath(this.context.extensionUri, 'media', 'main.html');
        const fileData = await vscode.workspace.fs.readFile(htmlPath);
        const htmlContent = new TextDecoder().decode(fileData);

        return htmlContent
            .replaceAll('{media}', `${webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media'))}/`)
            .replaceAll('{cspSource}', webview.cspSource);
    }
}
