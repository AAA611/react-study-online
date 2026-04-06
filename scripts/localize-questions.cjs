const fs = require("fs");
const path = require("path");

const titleMap = {
  "01": "useState 初始值只在首次渲染时生效",
  "02": "同一事件中两次 setState 读取的是同一个快照",
  "03": "函数式更新会按顺序依次执行",
  "04": "effect 依赖变化时的执行顺序",
  "05": "cleanup 会先于下一次 effect 执行",
  "06": "setTimeout 中的闭包旧值问题",
  "07": "useRef 可以为异步回调保存最新值",
  "08": "依赖不变时 useMemo 不会重新计算",
  "09": "父组件重渲染不一定会让子组件重新计算 memo",
  "10": "useCallback 缓存的是函数引用，不是执行结果",
  "11": "React.memo 遇到稳定的基础类型 props",
  "12": "React.memo 遇到每次都是新对象的 props",
  "13": "使用 index 作为 key 会在重排后造成状态错位",
  "14": "稳定 key 能保留正确的组件身份",
  "15": "卸载再挂载会重置局部状态",
  "16": "缺少依赖控制会造成无限循环",
  "17": "在 effect 里 setState 后立刻读取 state",
  "18": "useLayoutEffect 会先于 useEffect 执行",
  "19": "组件内部创建的对象每次渲染都是新的",
  "20": "设置相同 state 通常会跳过重渲染",
  "21": "父组件状态更新也会让普通子组件重渲染",
  "22": "useState 的惰性初始化只会执行一次",
  "23": "空依赖 effect 的 cleanup 保留的是第一次的值",
  "24": "条件调用 Hook 会破坏 Hook 顺序",
  "25": "useEffect 中的对象依赖每次渲染都会变化",
  "26": "useMemo 可以稳定对象依赖",
  "27": "Provider 的 value 变化时消费者会重渲染",
  "28": "Provider 传入对象字面量会让消费者重渲染",
  "29": "错误边界捕获不到事件处理函数中的错误",
  "30": "错误边界可以捕获渲染阶段错误",
  "31": "空依赖 effect 会保留旧函数",
  "32": "setInterval 与旧闭包",
  "33": "interval 里的函数式更新能拿到最新 state",
  "34": "useReducer 的 dispatch 不会立刻更新当前闭包",
  "35": "useReducer 的 init 函数只在挂载时执行一次",
  "36": "props 变化时子组件 cleanup 的执行顺序",
  "37": "useImperativeHandle 决定父组件通过 ref 看到什么",
  "38": "0 && JSX 的结果是 0，不是什么都不渲染",
  "39": "false、null 和 undefined 在 JSX 中会被忽略",
  "40": "字符串数组会按顺序渲染",
  "41": "Fragment 不会额外生成 DOM 节点",
  "42": "defaultValue 只在首次挂载时生效",
  "43": "value 会让 input 成为受控组件",
  "44": "事件处理中的日志先于重渲染日志",
  "45": "多个 useEffect 会按声明顺序执行",
  "46": "Promise 回调在现代 React 中也会被批处理",
  "47": "状态拆分不代表组件只执行一部分",
  "48": "改变 key 会强制创建全新组件实例",
  "49": "从 props 初始化的 state 不会自动跟随后续 props 变化",
  "50": "一个 effect 里的两次 state 更新通常只触发一次最终重渲染"
};

const answerMap = {
  "01": "输出顺序是：先打印 `render 0`，再打印 `render 1`。",
  "02": "首次渲染会打印 `render 0`。点击一次后，会先打印 `clicked 0`，随后组件重新渲染并打印 `render 1`，按钮上的文本也会变成 `1`。",
  "03": "输出顺序是：先打印 `render 0`，再打印 `render 2`。",
  "04": "输出顺序是：`render 0 -> effect 0 -> render 1 -> effect 1`。",
  "05": "输出顺序是：`render false -> effect false -> render true -> cleanup false -> effect true`。",
  "06": "最终打印的是 `0`。",
  "07": "最终打印的是 `1`。",
  "08": "首次渲染会打印 `compute` 和 `render 0 HELLO`。点击一次后只会打印 `render 1 HELLO`，不会再次打印 `compute`。",
  "09": "首次渲染会打印 `app render 0`、`memo React`、`child render React!`。点击一次后会打印 `app render 1` 和 `child render React!`，但不会再次打印 `memo React`。",
  "10": "输出顺序是：首次渲染打印 `render 0 -> callback 0`；点击一次后打印 `render 1 -> callback 1`。",
  "11": "首次渲染会打印 `app render 0`、`child render stable`。点击一次后只会打印 `app render 1`，子组件不会重新渲染。",
  "12": "首次渲染会打印 `app render 0`、`child render 1`。点击一次后会再次打印 `app render 1`、`child render 1`。",
  "13": "日志顺序是：先打印 `A A`、`B B`，重排后再打印 `B A`、`A B`。",
  "14": "日志顺序是：先打印 `A A`、`B B`，重排后再打印 `B B`、`A A`。",
  "15": "输出顺序是：`child render 0 -> mount -> unmount -> child render 0 -> mount`。",
  "16": "组件会不断打印 `render n` 和 `effect n`，直到 React 抛出类似 `Maximum update depth exceeded` 的错误。",
  "17": "输出顺序是：`render 0 -> inside effect 0 -> render 5`。",
  "18": "输出顺序是：`render -> layout -> effect`。",
  "19": "首次渲染会打印 `same? false`。点击一次后仍然会打印 `same? false`。",
  "20": "通常只会看到一次 `render 1`。点击按钮不会触发新的有效重渲染。",
  "21": "输出顺序是：首次渲染打印 `app 0`、`child`；点击一次后打印 `app 1`、`child`。",
  "22": "输出顺序是：先打印 `init`，再打印 `render 0`。点击一次后只会打印 `render 1`。",
  "23": "最终会打印 `cleanup 0`。",
  "24": "第二次渲染会破坏 Hook 的调用顺序，React 会直接报错，常见报错类似 `Rendered fewer hooks than expected`。",
  "25": "首次渲染会打印 `render 0` 和 `effect`。之后每点击一次，都会再次打印对应的 `render n` 和 `effect`。",
  "26": "输出顺序是：首次渲染打印 `render 0`、`effect`；点击一次后只会打印 `render 1`，不会再次打印 `effect`。",
  "27": "首次挂载时会打印 `child 0`；点击一次后会再次打印 `child 1`。",
  "28": "首次挂载时会打印 `child 1`；点击一次后仍会再次打印 `child 1`。",
  "29": "不会。这个错误会从事件处理函数里直接抛出，错误边界不会渲染 fallback。",
  "30": "输出顺序是：先打印 `boundary`，然后渲染降级界面 `fallback`。",
  "31": "最终打印的是 `0`。",
  "32": "它会一直重复打印 `0`。",
  "33": "它会持续打印 `0`、`1`、`2`、`3`……不断递增。",
  "34": "输出顺序是：`render 0 -> click 0 -> render 1`。",
  "35": "输出顺序是：`init -> render 2`，点击一次后再打印 `render 3`。",
  "36": "输出顺序是：`render child 0 -> effect 0 -> render child 1 -> cleanup 0 -> effect 1`。",
  "37": "父组件里打印的是：`function hello`。",
  "38": "页面上会直接显示 `0`。",
  "39": "最终只会显示 `React`。",
  "40": "页面最终显示的是 `React`。",
  "41": "最终打印的是 `2`。",
  "42": "输入框里仍然显示 `hello`。",
  "43": "输入框里会显示 `world`。",
  "44": "输出顺序是：`render 0 -> handler start 0 -> handler end 0 -> render 1`。",
  "45": "输出顺序是：`render -> effect 1 -> effect 2`。",
  "46": "通常会看到 `render 0`，然后直接打印 `render 2`。",
  "47": "输出顺序是：`render 0 100`，点击一次后打印 `render 1 100`。",
  "48": "会打印两次 `child 100`。",
  "49": "输出顺序是：先打印 `child 1 1`，之后再打印 `child 2 1`。",
  "50": "输出顺序是：`render 0 0 -> render 1 2`。"
};

const categoryMap = {
  "Hooks / useState": "Hooks / useState",
  "State / batching": "状态 / 批处理",
  "State / functional updates": "状态 / 函数式更新",
  "Hooks / useEffect": "Hooks / useEffect",
  "Hooks / cleanup": "Hooks / 清理函数",
  "Closures / Hooks": "闭包 / Hooks",
  "Hooks / useRef": "Hooks / useRef",
  "Performance / useMemo": "性能 / useMemo",
  "Performance / useCallback": "性能 / useCallback",
  "Performance / React.memo": "性能 / React.memo",
  "Lists / key": "列表 / key",
  "Lifecycle / mount and unmount": "生命周期 / 挂载与卸载",
  "Hooks / timing": "Hooks / 执行时机",
  "Render model / references": "渲染模型 / 引用",
  "State / bailout": "状态 / 相同值跳过更新",
  "Render model / parent child": "渲染模型 / 父子组件",
  "Lifecycle / cleanup": "生命周期 / 清理阶段",
  "Hooks rules": "Hooks 规则",
  "Hooks / dependency comparison": "Hooks / 依赖比较",
  Context: "Context / 上下文",
  "Error handling / boundary": "错误处理 / 错误边界",
  "Hooks / dependency array": "Hooks / 依赖数组",
  "Hooks / closures": "Hooks / 闭包",
  "Hooks / functional update": "Hooks / 函数式更新",
  "Hooks / useReducer": "Hooks / useReducer",
  "Parent child / effects": "父子组件 / effect",
  "Refs / useImperativeHandle": "Refs / useImperativeHandle",
  "JSX basics": "JSX / 基础",
  "JSX / Fragment": "JSX / Fragment",
  "Forms / uncontrolled input": "表单 / 非受控输入",
  "Forms / controlled input": "表单 / 受控输入",
  "Events / render order": "事件 / 渲染顺序",
  "Hooks / ordering": "Hooks / 执行顺序",
  "Async updates / batching": "异步更新 / 批处理",
  "Render model / state": "渲染模型 / 状态",
  "State / props initialization": "状态 / props 初始化"
};

const difficultyMap = {
  Junior: "初级",
  Intermediate: "中级"
};

const tagMap = {
  useState: "useState",
  "initial state": "初始状态",
  rerender: "重渲染",
  batching: "批处理",
  setState: "setState",
  events: "事件",
  "functional update": "函数式更新",
  state: "状态",
  useEffect: "useEffect",
  "dependency array": "依赖数组",
  order: "顺序",
  cleanup: "清理函数",
  "update order": "更新顺序",
  closure: "闭包",
  timeout: "定时器",
  "stale state": "旧状态",
  useRef: "useRef",
  "latest value": "最新值",
  useMemo: "useMemo",
  dependencies: "依赖项",
  memoization: "记忆化",
  "parent child": "父子组件",
  rendering: "渲染",
  useCallback: "useCallback",
  effect: "effect",
  "function identity": "函数引用",
  "React.memo": "React.memo",
  props: "props",
  "object reference": "对象引用",
  "shallow compare": "浅比较",
  key: "key",
  list: "列表",
  "state reuse": "状态复用",
  "stable key": "稳定 key",
  identity: "身份标识",
  "conditional rendering": "条件渲染",
  unmount: "卸载",
  "state reset": "状态重置",
  "infinite loop": "无限循环",
  "stale value": "旧值",
  useLayoutEffect: "useLayoutEffect",
  timing: "执行时机",
  "same value": "相同值",
  bailout: "跳过更新",
  render: "渲染",
  "normal component": "普通组件",
  "lazy initializer": "惰性初始化",
  "initial render": "首次渲染",
  "hooks rules": "Hook 规则",
  "conditional hook": "条件 Hook",
  error: "错误",
  "stable object": "稳定对象",
  context: "上下文",
  provider: "Provider",
  consumer: "Consumer",
  "provider value": "Provider 值",
  "error boundary": "错误边界",
  "event handler": "事件处理函数",
  errors: "错误",
  "render error": "渲染错误",
  fallback: "降级界面",
  "stale closure": "旧闭包",
  function: "函数",
  setInterval: "setInterval",
  interval: "定时器",
  "latest state": "最新状态",
  useReducer: "useReducer",
  dispatch: "dispatch",
  "init function": "初始化函数",
  mount: "挂载",
  "effect order": "effect 顺序",
  forwardRef: "forwardRef",
  "imperative handle": "命令式句柄",
  ref: "ref",
  JSX: "JSX",
  "logical and": "逻辑与",
  "nullish rendering": "空值渲染",
  children: "children",
  "array children": "数组子节点",
  Fragment: "Fragment",
  "DOM structure": "DOM 结构",
  defaultValue: "defaultValue",
  input: "input",
  uncontrolled: "非受控",
  value: "value",
  "controlled input": "受控输入",
  forms: "表单",
  "console.log": "console.log",
  "multiple effects": "多个 effect",
  Promise: "Promise",
  "automatic batching": "自动批处理",
  "state split": "状态拆分",
  "component execution": "组件执行",
  remount: "重新挂载",
  initialization: "初始化",
  "multiple state values": "多个状态值"
};

const keyPointMap = {
  "useState initial value is used only on first render": "useState 的初始值只会在首次渲染时使用",
  "useEffect runs after commit": "useEffect 会在提交完成后执行",
  "setState triggers a new render": "setState 会触发一次新的渲染",
  "event handlers read the current render snapshot": "事件处理函数读取的是当前这次渲染的状态快照",
  "multiple updates can be batched": "多个更新会被批量处理",
  "setCount(count + 1) twice does not become 2 here": "这里连续两次 `setCount(count + 1)` 不会直接把结果变成 `2`",
  "functional updates receive latest queued state": "函数式更新能拿到队列中的最新状态",
  "batched updates can still accumulate": "即使被批处理，多个更新依然可以正确累加",
  "render happens before effect": "渲染一定先于 effect 执行",
  "changing dependency reruns the effect": "依赖变化后 effect 会重新执行",
  "cleanup sees previous closure values": "cleanup 读到的是上一次渲染闭包里的值",
  "cleanup runs before the next effect with changed deps": "依赖变化时，cleanup 会先于下一次 effect 执行",
  "timeout callback captures old render values": "定时器回调会捕获旧渲染中的值",
  "state updates do not mutate old closures": "状态更新不会修改旧闭包中的变量",
  "refs are mutable containers": "ref 是一个可变容器",
  "reading ref.current avoids stale state in many async cases": "在很多异步场景里，读取 `ref.current` 可以避免拿到旧状态",
  "useMemo recalculates only when dependencies change": "useMemo 只会在依赖变化时重新计算",
  "child still rerenders when parent rerenders": "父组件重渲染时，子组件函数本身仍可能重新执行",
  "memo callback is skipped if dependency is stable": "依赖稳定时，memo 的计算回调会被跳过",
  "useCallback creates a new function when dependencies change": "依赖变化时，useCallback 会生成新的函数引用",
  "effect depends on function identity here": "这里的 effect 依赖的是函数引用是否变化",
  "React.memo does shallow comparison": "React.memo 只做浅比较",
  "stable primitive props let React skip child rerender": "稳定的基础类型 props 可以让 React 跳过子组件重渲染",
  "object literals create new references": "对象字面量每次都会创建新的引用",
  "React.memo shallow compare fails on a new object reference": "遇到新的对象引用时，React.memo 的浅比较会判定 props 已变化",
  "index keys reuse instances by position": "使用 index 作为 key 时，组件实例会按位置复用",
  "state can move to the wrong item after reorder": "列表重排后，状态可能跑到错误的项上",
  "stable keys keep the correct identity": "稳定的 key 能保留正确的组件身份",
  "moving an item is different from replacing an item": "移动一个元素和替换一个元素在 React 看来不是同一件事",
  "rendering null unmounts the component": "渲染 `null` 会让组件卸载",
  "a remount creates a fresh state bucket": "重新挂载会得到一份全新的本地状态",
  "effects without dependency arrays run after every render": "没有依赖数组的 effect 会在每次渲染后执行",
  "an unconditional state update inside such an effect loops forever": "如果在这种 effect 里无条件更新状态，就会进入无限循环",
  "state updates schedule a future render": "状态更新只是安排下一次渲染",
  "the current closure value does not change immediately": "当前闭包中的值不会立刻变化",
  "layout effects run earlier than normal effects": "layout effect 的执行时机早于普通 effect",
  "render happens before either effect": "不管是哪一种 effect，渲染都会先发生",
  "component body runs again on every render": "每次重渲染时，组件函数体都会重新执行",
  "object literals are recreated each time": "对象字面量每次渲染都会重新创建",
  "React compares next and previous state values": "React 会比较新旧 state 的值",
  "equal state means no useful update": "如果新旧值相同，React 会认为这次更新没有实际变化",
  "normal children rerender with their parent by default": "默认情况下，普通子组件会跟着父组件一起重渲染",
  "lazy initialization happens only on mount": "惰性初始化只会在挂载时执行一次",
  "empty dependency effect keeps the mount-time closure": "空依赖 effect 会保留挂载当时的闭包",
  "hooks must be called unconditionally in the same order": "Hook 必须以固定顺序、无条件地调用",
  "dependency arrays compare references": "依赖数组比较的是引用而不是内容",
  "new object literal means changed dependency": "新的对象字面量就意味着依赖已变化",
  "useMemo can keep object identity stable": "useMemo 可以保持对象引用稳定",
  "consumers subscribe to provider value changes": "Consumer 会订阅 Provider value 的变化",
  "provider value object gets a new reference every render": "Provider 的对象 value 每次渲染都会得到新引用",
  "error boundaries do not catch errors from event handlers": "错误边界无法捕获事件处理函数里的错误",
  "boundaries catch render errors from descendants": "错误边界可以捕获后代组件渲染阶段抛出的错误",
  "the timeout stores the first render version of log": "这个定时器保存的是第一次渲染时的 `log`",
  "empty dependency arrays freeze that effect setup": "空依赖数组会把这次 effect 的初始化逻辑固定下来",
  "the callback reads stale state from its closure": "回调读取到的是闭包中的旧状态",
  "functional update fixes the state update but not the log value": "函数式更新能修正状态更新，但不会修正日志里读到的旧值",
  "functional updater receives the freshest state": "函数式 updater 总能拿到最新状态",
  "dispatch schedules a new render": "dispatch 会安排一次新的渲染",
  "the current event callback still sees the old state snapshot": "当前这个事件回调里看到的仍然是旧状态快照",
  "init runs only for the initial reducer state": "init 只会在 reducer 初始状态建立时执行一次",
  "render happens before cleanup and new effect commit work": "重新渲染会先发生，之后才是 cleanup 和新的 effect",
  "cleanup still sees the previous value": "cleanup 读到的仍然是上一次的值",
  "useImperativeHandle customizes the exposed ref value": "useImperativeHandle 可以自定义暴露给父组件的 ref 内容",
  "0 is a real renderable value in React": "`0` 在 React 里是一个可以被渲染出来的真实值",
  "logical and returns the left side when it is falsy": "逻辑与表达式在左侧为假值时会直接返回左侧",
  "false null and undefined are ignored as children": "`false`、`null`、`undefined` 作为 children 时会被忽略",
  "arrays can be valid React children": "数组本身也可以作为合法的 React children",
  "Fragment itself does not become a real DOM node": "Fragment 本身不会变成真实的 DOM 节点",
  "defaultValue sets only the initial value of an uncontrolled input": "`defaultValue` 只会设置非受控输入框的初始值",
  "controlled input value always follows state": "受控输入框的 `value` 会始终跟随 state",
  "event handlers finish synchronously before React processes the rerender": "事件处理函数会先同步执行完，React 再处理重渲染",
  "effects are executed in declaration order": "多个 effect 会按照声明顺序执行",
  "automatic batching also covers many async cases in React 18+": "React 18+ 的自动批处理也覆盖了很多异步场景",
  "functional updates still accumulate correctly": "函数式更新在这种场景里仍然可以正确累加",
  "the whole component function runs again on rerender": "组件一旦重渲染，整个函数体都会重新执行",
  "changing key means old instance is discarded and a new one is mounted": "key 一旦变化，旧实例会被丢弃并重新挂载新实例",
  "useState only uses the initial prop value once": "useState 只会在初始化时读取一次传入的 prop 值",
  "multiple state updates in the same effect are typically batched together": "同一个 effect 里的多个 state 更新通常会被合并批处理"
};

function extract(content, start, end) {
  const regex = new RegExp(`${start}\\n([\\s\\S]*?)\\n${end}`);
  const match = content.match(regex);
  return match ? match[1].trim() : "";
}

function getMeta(content, label) {
  const regex = new RegExp(`- ${label}: (.+)`);
  const match = content.match(regex);
  return match ? match[1].trim() : "";
}

for (let index = 1; index <= 50; index += 1) {
  const number = String(index).padStart(2, "0");
  const filePath = path.join(process.cwd(), "questions", `${number}.md`);
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");

  const category = getMeta(raw, "Category");
  const difficulty = getMeta(raw, "Difficulty");
  const tags = getMeta(raw, "Tags")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => tagMap[tag] ?? tag)
    .join(", ");

  const description = extract(raw, "## Description", "## Code");
  const code = extract(raw, "## Code", "## Answer").replace(/^```jsx\n/, "").replace(/\n```$/, "");
  const keyPointsBlock = extract(raw, "## Key Points", "## Detailed Explanation");
  const detailedExplanation = raw.match(/## Detailed Explanation\n([\s\S]*)$/)?.[1]?.trim() ?? "";

  const keyPoints = keyPointsBlock
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^- /, ""))
    .map((line) => `- ${keyPointMap[line] ?? line}`);

  const nextContent = `# React 输出题 ${number}：${titleMap[number]}

## 基本信息
- 分类：${categoryMap[category] ?? category}
- 难度：${difficultyMap[difficulty] ?? difficulty}
- 标签：${tags}
- 题型：阅读 React 代码并写出输出

## 题目描述
${description}

## 代码
\`\`\`jsx
${code}
\`\`\`

## 参考答案
${answerMap[number]}

## 考察点
${keyPoints.join("\n")}

## 详细讲解
${detailedExplanation}
`;

  fs.writeFileSync(filePath, `\uFEFF${nextContent}`, "utf8");
}

console.log("Localized 50 question files.");
