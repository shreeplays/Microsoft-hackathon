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
  const visualizeCmd = vscode.commands.registerCommand(
    "aiCodeVisualizer.visualize",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor.");
        return;
      }

      const selection = editor.selection;
      const code = selection.isEmpty
        ? editor.document.getText()
        : editor.document.getText(selection);

      if (!code.trim()) {
        vscode.window.showWarningMessage("No code to analyse.");
        return;
      }

      const question = await vscode.window.showInputBox({
        prompt: "Optional: ask a question about this code",
        placeHolder: "e.g. What is the time complexity?",
      });

      const panel = VisualizerPanel.createOrShow(context.extensionUri);
      panel.showLoading(code.slice(0, 60) + (code.length > 60 ? "…" : ""));

      try {
        const config = vscode.workspace.getConfiguration("aiCodeVisualizer");
        const backendUrl = config.get<string>("backendUrl", "http://localhost:8000");

        const response = await fetch(`${backendUrl}/visualize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            question: question ?? "",
            filename: editor.document.fileName.split("/").pop() ?? "snippet.py",
          }),
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        const data: VisualizeResponse = await response.json();
        panel.showResults(data);
        outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] Analysed ${data.filename} — complexity: ${data.complexity}, cached: ${data.cached}`);
      } catch (err: any) {
        panel.showError(String(err));
        vscode.window.showErrorMessage(`AI Visualizer: ${err.message}`);
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
        panel.showResults(data as VisualizeResponse);
      } catch (err: any) {
        panel.showError(String(err));
      }
    }
  );

  context.subscriptions.push(visualizeCmd, multiCmd, outputChannel);
}

export function deactivate() {}

// ─── Webview Panel ────────────────────────────────────────────────────────────

class VisualizerPanel {
  public static currentPanel: VisualizerPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

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

  private constructor(panel: vscode.WebviewPanel, _extensionUri: vscode.Uri) {
    this._panel = panel;
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.html = this._getBaseHtml();
  }

  public showLoading(hint: string) {
    this._panel.webview.postMessage({ type: "loading", hint });
  }

  public showResults(data: VisualizeResponse) {
    this._panel.webview.postMessage({ type: "results", data });
  }

  public showError(message: string) {
    this._panel.webview.postMessage({ type: "error", message });
  }

  public dispose() {
    VisualizerPanel.currentPanel = undefined;
    this._panel.dispose();
    this._disposables.forEach((d) => d.dispose());
  }

  private _getBaseHtml(): string {
    return getWebviewHtml();
  }
}

// ─── Webview HTML ─────────────────────────────────────────────────────────────

function getWebviewHtml(): string {
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

  </style>
</head>

<body>

<!-- Top bar -->
<div id="topbar">
  <h1>⬡ AI Code Visualizer</h1>
  <span id="summary-badge" style="font-size:11px;color:var(--fg2);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></span>
  <span id="complexity-badge" class="badge" style="display:none"></span>
  <span id="cached-badge" class="badge badge-cached" style="display:none">⚡ cached</span>
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
    <p>Select code in the editor and run <kbd>Ctrl+Shift+V</kbd> (or use the command palette) to visualize it.</p>
    <p style="margin-top:8px">Supports flowcharts, architecture diagrams, sequence diagrams, class diagrams, and call graphs.</p>
  </div>

  <!-- Flowchart pane -->
  <div class="pane" id="pane-flowchart">
    <div class="diagram-label">Flowchart</div>
    <div class="diagram-wrap" id="diagram-flowchart"></div>
  </div>

  <!-- Architecture pane -->
  <div class="pane" id="pane-architecture">
    <div class="diagram-label">Architecture Diagram</div>
    <div class="diagram-wrap" id="diagram-architecture"></div>
  </div>

  <!-- Sequence pane -->
  <div class="pane" id="pane-sequence">
    <div class="diagram-label">Sequence Diagram</div>
    <div class="diagram-wrap" id="diagram-sequence"></div>
  </div>

  <!-- Class diagram pane -->
  <div class="pane" id="pane-class">
    <div class="diagram-label">Class Diagram</div>
    <div class="diagram-wrap" id="diagram-class"></div>
  </div>

  <!-- Call graph pane -->
  <div class="pane" id="pane-callgraph">
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
  </div>

</div><!-- #content -->

<script>
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
    if (!source || !source.trim()) {
      container.innerHTML = '<span style="color:var(--fg2);font-size:12px">No diagram available.</span>';
      return;
    }
    try {
      renderCount++;
      const id = 'mermaid-' + renderCount;
      const { svg } = await mermaid.render(id, source);
      container.innerHTML = svg;
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
      document.getElementById('loading').classList.remove('visible');
      document.getElementById('welcome').style.display = 'none';

      const d = msg.data;

      // Top bar badges
      const sumBadge = document.getElementById('summary-badge');
      sumBadge.textContent = d.summary || '';

      const cxBadge = document.getElementById('complexity-badge');
      cxBadge.textContent = (d.complexity || 'medium') + ' complexity';
      cxBadge.className = 'badge badge-' + (d.complexity || 'medium');
      cxBadge.style.display = 'inline-block';

      const cacheBadge = document.getElementById('cached-badge');
      cacheBadge.style.display = d.cached ? 'inline-block' : 'none';

      // Activate panes
      document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));
      document.getElementById('pane-flowchart').classList.add('active');
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelector('.tab[data-tab="flowchart"]').classList.add('active');

      // Render diagrams (all at once — hidden panes still render)
      await Promise.all([
        renderDiagram('diagram-flowchart',    d.flowchart),
        renderDiagram('diagram-architecture', d.architecture),
        renderDiagram('diagram-sequence',     d.sequence),
        renderDiagram('diagram-class',        d.class_diagram || ''),
        renderDiagram('diagram-callgraph',    d.call_graph || d.mermaid),
      ]);

      // Explanation
      document.getElementById('text-explanation').textContent =
        d.explanation || 'No explanation available.';

      const wfList = document.getElementById('list-workflow');
      wfList.innerHTML = '';
      (d.workflow || []).forEach(step => {
        const li = document.createElement('li');
        li.textContent = step;
        wfList.appendChild(li);
      });

      const depList = document.getElementById('list-deps');
      depList.innerHTML = '';
      (d.dependencies || []).forEach(dep => {
        const chip = document.createElement('span');
        chip.className = 'dep-chip';
        chip.textContent = dep;
        depList.appendChild(chip);
      });

      return;
    }
  });
</script>

</body>
</html>`;
}
