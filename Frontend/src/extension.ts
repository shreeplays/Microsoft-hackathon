import * as vscode from "vscode";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VisualizeResponse {
  flowchart: string;
  architecture: string;
  sequence: string;
  class_diagram: string;
  call_graph: string;
  mermaid: string;
  nodes: object[];
  edges: object[];
  explanation: string;
  workflow: string[];
  summary: string;
  dependencies: string[];
  complexity: string;
  cached: boolean;
  filename: string;
}

// ─── Extension activation ─────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel("AI Code Visualizer");

  // ── Command: visualize selection / file ──────────────────────────────────

  const visualizeFileCmd = vscode.commands.registerCommand(
  "aiCodeVisualizer.visualizeFile",
  async () => {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      vscode.window.showErrorMessage("No active editor.");
      return;
    }

    // ✅ ALWAYS FULL FILE (no selection confusion)
    const code = editor.document.getText();

    if (!code.trim()) {
      vscode.window.showWarningMessage("File is empty.");
      return;
    }

    const panel = VisualizerPanel.createOrShow(context.extensionUri);
    panel.showLoading(editor.document.fileName);

    try {
      const config = vscode.workspace.getConfiguration("aiCodeVisualizer");
      const backendUrl = config.get<string>("backendUrl", "http://localhost:8000");

      const response = await fetch(`${backendUrl}/visualize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          filename: editor.document.fileName.split("/").pop() ?? "file",
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json() as VisualizeResponse;
      panel.showResults(data, editor, code);

    } catch (err: any) {
      panel.showError(String(err));
    }
  }
);
  // ── Command: analyse workspace (multi-file) ──────────────────────────────
  const multiCmd = vscode.commands.registerCommand(
    "aiCodeVisualizer.analyzeWorkspace",
    async () => {
      const files = await vscode.workspace.findFiles("**/*.py", "**/node_modules/**", 20);
      if (files.length === 0) {
        vscode.window.showWarningMessage("No Python files found in workspace.");
        return;
      }

      const fileMap: Record<string, string> = {};
      for (const uri of files) {
        const doc = await vscode.workspace.openTextDocument(uri);
        const rel = vscode.workspace.asRelativePath(uri);
        fileMap[rel] = doc.getText();
      }

      const panel = VisualizerPanel.createOrShow(context.extensionUri);
      panel.showLoading(`Analysing ${files.length} files…`);

      try {
        const config = vscode.workspace.getConfiguration("aiCodeVisualizer");
        const backendUrl = config.get<string>("backendUrl", "http://localhost:8000");

        const response = await fetch(`${backendUrl}/visualize/multi`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: fileMap }),
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        // Multi-file: combine for context
        const combined = Object.values(fileMap).join("\n\n---\n\n");
        panel.showResults(data as VisualizeResponse, undefined, combined);
      } catch (err: any) {
        panel.showError(String(err));
      }
    }
  );

  context.subscriptions.push(visualizeFileCmd, multiCmd, outputChannel);
}

export function deactivate() {}

// ─── Webview Panel ────────────────────────────────────────────────────────────

class VisualizerPanel {
  public static currentPanel: VisualizerPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _editor: vscode.TextEditor | undefined;

  public static createOrShow(extensionUri: vscode.Uri): VisualizerPanel {
    const column = vscode.ViewColumn.Beside;

    if (VisualizerPanel.currentPanel) {
      VisualizerPanel.currentPanel._panel.reveal(column);
      return VisualizerPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      "aiCodeVisualizer",
      "AI Code Visualizer",
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    VisualizerPanel.currentPanel = new VisualizerPanel(panel, extensionUri);
    return VisualizerPanel.currentPanel;
  }

private constructor(
  panel: vscode.WebviewPanel,
  extensionUri: vscode.Uri
) {

  this._panel = panel;

  this._panel.onDidDispose(
    () => this.dispose(),
    null,
    this._disposables
  );

  // 🔥 UI Enhancements JS
  const uiUri = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "src", "uiEnhancements.js"));
  const scriptUri = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "src", "keyboardShortcuts.js"));

  // 🔥 Loading All 13 New JS Enhancement Modules
  const animUri = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "src", "animationEngine.js"));
  const notifyUri = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "src", "notificationSystem.js"));
  const exportUri = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "src", "diagramExporter.js"));
  const navUri = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "src", "diagramNavigator.js"));
  const metricsUri = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "src", "codeMetricsPanel.js"));
  const paletteUri = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "src", "commandPalette.js"));
  const tooltipUri = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "src", "tooltipEngine.js"));
  const a11yUri = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "src", "accessibilityManager.js"));
  const annUri = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "src", "diagramAnnotations.js"));
  const perfUri = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "src", "performanceMonitor.js"));

  this._panel.webview.html = this._getBaseHtml(
    scriptUri, uiUri, animUri, notifyUri, exportUri, 
    navUri, metricsUri, paletteUri, tooltipUri, 
    a11yUri, annUri, perfUri
  );

  // 🔥 Listen for messages from webview
  this._panel.webview.onDidReceiveMessage(
    async (message) => {
      if (message.type === "requestVisualize") {
        vscode.commands.executeCommand("aiCodeVisualizer.visualizeFile");
      }
      if (message.type === "jumpToCode") {

        const editor = this._editor;

        if (!editor) {
          vscode.window.showInformationMessage("No active editor");
          return;
        }

        const text = editor.document.getText();

        // 🔥 Clean label
        let label = message.label
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, " ")
          .trim();

        const words = label
          .split(/\s+/)
          .filter((w: string) => w.length > 2);

        // 🔥 Find best match
        const lines = text.split("\n");

        let bestLine = -1;
        let bestScore = 0;

        lines.forEach((line: string, index: number) => {

          const lower = line.toLowerCase();
          let score = 0;

          words.forEach((word: string) => {
            if (lower.includes(word)) {
              score++;
            }
          });

          if (score > bestScore) {
            bestScore = score;
            bestLine = index;
          }

        });

        if (bestLine === -1) {
          vscode.window.showInformationMessage(
            "Could not find closest match for: " + message.label
          );
          return;
        }

        const position = new vscode.Position(bestLine, 0);

        editor.selection =
          new vscode.Selection(position, position);

        editor.revealRange(
          new vscode.Range(position, position),
          vscode.TextEditorRevealType.InCenter
        );
      }

      if (message.type === "chatRequest") {
        try {
          const config = vscode.workspace.getConfiguration("aiCodeVisualizer");
          const backendUrl = config.get<string>("backendUrl", "http://localhost:8000");

          const response = await fetch(`${backendUrl}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: message.code,
              question: message.question
            }),
          });

          if (!response.ok) throw new Error("Backend chat error");
          const data: any = await response.json();
          this._panel.webview.postMessage({ type: "chatResponse", text: data.response });

        } catch (err: any) {
          this._panel.webview.postMessage({ type: "chatResponse", text: "Error: " + String(err) });
        }
      }
    },
    null,
    this._disposables
  );

}

  public showLoading(hint: string) {
    this._panel.webview.postMessage({ type: "loading", hint });
  }

  public showResults(data: VisualizeResponse, editor?: vscode.TextEditor, codeContext?: string) {
     this._editor = editor;
     this._panel.webview.postMessage({ 
       type: "results", 
       data: { ...data, code_context: codeContext } 
     });
  }

  public showError(message: string) {
    this._panel.webview.postMessage({ type: "error", message });
  }

  public dispose() {
    VisualizerPanel.currentPanel = undefined;
    this._panel.dispose();
    this._disposables.forEach((d) => d.dispose());
  }

  private _getBaseHtml(
    scriptUri: vscode.Uri, 
    uiUri: vscode.Uri,
    animUri: vscode.Uri,
    notifyUri: vscode.Uri,
    exportUri: vscode.Uri,
    navUri: vscode.Uri,
    metricsUri: vscode.Uri,
    paletteUri: vscode.Uri,
    tooltipUri: vscode.Uri,
    a11yUri: vscode.Uri,
    annUri: vscode.Uri,
    perfUri: vscode.Uri
  ): string {
    return getWebviewHtml(
      scriptUri, uiUri, animUri, notifyUri, exportUri, 
      navUri, metricsUri, paletteUri, tooltipUri, 
      a11yUri, annUri, perfUri
    );
  }
}

// ─── Webview HTML ─────────────────────────────────────────────────────────────

function getWebviewHtml(
  scriptUri: vscode.Uri, 
  uiUri: vscode.Uri,
  animUri: vscode.Uri,
  notifyUri: vscode.Uri,
  exportUri: vscode.Uri,
  navUri: vscode.Uri,
  metricsUri: vscode.Uri,
  paletteUri: vscode.Uri,
  tooltipUri: vscode.Uri,
  a11yUri: vscode.Uri,
  annUri: vscode.Uri,
  perfUri: vscode.Uri
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>AI Code Visualizer</title>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>

<style>
  :root {
    --bg: var(--vscode-editor-background, #1e1e2e);
    --bg2: var(--vscode-sideBar-background, #181825);
    --fg: var(--vscode-editor-foreground, #cdd6f4);
    --fg2: var(--vscode-descriptionForeground, #a6adc8);
    --accent: var(--vscode-focusBorder, #89b4fa);
    --border: var(--vscode-panel-border, #313244);
    --tab-active: var(--vscode-tab-activeBackground, #1e1e2e);
    --tab-inactive: var(--vscode-tab-inactiveBackground, #181825);
    --btn-bg: var(--vscode-button-background, #89b4fa);
    --btn-fg: var(--vscode-button-foreground, #1e1e2e);
    --success: #a6e3a1;
    --warning: #f9e2af;
    --error: #f38ba8;
    --radius: 6px;
    font-family: var(--vscode-font-family, 'Segoe UI', sans-serif);
    font-size: var(--vscode-font-size, 13px);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--bg);
    color: var(--fg);
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* ── Top bar ── */
  #topbar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    background: var(--bg2);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  #topbar h1 {
    font-size: 13px;
    font-weight: 600;
    color: var(--accent);
    flex: 1;
  }
  .badge {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 20px;
    font-weight: 600;
  }
  .badge-low    { background: #1e3a2f; color: var(--success); }
  .badge-medium { background: #3a2f1a; color: var(--warning); }
  .badge-high   { background: #3a1a1a; color: var(--error);   }
  .badge-cached { background: #1a2a3a; color: var(--accent);  }

  /* ── Tab bar ── */
  #tabbar {
    display: flex;
    background: var(--bg2);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    overflow-x: auto;
  }
  .tab {
    padding: 8px 16px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    color: var(--fg2);
    border-bottom: 2px solid transparent;
    white-space: nowrap;
    transition: color 0.15s, border-color 0.15s;
    user-select: none;
  }
  .tab:hover { color: var(--fg); }
  .tab.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
    background: var(--tab-active);
  }

  /* ── Content area ── */
  #content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .pane { display: none; }
  .pane.active { display: block; }

  /* ── Diagram container ── */
  .diagram-wrap {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    overflow-x: auto;
    min-height: 120px;
    position: relative;
  }
  .diagram-wrap svg { max-width: 100%; height: auto; }

  .diagram-label {
    font-size: 11px;
    color: var(--fg2);
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* ── Explanation pane ── */
  .card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 16px;
    margin-bottom: 12px;
  }
  .card-title {
    font-size: 11px;
    font-weight: 600;
    color: var(--fg2);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 8px;
  }
  .card p { line-height: 1.6; color: var(--fg); }

  ol.workflow {
    padding-left: 20px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  ol.workflow li {
    color: var(--fg);
    line-height: 1.5;
    padding: 4px 0;
    border-bottom: 1px solid var(--border);
  }
  ol.workflow li:last-child { border-bottom: none; }

  .dep-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .dep-chip {
    font-size: 11px;
    padding: 2px 10px;
    border-radius: 20px;
    background: #1a2a1a;
    color: var(--success);
    font-family: var(--vscode-editor-font-family, monospace);
  }

  /* ── Loading ── */
  #loading {
    display: none;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    height: 100%;
    min-height: 200px;
  }
  #loading.visible { display: flex; }
  .spinner {
    width: 32px; height: 32px;
    border: 3px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  #loading-hint { color: var(--fg2); font-size: 12px; }

  /* ── Error ── */
  #error-box {
    display: none;
    background: #2d1b1b;
    border: 1px solid var(--error);
    border-radius: var(--radius);
    padding: 14px;
    color: var(--error);
    font-size: 12px;
    line-height: 1.6;
    margin-top: 16px;
  }
  #error-box.visible { display: block; }

  /* ── Welcome ── */
  #welcome {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    height: 100%;
    min-height: 300px;
    color: var(--fg2);
    text-align: center;
  }
  #welcome h2 { font-size: 20px; color: var(--fg); font-weight: 400; }
  #welcome p { max-width: 340px; line-height: 1.6; font-size: 12px; }
  #welcome kbd {
    display: inline-block;
    padding: 2px 8px;
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 4px;
    font-family: monospace;
    font-size: 12px;
    color: var(--accent);
  }
    /* ── Zoom + Highlight ── */

#diagram-wrapper{
  overflow:auto;
}

#diagram-flowchart{
  transform-origin: top left;
}

.highlight-node rect{
  stroke:#ffcc00 !important;
  stroke-width:4px !important;
}

.highlight-node polygon{
  stroke:#ffcc00 !important;
  stroke-width:4px !important;
}

.highlight-node circle{
  stroke:#ffcc00 !important;
  stroke-width:4px !important;
}
.light-mode {
  --bg: #ffffff;
  --bg2: #f5f5f5;
  --fg: #111111;
  --fg2: #555555;
  --border: #dddddd;
}

/* -------------------------------
   Fullscreen Mode
--------------------------------*/

.fullscreen-mode #topbar{
  display:none;
}

.fullscreen-mode #tabbar{
  display:none;
}

.fullscreen-mode #content{
  height:100vh;
  padding:8px;
}

.fullscreen-mode .diagram-wrap{
  height:95vh;
}

/* ── Chat UI ── */
#chat-container {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
#chat-history {
  max-height: 300px;
  overflow-y: auto;
  padding: 10px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.chat-msg {
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  max-width: 85%;
  line-height: 1.4;
}
.chat-msg.user {
  align-self: flex-end;
  background: var(--accent);
  color: var(--bg);
}
.chat-msg.ai {
  align-self: flex-start;
  background: var(--bg2);
  border: 1px solid var(--border);
  color: var(--fg);
}
.chat-input-row {
  display: flex;
  gap: 8px;
}
#chat-input {
  flex: 1;
  padding: 8px 12px;
  background: var(--bg2);
  border: 1px solid var(--border);
  color: var(--fg);
  border-radius: var(--radius);
  outline: none;
}
#chat-input:focus { border-color: var(--accent); }
#chat-send {
  padding: 8px 16px;
  background: var(--btn-bg);
  color: var(--btn-fg);
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  font-weight: 600;
}

  </style>
</head>

<body>

<!-- Top bar -->
<div id="topbar">
  <h1>⬡ AI Code Visualizer</h1>
  <span id="complexity-badge" class="badge" style="display:none"></span>
  <span id="cached-badge" class="badge badge-cached" style="display:none">⚡ cached</span>
  <button id="btn-show-palette" title="Command Palette" style="
    margin-left:auto;
    background:transparent;
    border:1px solid var(--border);
    color:var(--accent);
    border-radius:4px;
    padding:2px 10px;
    cursor:pointer;
    font-size:12px;
    display:flex;
    align-items:center;
    justify-content:center;
    font-weight:600;
  ">⌘ K</button>
  <button id="btn-show-shortcuts" title="Keyboard Shortcuts (Shift + H)" style="
    background:transparent;
    border:1px solid var(--border);
    color:var(--accent);
    border-radius:4px;
    padding:2px 8px;
    cursor:pointer;
    font-size:16px;
    display:flex;
    align-items:center;
    justify-content:center;
  ">⌨</button>
</div>

<!-- Tab bar -->
<div id="tabbar">
  <div class="tab active" data-tab="flowchart">Flowchart</div>
  <div class="tab" data-tab="architecture">Architecture</div>
  <div class="tab" data-tab="sequence">Sequence</div>
  <div class="tab" data-tab="class">Class Diagram</div>
  <div class="tab" data-tab="callgraph">Call Graph</div>
  <div class="tab" data-tab="explanation">Explanation</div>
</div>

<!-- Content -->
<div id="content">

  <!-- Loading -->
  <div id="loading">
    <div class="spinner"></div>
    <div id="loading-hint">Analysing code…</div>
  </div>

  <!-- Error -->
  <div id="error-box"></div>

  <!-- Welcome -->
  <div id="welcome">
    <h2>AI Code Visualizer</h2>
    <p>Use <kbd>Ctrl+Shift+V</kbd> or the <b>Visualize Current File</b> toolbar icon to analyze the active editor.</p>
    <p style="margin-top:8px">Visualizes the entire file automatically — no selection needed!</p>
  </div>

 <!-- Flowchart pane -->
<div class="pane" id="pane-flowchart">

  <!-- Search Bar -->
  <div style="
      display:flex;
      gap:8px;
      margin-bottom:12px;
      align-items:center;
  ">
    <input 
      id="searchInput"
      placeholder="Search function / node..."
      style="
        flex:1;
        padding:8px;
        background:var(--bg2);
        border:1px solid var(--border);
        color:var(--fg);
        border-radius:6px;
        font-size:12px;
      "
    />

    <button
      onclick="searchNode()"
      style="
        padding:8px 14px;
        background:var(--btn-bg);
        color:var(--btn-fg);
        border:none;
        border-radius:6px;
        cursor:pointer;
        font-size:12px;
      "
    >
      🔍 Search
    </button>

  </div>

  <!-- Zoom Controls -->
<div style="
display:flex;
gap:6px;
margin-bottom:8px;
">

<button onclick="globalThis.DiagramNavigator.zoomIn('diagram-wrapper')">+</button>
<button onclick="globalThis.DiagramNavigator.zoomOut('diagram-wrapper')">-</button>
<button onclick="globalThis.DiagramNavigator.resetZoom('diagram-wrapper')">Reset</button>
<button onclick="toggleTheme()">🌙</button>
<button onclick="toggleFullscreen()">⛶</button>

</div>

<div class="diagram-label">Flowchart</div>

<div class="diagram-wrap" id="diagram-wrapper">
  <div id="diagram-flowchart"></div>
</div>

</div>

  <!-- Architecture pane -->
  <div class="pane" id="pane-architecture">
    <div style="display:flex;gap:6px;margin-bottom:8px">
      <button onclick="globalThis.DiagramNavigator.zoomIn('diagram-architecture')">+</button>
      <button onclick="globalThis.DiagramNavigator.zoomOut('diagram-architecture')">-</button>
      <button onclick="globalThis.DiagramNavigator.fitToScreen('diagram-architecture')">Fit</button>
    </div>
    <div class="diagram-label">Architecture Diagram</div>
    <div class="diagram-wrap" id="diagram-architecture"></div>
  </div>

  <!-- Sequence pane -->
  <div class="pane" id="pane-sequence">
    <div style="display:flex;gap:6px;margin-bottom:8px">
      <button onclick="globalThis.DiagramNavigator.zoomIn('diagram-sequence')">+</button>
      <button onclick="globalThis.DiagramNavigator.zoomOut('diagram-sequence')">-</button>
      <button onclick="globalThis.DiagramNavigator.fitToScreen('diagram-sequence')">Fit</button>
    </div>
    <div class="diagram-label">Sequence Diagram</div>
    <div class="diagram-wrap" id="diagram-sequence"></div>
  </div>

  <!-- Class diagram pane -->
  <div class="pane" id="pane-class">
    <div style="display:flex;gap:6px;margin-bottom:8px">
      <button onclick="globalThis.DiagramNavigator.zoomIn('diagram-class')">+</button>
      <button onclick="globalThis.DiagramNavigator.zoomOut('diagram-class')">-</button>
      <button onclick="globalThis.DiagramNavigator.fitToScreen('diagram-class')">Fit</button>
    </div>
    <div class="diagram-label">Class Diagram</div>
    <div class="diagram-wrap" id="diagram-class"></div>
  </div>

  <!-- Call graph pane -->
  <div class="pane" id="pane-callgraph">
    <div style="display:flex;gap:6px;margin-bottom:8px">
      <button onclick="globalThis.DiagramNavigator.zoomIn('diagram-callgraph')">+</button>
      <button onclick="globalThis.DiagramNavigator.zoomOut('diagram-callgraph')">-</button>
      <button onclick="globalThis.DiagramNavigator.fitToScreen('diagram-callgraph')">Fit</button>
    </div>
    <div class="diagram-label">Call Graph</div>
    <div class="diagram-wrap" id="diagram-callgraph"></div>
  </div>

  <!-- Explanation pane -->
  <div class="pane" id="pane-explanation">
    <div class="card" id="card-explanation">
      <div class="card-title">Explanation</div>
      <p id="text-explanation"></p>
    </div>
    <div class="card" id="card-workflow">
      <div class="card-title">Workflow</div>
      <ol class="workflow" id="list-workflow"></ol>
    </div>
    <div class="card" id="card-deps">
      <div class="card-title">Dependencies</div>
      <div class="dep-list" id="list-deps"></div>
    </div>

    <!-- AI Chat Box -->
    <div class="card">
      <div class="card-title">AI Chat Assistant</div>
      <div id="chat-container">
        <div id="chat-history">
          <div class="chat-msg ai">Hello! Ask me anything about the analyzed code.</div>
        </div>
        <div class="chat-input-row">
          <input type="text" id="chat-input" placeholder="Ask a question..." />
          <button id="chat-send">Send</button>
        </div>
      </div>
    </div>
  </div>

</div><!-- #content -->

<script>
  window.onerror = function(msg, url, line, col, error) {
    const errorBox = document.getElementById('error-box');
    if (errorBox) {
      errorBox.textContent = "Global JS Error: " + msg + " at " + line + ":" + col;
      errorBox.classList.add('visible');
    }
    const loader = document.getElementById('loading');
    if (loader) loader.classList.remove('visible');
    return false;
  };

  // Visualize button removed as per user request (toolbar button remains)
  const btnShortcuts = document.getElementById('btn-show-shortcuts');
  if (btnShortcuts) {
    btnShortcuts.addEventListener('click', () => {
      if (globalThis.showShortcuts) globalThis.showShortcuts();
    });
  }

  const btnPalette = document.getElementById('btn-show-palette');
  if (btnPalette) {
    btnPalette.addEventListener('click', () => {
      if (globalThis.CommandPalette) globalThis.CommandPalette.show();
    });
  }

  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
      background: '#1e1e2e',
      primaryColor: '#89b4fa',
      primaryTextColor: '#cdd6f4',
      primaryBorderColor: '#313244',
      lineColor: '#585b70',
      secondaryColor: '#313244',
      tertiaryColor: '#181825',
    },
    flowchart: { curve: 'basis', htmlLabels: true },
    sequence: { actorMargin: 60, useMaxWidth: true },
  });

  const vscode = acquireVsCodeApi();
  let currentTab = 'flowchart';
  let renderCount = 0;

  // ── Tab switching ──────────────────────────────────────────────────────────
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const name = tab.dataset.tab;
      currentTab = name;
      const pane = document.getElementById('pane-' + name);
      if (pane) pane.classList.add('active');
    });
  });

  // ── Render a single mermaid diagram ───────────────────────────────────────
  async function renderDiagram(containerId, source) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!source) {
      container.innerHTML = '<span style="color:var(--fg2);font-size:12px">No diagram data.</span>';
      return;
    }
    const src = String(source).trim();
    if (!src) {
      container.innerHTML = '<span style="color:var(--fg2);font-size:12px">No diagram available.</span>';
      return;
    }
    try {
      renderCount++;
      const id = 'mermaid-' + Date.now() + '-' + renderCount;
      const { svg } = await mermaid.render(id, src);
      container.innerHTML = svg;
      if(containerId === "diagram-flowchart"){
        enableNodeClick();
      }
    } catch (e) {
      container.innerHTML =
        '<span style="color:var(--error);font-size:12px">Diagram render error: ' +
        e.message + '</span><pre style="margin-top:8px;font-size:11px;color:var(--fg2);white-space:pre-wrap">' +
        source + '</pre>';
    }
  }

  // ── Message handler ────────────────────────────────────────────────────────
  window.addEventListener('message', async event => {
    const msg = event.data;

    // Loading
    if (msg.type === 'loading') {
      document.getElementById('welcome').style.display = 'none';
      document.getElementById('error-box').classList.remove('visible');
      document.getElementById('loading').classList.add('visible');
      document.getElementById('loading-hint').textContent =
        'Analysing: ' + (msg.hint || '…');
      // Show flowchart tab
      document.querySelector('.tab[data-tab="flowchart"]').click();
      return;
    }

    // Error
    if (msg.type === 'error') {
      document.getElementById('loading').classList.remove('visible');
      const box = document.getElementById('error-box');
      box.textContent = '⚠ ' + msg.message;
      box.classList.add('visible');
      return;
    }

    // Results
    if (msg.type === 'results') {
      try {
        const d = msg.data;
        
        const loader = document.getElementById('loading');
        const welcome = document.getElementById('welcome');
        if (loader) loader.classList.remove('visible');
        if (welcome) welcome.style.display = 'none';

        // Top bar badges
        const cxBadge = document.getElementById('complexity-badge');
        if (cxBadge) {
          cxBadge.textContent = (d.complexity || 'medium') + ' complexity';
          cxBadge.className = 'badge badge-' + (d.complexity || 'medium');
          cxBadge.style.display = 'inline-block';
        }

        const cacheBadge = document.getElementById('cached-badge');
        if (cacheBadge) cacheBadge.style.display = d.cached ? 'inline-block' : 'none';

        // Activate panes
        document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));
        const paneFlow = document.getElementById('pane-flowchart');
        if (paneFlow) paneFlow.classList.add('active');
        
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        const tabFlow = document.querySelector('.tab[data-tab="flowchart"]');
        if (tabFlow) tabFlow.classList.add('active');

        // Render diagrams
        await Promise.all([
          renderDiagram('diagram-flowchart',    d.flowchart),
          renderDiagram('diagram-architecture', d.architecture),
          renderDiagram('diagram-sequence',     d.sequence),
          renderDiagram('diagram-class',        d.class_diagram || ''),
          renderDiagram('diagram-callgraph',    d.call_graph),
        ]);

        // 🔥 Auto-fit flowchart to screen
        if (globalThis.DiagramNavigator && globalThis.DiagramNavigator.fitToScreen) {
            setTimeout(() => {
                globalThis.DiagramNavigator.fitToScreen();
            }, 300); // Give mermaid a moment to settle
        }

        // Explanation
        const explanationEl = document.getElementById('text-explanation');
        if (explanationEl) explanationEl.textContent = d.explanation || 'No explanation available.';

        const wfList = document.getElementById('list-workflow');
        if (wfList) {
          wfList.innerHTML = '';
          (d.workflow || []).forEach(step => {
            const li = document.createElement('li');
            li.textContent = step;
            wfList.appendChild(li);
          });
        }

        const depList = document.getElementById('list-deps');
        if (depList) {
          depList.innerHTML = '';
          (d.dependencies || []).forEach(dep => {
            const chip = document.createElement('span');
            chip.className = 'dep-chip';
            chip.textContent = dep;
            depList.appendChild(chip);
          });
        }

        // 🔥 Initialize New Modules
        if (msg.data.code_context && globalThis.CodeMetrics) {
            globalThis.CodeMetrics.parse(msg.data.code_context);
        }

        if (globalThis.DiagramNavigator) {
            const wrappers = ['diagram-wrapper', 'diagram-architecture', 'diagram-sequence', 'diagram-class', 'diagram-callgraph'];
            wrappers.forEach(id => {
              globalThis.DiagramNavigator.enableDragPan(id);
              // Minimaps removed for clean UI
            });
        }
        if (globalThis.TooltipEngine) {
            globalThis.TooltipEngine.registerNodes('diagram-flowchart');
        }

        // 🔥 Visualization Complete Notification
        if (globalThis.NotificationSystem) {
            globalThis.NotificationSystem.success(
                "Visualization Ready", 
                "All diagrams have been generated successfully."
            );
        }
      } catch (err) {
          console.error("Webview Results Error:", err);
          const errorBox = document.getElementById('error-box');
          if (errorBox) {
            errorBox.textContent = "Error handling results: " + err.message;
            errorBox.classList.add('visible');
          }
          const loader = document.getElementById('loading');
          if (loader) loader.classList.remove('visible');
      }
      return;
    }

    // Chat
    if (msg.type === 'chatResponse') {
      addChatMessage(msg.text, 'ai');
    }
  });

  // ── Chat Logic ──────────────────────────────────────────

  const chatInput = document.getElementById('chat-input');
  const chatSend = document.getElementById('chat-send');
  const chatHistory = document.getElementById('chat-history');

  function addChatMessage(text, role) {
    const msg = document.createElement('div');
    msg.className = 'chat-msg ' + role;
    msg.textContent = text;
    chatHistory.appendChild(msg);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  chatSend.addEventListener('click', () => {
    const question = chatInput.value.trim();
    if (!question) return;

    addChatMessage(question, 'user');
    chatInput.value = '';

    // We send current code context
    vscode.postMessage({
      type: 'chatRequest',
      question: question,
      code: lastAnalyzedCode || ""
    });
  });

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') chatSend.click();
  });

  let lastAnalyzedCode = "";
  window.addEventListener('message', e => {
      if(e.data.type === 'results') {
          lastAnalyzedCode = e.data.data.code_context || ""; // Need to ensure backend sends this
      }
  });
  // ── Search Node ─────────────────────────────────────────

function searchNode(){

  const text = document
    .getElementById("searchInput")
    .value
    .toLowerCase()

  const nodes = document.querySelectorAll(
    "#diagram-flowchart svg g.node"
  )

  // remove previous highlights
  nodes.forEach(node=>{
    node.classList.remove("highlight-node")
  })

  let firstMatch = null

  nodes.forEach(node=>{

    const label =
      node.textContent.toLowerCase()

    if(label.includes(text)){

      node.classList.add("highlight-node")

      if(!firstMatch){
        firstMatch = node
      }

    }

  })

  // scroll to first match
  if(firstMatch){

    firstMatch.scrollIntoView({
      behavior:"smooth",
      block:"center"
    })

  }

}
  // ── Interactive Node Click ─────────────────────────

function enableNodeClick(){

  const nodes = document.querySelectorAll(
    "#diagram-flowchart svg g.node"
  )

  nodes.forEach(node=>{

    node.style.cursor = "pointer"

    node.addEventListener("click",()=>{

      const label = node.textContent.trim()

      console.log("Clicked node:", label)

      vscode.postMessage({
        type:"jumpToCode",
        label: label
      })

      nodes.forEach(n=>{
        n.classList.remove("highlight-node")
      })

      node.classList.add("highlight-node")

      node.scrollIntoView({
        behavior:"smooth",
        block:"center"
      })

    })

  })

}
  // Zoom logic now handled by DiagramNavigator
</script>

<script src="${scriptUri}"></script>
<script src="${uiUri}"></script>
<script src="${animUri}"></script>
<script src="${notifyUri}"></script>
<script src="${exportUri}"></script>
<script src="${navUri}"></script>
<script src="${metricsUri}"></script>
<script src="${paletteUri}"></script>
<script src="${tooltipUri}"></script>
<script src="${a11yUri}"></script>
<script src="${annUri}"></script>
<script src="${perfUri}"></script>

</body>
</html>`;
}
