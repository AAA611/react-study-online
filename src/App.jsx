import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import React from "react";
import { createRoot } from "react-dom/client";

const starterCode = `function Badge({ text }) {
  return <span className="demo-badge">{text}</span>;
}

function App() {
  const [count, setCount] = React.useState(0);

  return (
    <div className="demo-card">
      <Badge text="React Playground" />
      <h1>在线运行 React 代码</h1>
      <p>左侧修改 JSX，右侧会实时渲染结果。</p>
      <button onClick={() => setCount((value) => value + 1)}>
        点击了 {count} 次
      </button>
    </div>
  );
}

render(<App />);`;

const MONACO_MODEL_PATH = "file:///playground/App.jsx";

const MONACO_REACT_GLOBAL_TYPES = `
declare namespace JSX {
  type Element = any;
  interface IntrinsicElements {
    [elementName: string]: any;
  }
}

declare namespace React {
  function useState<T>(initialState: T | (() => T)): [T, (value: T | ((currentValue: T) => T)) => void];
  function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
  function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly unknown[]): T;
  function useRef<T>(initialValue: T): { current: T };
  type ReactNode = any;
}

declare const React: typeof React;
declare function render(node: JSX.Element): void;
`;

let monacoConfigured = false;

function getPreviewStyles(theme) {
  if (theme === "dark") {
    return `
      :host {
        color: #e5eefc;
      }

      * {
        box-sizing: border-box;
      }

      #preview-root {
        min-height: 100%;
        padding: 24px;
        font-family: "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at top right, rgba(34, 197, 94, 0.12), transparent 28%),
          linear-gradient(180deg, #08111f 0%, #111827 100%);
      }

      .demo-card {
        max-width: 420px;
        padding: 24px;
        border-radius: 24px;
        background: rgba(15, 23, 42, 0.8);
        border: 1px solid rgba(148, 163, 184, 0.18);
        box-shadow: 0 24px 80px rgba(2, 6, 23, 0.42);
        backdrop-filter: blur(18px);
      }

      .demo-card h1 {
        margin: 14px 0 10px;
        font-size: 32px;
        line-height: 1.05;
        color: #f8fafc;
      }

      .demo-card p {
        margin: 0 0 18px;
        color: #cbd5e1;
        line-height: 1.6;
      }

      .demo-card button {
        border: none;
        border-radius: 999px;
        padding: 12px 18px;
        font: inherit;
        font-weight: 600;
        color: white;
        cursor: pointer;
        background: linear-gradient(135deg, #0f766e, #2563eb);
        box-shadow: 0 10px 30px rgba(37, 99, 235, 0.28);
      }

      .demo-badge {
        display: inline-flex;
        padding: 6px 12px;
        border-radius: 999px;
        background: rgba(45, 212, 191, 0.12);
        color: #7dd3fc;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
    `;
  }

  return `
    :host {
      color: #111827;
    }

    * {
      box-sizing: border-box;
    }

    #preview-root {
      min-height: 100%;
      padding: 24px;
      font-family: "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at top right, rgba(34, 197, 94, 0.14), transparent 30%),
        linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
    }

    .demo-card {
      max-width: 420px;
      padding: 24px;
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.84);
      border: 1px solid rgba(148, 163, 184, 0.22);
      box-shadow: 0 24px 80px rgba(15, 23, 42, 0.12);
      backdrop-filter: blur(18px);
    }

    .demo-card h1 {
      margin: 14px 0 10px;
      font-size: 32px;
      line-height: 1.05;
    }

    .demo-card p {
      margin: 0 0 18px;
      color: #475569;
      line-height: 1.6;
    }

    .demo-card button {
      border: none;
      border-radius: 999px;
      padding: 12px 18px;
      font: inherit;
      font-weight: 600;
      color: white;
      cursor: pointer;
      background: linear-gradient(135deg, #0f766e, #2563eb);
      box-shadow: 0 10px 30px rgba(37, 99, 235, 0.28);
    }

    .demo-badge {
      display: inline-flex;
      padding: 6px 12px;
      border-radius: 999px;
      background: rgba(15, 118, 110, 0.12);
      color: #0f766e;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
  `;
}

let babelLoader = null;

async function loadBabel() {
  if (!babelLoader) {
    babelLoader = import("@babel/standalone").then((module) => module.default ?? module);
  }

  return babelLoader;
}

function configureMonacoForReact(monaco) {
  if (monacoConfigured) {
    return;
  }

  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    allowJs: true,
    allowNonTsExtensions: true,
    jsx: monaco.languages.typescript.JsxEmit.React,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    target: monaco.languages.typescript.ScriptTarget.ES2020
  });

  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: false
  });

  monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    MONACO_REACT_GLOBAL_TYPES,
    "file:///types/react-playground-globals.d.ts"
  );

  monacoConfigured = true;
}

async function createRunnerHost(source) {
  const Babel = await loadBabel();
  const transformed = Babel.transform(source, {
    presets: ["react"]
  }).code;

  let renderedNode = null;
  const render = (node) => {
    renderedNode = node;
  };

  const runtime = new Function("React", "render", `"use strict";\n${transformed}`);
  runtime(React, render);

  if (!renderedNode) {
    throw new Error('代码没有调用 render(...)。可以保留示例里的 "render(<App />)" 结构。');
  }

  return renderedNode;
}

class PreviewBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      error: error instanceof Error ? error.message : String(error)
    };
  }

  componentDidCatch(error) {
    this.props.onError(error instanceof Error ? error.message : String(error));
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: "" });
    }
  }

  render() {
    if (this.state.error) {
      return null;
    }

    return this.props.children;
  }
}

function Preview({ code, runVersion, theme, onStart, onError, onReady }) {
  const hostRef = useRef(null);
  const rootRef = useRef(null);
  const mountNodeRef = useRef(null);
  const styleNodeRef = useRef(null);

  useEffect(() => {
    if (!hostRef.current) {
      return undefined;
    }

    const shadowRoot = hostRef.current.shadowRoot ?? hostRef.current.attachShadow({ mode: "open" });

    if (!styleNodeRef.current) {
      styleNodeRef.current = document.createElement("style");
      shadowRoot.appendChild(styleNodeRef.current);
    }

    styleNodeRef.current.textContent = getPreviewStyles(theme);

    if (!mountNodeRef.current) {
      mountNodeRef.current = document.createElement("div");
      mountNodeRef.current.id = "preview-root";
      shadowRoot.appendChild(mountNodeRef.current);
    }

    if (!rootRef.current) {
      rootRef.current = createRoot(mountNodeRef.current);
    }

    let cancelled = false;
    onStart();

    const runPreview = async () => {
      try {
        const node = await createRunnerHost(code);
        if (cancelled) {
          return;
        }

        rootRef.current.render(
          <PreviewBoundary resetKey={runVersion} onError={onError}>
            {node}
          </PreviewBoundary>
        );
        onReady();
      } catch (error) {
        if (cancelled) {
          return;
        }

        onError(error instanceof Error ? error.message : String(error));
        rootRef.current.render(null);
      }
    };

    runPreview();

    return () => {
      cancelled = true;
    };
  }, [code, runVersion, theme]);

  useEffect(() => {
    return () => {
      rootRef.current?.unmount();
      rootRef.current = null;
    };
  }, []);

  return <div ref={hostRef} className="preview-host" />;
}

function resolveInitialTheme() {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem("react-playground-theme");
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function App() {
  const [code, setCode] = useState(starterCode);
  const [error, setError] = useState("");
  const [runVersion, setRunVersion] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [theme, setTheme] = useState(resolveInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("react-playground-theme", theme);
  }, [theme]);

  const runCode = () => {
    setRunVersion((value) => value + 1);
  };

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"));
  };

  const editorTheme = theme === "dark" ? "vs-dark" : "vs-light";

  return (
    <div className="shell" data-theme={theme}>
      <header className="topbar">
        <div>
          <p className="eyebrow">React Study Online</p>
          <h1>在线 React 编辑器</h1>
        </div>

        <div className="topbar-actions">
          <button className="theme-button" type="button" onClick={toggleTheme}>
            {theme === "dark" ? "切换浅色" : "切换暗色"}
          </button>
          <button className="run-button" type="button" onClick={runCode}>
            运行代码
          </button>
        </div>
      </header>

      <main className="workspace">
        <section className="panel editor-panel">
          <div className="panel-heading">
            <span>编辑器</span>
            <span className="hint">Monaco 高亮，支持 JSX、Hooks，按 Ctrl/Cmd + Enter 可运行</span>
          </div>

          <div className="editor-wrap">
            <Editor
              height="100%"
              path={MONACO_MODEL_PATH}
              defaultLanguage="javascript"
              language="javascript"
              theme={editorTheme}
              value={code}
              beforeMount={configureMonacoForReact}
              onMount={(editor, monaco) => {
                editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                  runCode();
                });
              }}
              onChange={(value) => {
                setCode(value ?? "");
                runCode();
              }}
              options={{
                automaticLayout: true,
                fontFamily: "JetBrains Mono, Cascadia Code, monospace",
                fontLigatures: true,
                fontSize: 14,
                lineHeight: 22,
                minimap: { enabled: false },
                padding: { top: 18, bottom: 18 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                tabSize: 2,
                wordWrap: "on"
              }}
            />
          </div>
        </section>

        <section className="panel preview-panel">
          <div className="panel-heading">
            <span>预览</span>
            <span className={`status ${error ? "error" : isRunning ? "pending" : "ready"}`}>
              {error ? "编译失败" : isRunning ? "编译中" : "运行正常"}
            </span>
          </div>

          <div className="preview-stage">
            <Preview
              code={code}
              runVersion={runVersion}
              theme={theme}
              onStart={() => setIsRunning(true)}
              onError={(message) => {
                setError(message);
                setIsRunning(false);
              }}
              onReady={() => {
                setError("");
                setIsRunning(false);
              }}
            />
          </div>

          <div className="error-panel">
            {error ? (
              <pre>{error}</pre>
            ) : (
              <p>{theme === "dark" ? "暗色主题已启用，代码会随着输入实时更新。" : "代码运行成功。你可以直接修改左侧 JSX，结果会自动更新。"}</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
