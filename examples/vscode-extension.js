// VSCode Extension Integration Example
// This shows how to integrate Merfolk Editor into a VSCode extension

const vscode = require('vscode');
const { MerfolkEditor } = require('../dist/lib/index.js');

/**
 * Mermaid Preview Provider for VSCode
 */
class MermaidPreviewProvider {
  constructor() {
    this.editors = new Map();
  }

  /**
   * Show Mermaid preview in a webview panel
   */
  showPreview(uri, code) {
    const panel = vscode.window.createWebviewPanel(
      'mermaidPreview',
      'Mermaid Preview',
      vscode.ViewColumn.Two,
      {
        retainContextWhenHidden: true,
        enableScripts: true,
      }
    );

    // Set initial HTML
    panel.webview.html = this.getWebviewContent();

    // Initialize editor after webview loads
    panel.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'initialized':
            this.initializeEditor(panel, uri, code);
            break;
          case 'codeChanged':
            this.onCodeChanged(uri, message.code);
            break;
        }
      }
    );

    // Handle panel disposal
    panel.onDidDispose(() => {
      const editor = this.editors.get(uri.toString());
      if (editor) {
        editor.destroy();
        this.editors.delete(uri.toString());
      }
    });
  }

  /**
   * Initialize Merfolk Editor in webview
   */
  initializeEditor(panel, uri, code) {
    // Send initialization message
    panel.webview.postMessage({
      command: 'initialize',
      code: code || ''
    });
  }

  /**
   * Handle code changes from editor
   */
  onCodeChanged(uri, code) {
    // Update the source document if needed
    // This is optional - depends on your workflow
    vscode.workspace.fs.writeFile(uri, Buffer.from(code));
  }

  /**
   * Update preview with new code
   */
  updatePreview(uri, code) {
    const editor = this.editors.get(uri.toString());
    if (editor) {
      editor.setCode(code);
    }
  }

  /**
   * Get webview HTML content
   */
  getWebviewContent() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mermaid Preview</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      height: 100vh;
      font-family: var(--vscode-font-family);
      background: var(--vscode-editor-background);
    }
    #editor {
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <div id="editor"></div>
  <script>
    const vscode = acquireVsCodeApi();
    let editor = null;

    // Load Merfolk Editor
    import('/node_modules/merfolk-editor/dist/lib/index.js').then(({ default: MerfolkEditor }) => {
      // Notify VSCode that we're ready
      vscode.postMessage({ command: 'initialized' });

      // Listen for initialization
      window.addEventListener('message', event => {
        const message = event.data;

        switch (message.command) {
          case 'initialize':
            if (editor) {
              editor.destroy();
            }

            editor = new MerfolkEditor(document.getElementById('editor'), {
              initialCode: message.code,
              onCodeChange: (code) => {
                vscode.postMessage({
                  command: 'codeChanged',
                  code: code
                });
              }
            });
            break;

          case 'update':
            if (editor) {
              editor.setCode(message.code);
            }
            break;

          case 'setPosition':
            if (editor) {
              editor.setNodePosition(message.nodeId, message.x, message.y);
            }
            break;
        }
      });
    }).catch(error => {
      console.error('Failed to load Merfolk Editor:', error);
      document.body.innerHTML = '<div style="padding: 20px;">Failed to load Merfolk Editor. Please ensure the dependency is installed.</div>';
    });
  </script>
</body>
</html>`;
  }
}

/**
 * VSCode Extension Activation
 */
function activate(context) {
  const previewProvider = new MermaidPreviewProvider();

  // Register preview command
  const previewCommand = vscode.commands.registerCommand(
    'mermaid.preview',
    (uri) => {
      if (!uri) {
        uri = vscode.window.activeTextEditor?.document.uri;
      }

      if (uri && uri.path.endsWith('.md')) {
        // Extract Mermaid code from markdown
        const text = vscode.window.activeTextEditor.document.getText();
        const mermaidCode = extractMermaidCode(text);
        previewProvider.showPreview(uri, mermaidCode);
      } else if (uri && uri.path.endsWith('.mmd')) {
        // Direct mermaid file
        const text = vscode.window.activeTextEditor.document.getText();
        previewProvider.showPreview(uri, text);
      }
    }
  );

  // Register text document change listener
  const changeListener = vscode.workspace.onDidChangeTextDocument((event) => {
    const uri = event.document.uri;
    const editor = previewProvider.editors.get(uri.toString());

    if (editor) {
      if (uri.path.endsWith('.md')) {
        const code = extractMermaidCode(event.document.getText());
        previewProvider.updatePreview(uri, code);
      } else if (uri.path.endsWith('.mmd')) {
        previewProvider.updatePreview(uri, event.document.getText());
      }
    }
  });

  context.subscriptions.push(previewCommand, changeListener);
}

/**
 * Extract Mermaid code from markdown
 */
function extractMermaidCode(text) {
  const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
  const matches = [];
  let match;

  while ((match = mermaidRegex.exec(text)) !== null) {
    matches.push(match[1]);
  }

  return matches.join('\n');
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate
};