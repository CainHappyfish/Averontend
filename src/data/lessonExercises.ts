import type { LessonExercise } from '../types/lesson'

export const lessonExercisesByLessonId: Record<string, LessonExercise[]> = {
  'ch1-html': [
    {
      id: 'html-1',
      title: '语义骨架',
      relatedConcept: 'section / 标题 / 段落',
      task: '保持 `section.card` 结构，把主标题从 `h2` 改成更贴切的层级（如 `h1` 只出现一次），并为副标题或简介加一条 `small` 或 `p` 强调层次。',
      hints: [
        '整页只保留一个 `h1` 更利于可访问性与 SEO。',
        '不要堆太多 `div`，能用 `p`、`section` 就用语义标签。',
      ],
    },
    {
      id: 'html-2',
      title: '安全的外链',
      relatedConcept: '`target` 与 `rel`',
      task: '名片里至少一条站外链接同时写 `target="_blank"` 与 `rel="noreferrer noopener"`，避免新窗口拿到 `window.opener`。',
      hints: [
        '文档中 `opener` 风险在「安全习惯」一节有说明。',
        '属性名全小写即可，顺序随意。',
      ],
      starterCode: {
        html: `<section class="card">\n  <h2>我的前端名片</h2>\n  <p>在这里写一句自我介绍。</p>\n  <a href="https://vuejs.org/">访问 Vue 官网</a>\n</section>`,
      },
    },
    {
      id: 'html-3',
      title: '空元素与元信息',
      relatedConcept: 'void 元素 / `img`',
      task: '在标题与正文之间插入一张 `<img>`（可用 `https://vuejs.org/logo.svg`），写 `alt` 描述；保证是 void 写法或正确自闭合。',
      hints: [
        '空元素练习：图片没有闭合子内容，注意 `alt` 对读屏用户很重要。',
        '给 `img` 设 `width` / `height` 可避免布局抖动（选做）。',
      ],
      starterCode: {
        html: `<section class="card">\n  <h2>我的前端名片</h2>\n  <p>在这里写一句自我介绍。</p>\n  <a href="https://vuejs.org/" target="_blank" rel="noreferrer noopener">访问 Vue 官网</a>\n</section>`,
      },
    },
    {
      id: 'html-4',
      title: '页脚信息',
      relatedConcept: '区块与页脚',
      task: '在 `section.card` 之外增加 `<footer>`，写一行版权或「练习用」说明，与上面的 `section` 形成兄弟关系。',
      hints: [
        '页脚不必在 `section` 内，与主内容平级即可。',
        '可复用课内已有链接，练习的是结构位置。',
      ],
    },
  ],

  'ch1-css': [
    {
      id: 'css-1',
      scope: 'focus',
      title: '盒模型与 box-sizing',
      relatedConcept: '盒模型与 box-sizing',
      task: '在样式里为 `.card` 增加 `box-sizing: border-box;`，再设 `width: 320px` 与较厚 `padding`，观察总宽是否仍不超过 320px。',
      hints: [
        '对照文档「盒模型与 box-sizing」：border-box 下 width 含 padding/border。',
        '可临时改回 `content-box` 对比差异。',
      ],
    },
    {
      id: 'css-2',
      scope: 'focus',
      title: '选择器与状态',
      relatedConcept: '选择器与优先级、:hover / :focus-visible',
      task: '为链接写 `:hover` 与 `:focus-visible` 样式（如改色或下划线），保证键盘 Tab 聚焦时也能看见反馈。',
      hints: [
        '「选择器与优先级」：链式选择器 `.card a:hover` 往往就够了。',
        '`:focus-visible` 比单纯 `:focus` 更贴近键盘用户。',
      ],
    },
    {
      id: 'css-3',
      scope: 'focus',
      title: '层次与留白',
      relatedConcept: 'margin、圆角与 box-shadow',
      task: '用 `margin` 拉开 `h2` 与 `p` 的间距；给 `.card` 调整 `border-radius` 与 `box-shadow`，使层次明显但不过重。',
      hints: [
        'margin 不可继承，一般写在块级元素上。',
        '阴影和圆角属于「视觉层次」常用手段。',
      ],
    },
    {
      id: 'css-4',
      scope: 'focus',
      title: 'display 小实验',
      relatedConcept: 'display 常用取值',
      task: '给某段文字包一层 `span.tag`，在 CSS 里设 `display: inline-block`、`padding` 和浅背景，做成标签外观。',
      hints: [
        '「display 常用取值」：`inline-block` 可设 padding 又不太占整行。',
        '对比 `inline` 与 `inline-block` 在 DevTools 里看盒模型（选做）。',
      ],
    },
    {
      id: 'css-5',
      scope: 'synthesis',
      title: '样式小综合',
      relatedConcept: '盒模型 + 选择器/伪类 + margin/圆角/阴影 +（可选）inline-block',
      task: '用一道题把名片区做成「层次清楚、能感知可交互」：至少包含 box-sizing 与 width/padding、对链接的 :hover 或 :focus-visible、对卡片的圆角+阴影、以及用 margin 或 inline-block 标签拉开信息层级。不必与示例一模一样，以文档各节能力都能用上为准。',
      hints: [
        '综合题不对应单一 `##` 小标题，可对照多节自己取舍优先级。',
        '若某节还不熟，可先回到上面「单点」题再回来做本题。',
      ],
    },
  ],

  'ch1-js': [
    {
      id: 'js-1',
      scope: 'focus',
      title: '查询与日志',
      relatedConcept: '在页面里运行 JS、querySelector 与 console',
      task: '在脚本的最早位置用 `querySelector` 取到 `.card`，`console.log` 输出其 `className` 和 `textContent` 的前 20 个字符（可用 `slice`）。',
      hints: [
        '「DOM 与选择器」：找不到节点时做 null 保护。',
        '利用控制台确认脚本执行顺序与取到的节点是否正确。',
      ],
    },
    {
      id: 'js-2',
      scope: 'focus',
      title: '事件与 class',
      relatedConcept: '事件与 addEventListener、classList',
      task: '保留点击切换 `active` 的前提下，为按钮或卡片增加 `keydown`：按 Enter/Space 时也能触发展开或切换（若已有 `button` 则天然支持，可说明原因）。',
      hints: [
        '「事件与 addEventListener」：用 `?` 避免空引用。',
        '若用 `div` 当按钮，要补 `tabindex` 和键盘行为；优先用 `button`。',
      ],
    },
    {
      id: 'js-3',
      scope: 'focus',
      title: '阻止默认与冒泡',
      relatedConcept: 'Event 与 preventDefault',
      task: '在链接的 `click` 回调里 `preventDefault()`，在控制台用中文输出「已拦截本次跳转，练习用」；理解链接不再跳转的行为。',
      hints: [
        '事件对象在回调第一个参数，类型在 TS 中可标为 `Event` 或更细的 `MouseEvent`。',
        '练习后如需恢复链接，去掉监听或 `preventDefault` 即可。',
      ],
      starterCode: {
        html: `<section class="card">\n  <h2>我的前端名片</h2>\n  <p>在这里写一句自我介绍。</p>\n  <a id="out" href="https://vuejs.org/" target="_blank" rel="noreferrer noopener">访问 Vue 官网</a>\n</section>`,
        js: `const card = document.querySelector('.card')\nconst out = document.querySelector('#out')\n\ncard?.addEventListener('click', () => {\n  card.classList.toggle('active')\n})\n\n// 在下面为 out 添加 click 监听并 preventDefault、console\n`,
        css: `.card {\n  max-width: 320px;\n  margin: 48px auto;\n  padding: 20px;\n  border-radius: 14px;\n  background: #ffffff;\n  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);\n  cursor: pointer;\n}\n\nh2 { margin: 0 0 12px; }\na { color: #2563eb; }\n\n.card.active {\n  outline: 2px solid #6366f1;\n}\n`,
      },
    },
    {
      id: 'js-4',
      scope: 'synthesis',
      title: '交互小综合',
      relatedConcept: 'DOM 查询 + 事件 + classList + Event（及与 HTML/CSS 分工）',
      task: '在同一张名片上同时完成：点击 `.card` 切换 `active`；对页内某元素 `console.log` 一句状态；对站外链接在一次 `click` 中根据条件选择 `preventDefault` 或放行，并在控制台说明原因。可与文档中「分工」「安全习惯」对照自评。',
      hints: [
        '综合题要求把多节能力串起来，不必按固定顺序写，但结构建议：先取节点，再绑事件，再在回调里分工。',
        '若卡壳，先分别完成 js-1～js-3 再回到本题。',
      ],
    },
  ],

  'imp-01': [
    {
      id: 'im01-1',
      title: '列举八种类型与两条区别',
      relatedConcept: '原始 / 引用 与 BigInt、Symbol',
      task: '在笔记里写出 JS 的八种类型名；再各写一条：为什么业务里要减少依赖 `==`、为什么 `0.1 + 0.2` 的浮点问题不应用 `==` 和「看似整数」的字符串去糊。',
      hints: [
        'Symbol 和 BigInt 的用途能各举一招即可，不必长段背诵。',
        '浮点与 Number 的 IEEE 754 是同一套心智力。',
      ],
    },
    {
      id: 'im01-2',
      title: '手画 falsy 与一次隐式加号',
      relatedConcept: 'falsy 与 + 的 ToPrimitive',
      task: '默写经典 falsy 几种值，再在控制台各试 `Boolean(x)` 与 `x + 1`（选 `""`、`[]`、子串如 `"0"` 各一组），与文档对照差异。',
      hints: [
        '对象参与 `+` 时容易走 toString/ valueOf 路径。',
        '勿在生产里依赖这些技巧，练习只为建立直觉。',
      ],
    },
    {
      id: 'im01-3',
      title: 'substring 与 slice',
      relatedConcept: '子串 API 与负索引',
      task: '用同一组 `start/end` 或负索引在控制台对比 `str.substring` 与 `str.slice` 的差异；说明为何新代码更常用 `slice` 或 `slice`+`codePoint` 处理 Unicode。',
      hints: [
        'substring 的负参会被特殊处理，与 slice 很不一样。',
        'emoji/代理对的拆分见文档「与字符串」衔接句。',
      ],
    },
  ],

  'imp-02': [
    {
      id: 'im02-1',
      title: '真数组的四种判定',
      relatedConcept: 'Array.isArray 与跨 realm',
      task: '写一个小表：分别用 `toString` 判型、`__proto__`、`Array.isArray`、`instanceof` 在**普通**数组上跑一遍并记录；再用一句话写 `instanceof` 的可能坑（iframe）。',
      hints: [
        '面试/代码审优先背 `Array.isArray` 的理由。',
        '别在生产代码中依赖 `__proto__`。',
      ],
    },
    {
      id: 'im02-2',
      title: '类数组转真数组再 map',
      relatedConcept: 'Array.from 与 call',
      task: '构造一个 `length=2` 的类数组，分别用 `Array.from` 与 `slice.call` 转成真数组，再对结果各 `map` 一次。说明日常更推荐 `Array.from` 的可读点。',
      hints: [
        '若元素是**洞**，`Array.from` 的映射回调行为要对照规范。',
        '有 iterable 时优先走迭代协议（下一章）。',
      ],
    },
    {
      id: 'im02-3',
      title: '会改与不会改原数组各举三例',
      relatedConcept: 'splice 与 map',
      task: '从 MDN/文档各选三个「会改原数组」和三个「返回新值、默认不改原」的方法，在笔记里**写出方法名+一句副作用说明**；单独写清：为何说 `forEach`「没有返回值」。',
      hints: [
        'sort 的稳定性与比较函数是另一层话题。',
        '在 map 的回调里改**元素对象的属性**与「改数组结构」是两种东西。',
      ],
    },
  ],

  'imp-03': [
    {
      id: 'im03-1',
      title: '浅拷贝一层与两层',
      relatedConcept: 'Object.assign 与 展开',
      task: '写 `const a = { x: 1, y: { z: 2 } }`，分别用**展开**与 `Object.assign` 得 `b`，只改 `b.y.z` 看 `a` 变不变；用一句话下结论，并点出「和深拷贝的边界」。',
      hints: [
        '可顺带试 `const b = { ...a, y: { ...a.y } }` 的局部深一点的写法（仍是局部）。',
        '`structuredClone` 能否克隆函数要查当前环境支持。',
      ],
    },
    {
      id: 'im03-2',
      title: 'for…in 与 for…of 各一道',
      relatedConcept: '可枚举键与迭代值',
      task: '对**数组** `["a","b"]`：用 `for...in` 和 `for...of` 各打印一轮，观察键与值；再对**普通对象**只写**推荐**的遍历方式（`Object.keys` 或 `entries`），并说明白为什么不直接 `for...of` 空对象（除非自己挂 iterator）。',
      hints: [
        '可配合 `Object.create` 在原型上放一个可枚举个体会污染 `for...in` 的题。',
        '面试若背错「in/of 谁取键值」要当场纠正。',
      ],
    },
    {
      id: 'im03-3',
      title: '手写 Symbol.iterator 可选',
      relatedConcept: '可迭代协议',
      task: '按文档的 generator 版本或直接用 `Object.entries` 二选一在控制台跑通「对象也能 for of」；在笔记中写**日常更偏 `entries` 的务实理由**。',
      hints: [
        'Symbol.iterator 适合理解协议；项目里要克制滥用。',
        '与 `for await` 区分：后者针对异步可迭代，不在本题范围。',
      ],
    },
  ],

  'imp-04': [
    {
      id: 'im04-1',
      title: 'this 四行代码预测',
      relatedConcept: '显式/隐式/默认/箭头',
      task: '把文档中 `f1`/`f2`/`foo.fn`/`fn1` 的几段在控制台**亲自跑**，结果与预期不一致就改笔记解释；再自己写**一行** `call` 让某函数在指定对象上执行。',
      hints: [
        '严格模式、是否属性访问、是否 `new`，都会换绑。',
        '事件监听里常丢 `this`，`bind` 是常用解。',
      ],
    },
    {
      id: 'im04-2',
      title: '画三条原型链',
      relatedConcept: 'prototype 与 `__proto__`',
      task: '选一构造函数 + 一实例，写出「实例.__proto__ → … → null」的链**文字版**即可；再写 `instanceof` 与**原型链**的关系一句。',
      hints: [
        '建议同时用 `Object.getPrototypeOf` 对照旧式写法。',
        '若涉及 `class` 语法，记住仍是原型语义糖。',
      ],
    },
    {
      id: 'im04-3',
      title: 'var 循环 + setTimeout 再练',
      relatedConcept: '闭包 + 块级',
      task: '复现文档/经典 `var`+循环+`setTimeout` 打印同一 `i` 的题，再分别用 **IIFE 传参** 与 **`let` 头** 修掉；在笔记里用一句话写清「为什么**能**修好」。',
      hints: [
        '若用 `forEach`+箭头，体会词法 `i` 与参数 `i`。',
        '不依赖「面试背答案」，要能讲执行上下文/任务队列的粗糙因果。',
      ],
    },
  ],

  'imp-05': [
    {
      id: 'im05-1',
      title: '列四类泄漏 + 一修复',
      relatedConcept: '全局/定时器/DOM/闭包',
      task: '从文档的四个大类里，每类**写一句**你见过或能想象的「症状」，再为其中一类写**可操作的**防法（如 `clearInterval`、解绑、置 `null`）。',
      hints: [
        '现代框架的生命周期要挂在「卸载/路由离开」的语义上想。',
        'WeakMap/WeakSet 的弱引用是手段不是万能药。',
      ],
    },
    {
      id: 'im05-2',
      title: '用段落话讲清新老生代',
      relatedConcept: '分代、复制、标记整理',
      task: '不看文档，**口述**「为何需要分代」「新生代/老生代在直觉上各处理哪类对象」；对不上再打开 `imp-05` 对照划词，只改自己的表述。',
      hints: [
        '别和「进程/线程」混淆；在谈的是**堆上的对象图**与**可达性**。',
        '**Major/Minor 名称**以 V8/版本文档为准，面试答观念即可。',
      ],
    },
    {
      id: 'im05-3',
      title: '引用计数与环',
      relatedConcept: 'RC 的局限与标记-清除',
      task: '用伪代码或文字写「两个对象互相引用、其它都断链」为什么**纯引用计数**可能不回收，而**标记-清除/可达**能处理；不展开 V8 细节，点到为止。',
      hints: [
        'DOM 与 JS 的环在老 IE 时代更常被提起，**现代**仍要理解**可达性**本质。',
        '若学有余力，读一眼官方垃圾回收的「并发/增量」是加分项，非必答。',
      ],
    },
  ],

  'imp-06': [
    {
      id: 'im06-1',
      title: 'all 与 allSettled 二选一',
      relatedConcept: '团队成功 vs 分结果',
      task: '设想「并行请求 3 个接口，**一处失败就全失败**」和「**都跑完**再分别提示谁失败」两种产品需求，各写一句**为什么**选 all 或 allSettled；再写**一句** `race` 的适用题。',
      hints: [
        '若要做「**首个成功**」的退化策略，要再想封装层，不单靠裸 `race`。',
        '`any`（有环境支持时）是另一套语义，和 `race` 不同。',
      ],
    },
    {
      id: 'im06-2',
      title: 'try/catch await 的拒绝',
      relatedConcept: '与 then/catch 对照',
      task: '写一段 `async` 里故意 `await Promise.reject(1)`，**不用** `try` 时观察控制台；再加上 `try/catch` 各跑一遍。记录：**未处理拒绝** 与 **已捕获** 在控制台/监控上的区别。',
      hints: [
        '在顶层 await/某些打包配置下，行为可能略有不同，**以你环境为准**。',
        '可顺带写一行 `.catch` 的等价与链式 return。',
      ],
    },
    {
      id: 'im06-3',
      title: 'for 里串行 await 的坑',
      relatedConcept: '并发与 Promise.all',
      task: '写伪代码：`for` 中 `await` 请求 URL 列表 → 再写 `Promise.all(urls.map(u => fetch(u)))` 的平行版；在笔记中写**一句**各适用场景（**顺序敏感**的接口 vs **独立**的只读拉取）。',
      hints: [
        '并发要注意**服务端的并发与浏览器连接数**限制。',
        '若需**限流**再引入队列或 p-limit 等模式。',
      ],
    },
  ],

  'imp-07': [
    {
      id: 'im07-1',
      title: 'fetch 的「假成功」',
      relatedConcept: 'HTTP 状态与 `Response.ok`',
      task: '在本地或只读沙盒里用 `fetch` 请求一个**明确返回 404 的地址**（或 mock），打印 `res.ok` 与 `res.status`；再写**一句**你封装请求层时要在哪一层**抛**业务错。',
      hints: [
        'CORS/网络错与 4/5xx 的**reject** 行为不同。',
        'axios 的默认拦截与 fetch 的**无拦截**对比，是设计差异。',
      ],
    },
    {
      id: 'im07-2',
      title: 'require 缓存一段话',
      relatedConcept: 'module.exports 单例',
      task: '用自己的话写：`require` 同路径**第二次**起为何**不**再跑模块顶层、这对「**有副作用**的 import」意味着什么；**不要**在答案里用「黑魔法清缓存上生产」作正解。',
      hints: [
        'ESM 的**静态**与**去重**是另一套故事，能对照一句即过关。',
        '可提 `import()` 的**按条件**加载是工程上常见解。',
      ],
    },
    {
      id: 'im07-3',
      title: 'let 与 var 的 TDZ 自测',
      relatedConcept: '块级与暂时性死区',
      task: '在同一 `<script>` 或模块里，写**两段**最小代码：一段在**声明前** `console.log` `let` 与 `var` 各一；观察报错差异；**一句**说清 TDZ 是在防什么类 bug。',
      hints: [
        '在**循环头**的 `let` 与**每次迭代**的绑定，是进阶题，可自测不强制。',
        'TypeScript/ESLint 会帮你把一大半类 TDZ/重复声明 挡在**编译前**。',
      ],
    },
  ],

  'eng-01': [
    {
      id: 'eng01-1',
      title: '统一 Node 版本',
      relatedConcept: 'nvm 与 engines',
      task: '在本机终端执行 `node -v` 与 `npm -v`（或 pnpm 版本），若与团队不一致，用 nvm 切到与文档建议接近的大版本，并写在笔记里各一行。',
      hints: [
        '若用 nvm：`nvm install <版本>` 后 `nvm use`，必要时设 `nvm alias default`。',
        '可对照你所在仓库根目录 `package.json` 的 `engines` 字段（若有）。',
      ],
    },
    {
      id: 'eng01-2',
      title: '读 scripts',
      relatedConcept: 'package.json 与 npm run',
      task: '打开本教学仓库或任意一个 Vite 项目的 `package.json`，列出 `dev`、`build`、`preview` 三条 scripts 的原文（可截图或复制到笔记），并口头区分各自用途。',
      hints: [
        'Vite 项目里常见：`vite`、`vite build`、`vite preview`。',
        '不必在本站编辑器里改代码，以本地只读分析为主。',
      ],
    },
    {
      id: 'eng01-3',
      title: '显式声明依赖',
      relatedConcept: 'dependencies 与幽灵依赖',
      task: '任选一个你业务里实际 `import` 的第三方包名，在所在项目的 `package.json` 的 `dependencies` 或 `devDependencies` 中定位它；若发现曾「靠传递依赖能跑」的用法，用一句话记笔记说明为何应改为显式声明。',
      hints: [
        'pnpm 的严格 `node_modules` 更容易暴露未声明的引用问题。',
        '不必提交笔记，自测能讲清即可。',
      ],
    },
  ],

  'eng-02': [
    {
      id: 'eng02-1',
      title: '找 alias 与 env',
      relatedConcept: 'vite.config 与 import.meta.env',
      task: '在本地打开本仓库的 `vite.config.ts`（或 `.mts`），找到 `resolve.alias` 中与 `@` 相关的配置，并写一句 `import.meta.env` 在业务代码中用来读什么、客户端可见变量前缀要求是什么（照文档原句或自己的理解即可）。',
      hints: [
        'alias 常配合 `fileURLToPath` 与 `import.meta.url`。',
        '只有带 `VITE_` 前缀的变量才会进客户端，具体以项目为准。',
      ],
    },
    {
      id: 'eng02-2',
      title: '预构建目录',
      relatedConcept: 'node_modules/.vite',
      task: '本地执行一次 `npm run dev` 启动后（或启动完成后关闭），在资源管理器或 `ls` 中查看 `node_modules/.vite` 是否存在，并记一句话：第一次启动与依赖变更时这里会怎样（参照文档「预构建」一节）。',
      hints: [
        '若目录不存在，可能是尚未成功 dev 过或环境不同，可说明情况即可。',
        '不必为练习删除整个 `node_modules`。',
      ],
    },
    {
      id: 'eng02-3',
      title: 'Barrel 的取舍',
      relatedConcept: 'index 桶与循环依赖',
      task: '任选一个你项目里的 `index.ts` 或 `index.js` 桶文件，写出它对外 re-export 了哪两类模块；再用一句话写：若把过多模块都聚在一个 barrel 里，文档提示会有什么问题。',
      hints: [
        '对照文档「导出面别过大」与「循环依赖」两点。',
        '用笔记完成即可，无需改本站代码。',
      ],
    },
  ],

  'eng-03': [
    {
      id: 'eng03-1',
      title: 'fetch 与 pull',
      relatedConcept: 'git fetch 与 pull',
      task: '在本地终端中进入任意 git 仓库，执行 `git fetch`（或只学习其含义），用一两句话写清 `fetch` 与 `pull` 的差异；不必 merge，安全起见可在你自己的练习分支上操作。',
      hints: [
        '`pull` 会合并；`fetch` 只更新远程引用到本机，更安全先看清差异。',
        '有未提交修改时优先 `stash` 或先提交再拉。',
      ],
    },
    {
      id: 'eng03-2',
      title: 'rebase 风险',
      relatedConcept: 'merge 与 rebase',
      task: '用自己的话写三点：在「已推送到远端的公共分支」上强推 rebase 可能伤害什么；本地整理提交时 rebase 更常见于什么场景。',
      hints: [
        '参照文档中「改写已推送 hash」「公共分支」相关句子。',
        '能结合团队 flow（如 main + feature 分支）举例加分。',
      ],
    },
    {
      id: 'eng03-3',
      title: '各写一条 import 与 require',
      relatedConcept: 'ESM 与 CJS',
      task: '在笔记中各写**一行**合法示例：一行为 ESM 的 `import`（可伪代码）；一行为 CJS 的 `require`（可伪代码），并标一句「新前端源码优先用哪一种」。',
      hints: [
        '不必运行；以语法识别为主。',
        'Vite/打包器常把 CJS 依赖预构建成 ESM 给浏览器用，与「自己写新代码用 ESM」不矛盾。',
      ],
    },
  ],

  'ts-01': [
    {
      id: 'ts01-1',
      title: '三元组元组',
      relatedConcept: 'tuple 定长定型',
      task: '声明一个 `[string, number, boolean]` 的元组变量并合法赋值；再故意少赋一项看编译报错，理解「元组是数组的特例」。',
      hints: [
        '可顺带试 `readonly [string, number]` 与 push 的宽松行为（以当前 TS 行为为准，知道有坑即过关）。',
      ],
    },
    {
      id: 'ts01-2',
      title: 'string enum 补全',
      relatedConcept: 'enum initializer',
      task: '按文档中 `Direction` 的写法复现 `TS1061`；再改为四个方向都带字符串 initializer，能编译通过即过关。',
      hints: [
        '与数字自增 enum 的对比可在笔记里各写一句。',
      ],
    },
    {
      id: 'ts01-3',
      title: '返回 never 的函数',
      relatedConcept: '底类型与抛出',
      task: '写一个返回类型标为 `never` 的函数，函数体为 `throw new Error`；再写一句注释说明「正常路径不得返回值」。',
      hints: [
        '可对比「无限 while(true) 不写 break」的 never，选做不强制。',
      ],
    },
  ],

  'ts-02': [
    {
      id: 'ts-2',
      title: '精确字段',
      relatedConcept: 'interface 与可选属性',
      task: '给 `User` 增加只读或可选字段，如 `readonly id: string` 或 `avatarUrl?: string`，在创建对象时合法赋值。',
      hints: [
        '只读一旦赋值便不可在运行时再改，体会与设计数据模型的关系。',
      ],
    },
    {
      id: 'ts-3',
      title: '联合与收窄',
      relatedConcept: '联合类型、字面量、typeof',
      task: `声明 type Role 为 'guest' | 'member' | 'admin' 三种字面量，在 greet 里用 switch 或 if 为三种角色各返回一句不同欢迎语，并保证 return 覆盖所有情况。`,
      hints: [
        '开启严格模式下若漏分支会报「不是所有路径都有返回值」。',
        '可配合 `as const` 存一组键值（选做）。',
      ],
    },
    {
      id: 'ts-4',
      title: '小工具函数',
      relatedConcept: '类型标注的函数',
      task: '写 `function pickName(u: User): string { return u.name }`，再为「是否为会员」写带类型谓词的守卫函数，体会收窄前后 IDE 提示的差异（可与文档中的 User 结构对照）。',
      hints: [
        '类型谓词略进阶，能写简单版「判断 role 是否为 member」的 if 即过关。',
      ],
    },
  ],

  'ts-03': [
    {
      id: 'ts03-1',
      title: 'Pick 一屏字段',
      relatedConcept: 'Pick',
      task: '定义 `interface Profile` 含 id/name/bio/avatar 等，再用 `Pick<Profile, "id" | "name">` 得一个只含两项的类型，并声明变量合法赋值。',
      hints: [
        'IDE 对 Pick 的悬停就是「最好的文档」。',
      ],
    },
    {
      id: 'ts03-2',
      title: 'Omit 掉敏感键',
      relatedConcept: 'Omit + Exclude 心智',
      task: '在同一 `Profile` 上用 `Omit<Profile, "id">` 得「不含 id」的视图类型；口述一句 `Omit` 与「手动 Pick 补集」的等价直觉。',
      hints: [
        '若键联合写错，会得到 `never` 洞或空对象，可故意试一次。',
      ],
    },
    {
      id: 'ts03-3',
      title: 'Partial 更新体',
      relatedConcept: 'Partial',
      task: '为「PATCH 用户」写 `type UserPatch = Partial<Pick<Profile, "name" | "bio">>`（`Profile` 可自定），只填部分键的对象并通过类型检查。',
      hints: [
        '结合 HTTP PATCH 的语义在笔记里对「为何用 Partial」写一句。',
      ],
    },
  ],

  'ts-04': [
    {
      id: 'ts04-1',
      title: 'ReturnType 抽异步结果',
      relatedConcept: 'ReturnType 与 async',
      task: '写 `const f = async () => ({ ok: true, data: 1 })`，再声明 `type R = Awaited<ReturnType<typeof f>>`（或拆 await，按你环境支持的写法），在悬停中确认 `data` 类型。',
      hints: [
        '若未开较新 `lib` 对 `Awaited` 不友好，可只写 `ReturnType<typeof f>` 再讨论 Promise 包一层。',
        '以「能说明 Promise 多包一层」为过关，不必背版本号。',
      ],
    },
    {
      id: 'ts04-2',
      title: 'NonNullable 去空',
      relatedConcept: 'null | undefined 与联合',
      task: '声明 `type S = string | null | undefined`，再写 `type T = NonNullable<S>` 并在变量上体会赋值约束；在笔记里点出 NonNullable 与运行时判空的边界。',
      hints: [
        '对照你安装目录 `lib` 里 `NonNullable` 的真实实现。',
      ],
    },
    {
      id: 'ts04-3',
      title: 'infer 一行的直觉',
      relatedConcept: '条件类型 + infer',
      task: '阅读文档中 `ReturnType` 的「`infer R`」行，能用自己的话写「R 在**哪一侧**被**推断**出来」；不必自写复杂 infer。',
      hints: [
        '进阶题可试 `Parameters<typeof fn>` 与第一个参数类型，选做。',
      ],
    },
  ],

  'vue-01': [
    {
      id: 'vue01-1',
      title: '多状态同屏',
      relatedConcept: 'ref 与 template',
      task: '在 `setup` 中增加 `label`（`ref`）与 `count`，在 `template` 里**同时**显示「标签」和计数。',
      hints: ['多份文案引用同一 `ref` 时，会一起随数据更新。'],
    },
    {
      id: 'vue01-2',
      title: '集中改状态',
      relatedConcept: 'reactive 与 Object.assign',
      task: '把计数与标签放进**同一个** `reactive({ count, label })`（或 `ref({ ... })`），并写一个 `function bump() { ... }` 在点击时**只通过该函数**改 `count`（不直接在模板里 `count++` 也可，但本题为体会「单入口改状态」）。',
      hints: [
        '小应用里「单入口」和 Pinia action 的直觉类似：改数据经过统一函数。',
        '在 `setup` 里 return `bump` 供模板 `@click`。',
      ],
    },
    {
      id: 'vue01-3',
      title: '封顶与派生提示',
      relatedConcept: 'v-bind 与条件文案',
      task: '当 `count >= 5` 时，按钮加 `:disabled="true"` 条件（如 `:disabled="count >= 5"`），并把提示文案在模板里用 `v-if` / 三元 显示为「已封顶」。',
      hints: [
        '不要再用手写 `innerHTML`；支路写在 `template` 中。',
        '对比：以前手写 `render` 时每次会重绑事件，现在由 Vue 做更新。',
      ],
    },
  ],

  'vue-02': [
    {
      id: 'vue02-1',
      title: '插值小面板',
      relatedConcept: '{{ }} 与表达式',
      task: '在 `setup` 中 `ref` 出 `name` 与 `n`，在 `template` 中写 `你好，{{ name }}，两倍的 n 是 {{ n * 2 }}`。',
      hints: ['插值 = 双花括号里的表达式。'],
    },
    {
      id: 'vue02-2',
      title: '`:href` 与 `target`',
      relatedConcept: 'v-bind 与 attribute',
      task: '在 `template` 中写链接：`:href`、`:title`、`target=\"_blank\"`、`rel=\"noreferrer noopener\"`；`url`/`tip` 来自 `setup` 的 `ref`。',
      hints: [':href / :title 即属性绑定；新窗口要配 `rel` 防 opener。', '若外链在沙箱被拦截，以代码写对为准。'],
    },
    {
      id: 'vue02-3',
      title: '@click 切换',
      relatedConcept: 'v-on 与 :class',
      task: '用 `ref` 做布尔量 `on`，`@click` 取反；用 `:class` 或 `:style` 切换亮/暗背景块。',
      hints: ['`@click` 直接绑 `setup` 中 return 的函数。'],
    },
  ],

  'vue-03': [
    {
      id: 'vue03-1',
      title: '多字段 form 对象',
      relatedConcept: 'reactive 与 v-model',
      task: '用 `reactive({ name: \'\', city: \'上海\' })` 作为 `form`，`template` 里用 `v-model` 绑 `input` 与 `select` 的 `form.city`。',
      hints: ['不要解构出 `form` 再当响应式用。'],
    },
    {
      id: 'vue03-2',
      title: '体会 ref 的 .value',
      relatedConcept: 'ref 的间接层',
      task: '单独用 `const count = ref(0)`，在 `setup` 里**显式**用 `count.value++` 写在一个方法中给按钮 `@click`；`template` 中仍用 `{{ count }}`。',
      hints: [
        '脚本里与模板里对 `ref` 的写法差异是刻意练习。',
        '对应文档：script 中 `.value`，模板中自动解包。',
      ],
    },
    {
      id: 'vue03-3',
      title: '批量 Object.assign',
      relatedConcept: 'reactive 部分更新',
      task: '写 `function applyPatch(p) { Object.assign(form, p) }`（`form` 为 `reactive` 对象），一次调用同时改 `name` 与 `city`。',
      hints: ['`Object.assign` 合并进已有 reactive 时仍保持代理。'],
    },
  ],

  'vue-04': [
    {
      id: 'vue04-1',
      title: '派生全名',
      relatedConcept: 'computed',
      task: '用 `ref` 放 `first`、`last`，`computed` 得到 `full`；`template` 只展示 `{{ full }}`。',
      hints: [
        '不要在别处再维护一份会抄错的「第三份」全名字符串。',
        '`computed` 会按依赖缓存。',
      ],
    },
    {
      id: 'vue04-2',
      title: 'watch 打日志',
      relatedConcept: 'watch(new, old)',
      task: '维护 `userId`（`ref`），`watch(userId, (n, o) => { ... })` 里把 `old → new` 推入 `log`（`ref` 包数组即可），在模板中列出最近 3 条。',
      hints: [
        '在 watch 回调里用 `n` 与 `o`；若需要首次也记，可设 `immediate: true`。',
        '不必手写「对比上次」的临时变量。',
      ],
    },
    {
      id: 'vue04-3',
      title: '避免在 computed 里做副作用',
      relatedConcept: 'computed 纯净',
      task: '确保 `full` 的 `computed` **只** return 组合字符串；若要在变化时打 log，用 `watch` 或按钮事件，在注释中写一句原因。',
      hints: [
        '与文档一致：派生不碰副作用。',
        '副作用放在 `watch` 或用户事件里。',
      ],
    },
  ],

  'vue-05': [
    {
      id: 'vue05-1',
      title: 'v-for 列表',
      relatedConcept: 'v-for 与 :key',
      task: '准备 `items: { id, label }[]`（`ref` 或 `reactive`），`v-for` 渲染列表，`:key="item.id"`，点击用 `activeId` 高亮当前项（`:class`）。',
      hints: [':key 用**稳定**业务 id。'],
    },
    {
      id: 'vue05-2',
      title: 'v-if 与 v-show 对照',
      relatedConcept: '存在与否 vs 显隐',
      task: '同一布尔 `showPanel`：一块用 `v-if` 包内容，另一块用 `v-show`；在注释中写一句二者差异（节点是否销毁子树）。',
      hints: [
        '可配合「子树里有 input」观察焦点是否被拆掉。',
      ],
    },
    {
      id: 'vue05-3',
      title: '事件修饰 .prevent',
      relatedConcept: '事件修饰',
      task: '`<form @submit.prevent="onSubmit">`，`onSubmit` 里**不要**真提交；`console` 或页面提示已拦截默认行为。',
      hints: [
        '`.prevent` 即对 `submit` 调用 `e.preventDefault()`，避免整页刷新。',
      ],
    },
  ],

  'vue-06': [
    {
      id: 'vue06-1',
      title: 'v-model 文本',
      relatedConcept: 'v-model 与 input',
      task: '用 `v-model` 绑 `text`；再写一版拆成 `:value` + `@input`（在 `@input` 里写回 `text`），在注释中对应「v-model 的两部分」。',
      hints: [
        '拆写帮助理解，日常优先 `v-model`。',
      ],
    },
    {
      id: 'vue06-2',
      title: '子组件 + emit',
      relatedConcept: 'props 与 emit',
      task: '用 `defineComponent` 写子组件，**根逻辑在 `setup()` 中**；声明 `props` 与 `emits`，在 `setup` 里返回模板要用到的项；`template` 里按钮 `emit(\'bump\')`；**不要** 使用 `data()` / `methods`（选项式）。父根在 `@bump` 里改 `msg`。',
      hints: [
        '无 SFC 时，子组件写在与 `createApp` 同一份脚本中即可；`props`/`emits` 可与 `setup` 同写在 `defineComponent` 选项里，仍属 Composition API。',
      ],
    },
    {
      id: 'vue06-3',
      title: 'trim 修饰',
      relatedConcept: 'v-model 修饰符',
      task: '对输入使用 `v-model.trim`，或自己比较「输入时 trim」与「提交时 trim」的取舍，用注释说明。',
      hints: [
        '`.trim` 修饰符与在回调里对字符串 `trim()` 的取舍不同。',
      ],
    },
  ],

  'vue-07': [
    {
      id: 'vue07-1',
      title: '具名 / 作用域插槽',
      relatedConcept: '作用域插槽',
      task: '子组件 `List` 用 `v-for` + `<slot name="row" :item="item" />`；父用 `<template #row="{ item }">` 自定义列内容。',
      hints: [
        '数据在子、展示在父 = 作用域插槽典型形态。',
      ],
    },
    {
      id: 'vue07-2',
      title: 'onMounted 计时',
      relatedConcept: 'onMounted 与 onUnmounted',
      task: '在 `onMounted` 里 `setInterval` 自增秒数，在 `onUnmounted` 或「停止」按钮里 `clearInterval`。',
      hints: [
        '计时器在卸载时必须清理，与真实应用一致。',
      ],
    },
    {
      id: 'vue07-3',
      title: '不在无关处叠监听',
      relatedConcept: '副作用位置',
      task: '避免在**每次**会反复调用的逻辑里 `addEventListener`；事件尽量写在 `template` 的 `@` 上，或只在 `onMounted` 里注册一次。',
      hints: [
        '副作用应挂在稳定生命周期，而不是会频繁重跑的路径里。',
      ],
    },
  ],

  'vue-08': [
    {
      id: 'vue08-1',
      title: 'provide / inject',
      relatedConcept: '依赖注入',
      task: `在根 createApp 的 setup 里 使用 provide('theme', themeRef)、子组件用 inject 取并切换；key 可先用 string，生产环境建议 Symbol。`,
      hints: [
        '与把状态塞在「模块级变量」里比，`provide`/`inject` 更贴子树传配置的心智。',
      ],
    },
    {
      id: 'vue08-2',
      title: 'useCounter composable',
      relatedConcept: '可复用逻辑',
      task: '写 `function useCounter(n0 = 0) { const n = ref(n0); ...; return { n, inc, reset } }`，在**两个**子组件/两次调用中各用一份，证明状态独立。',
      hints: [
        '每次 `useCounter()` 各有一份 `n`，即 composable 多实例独立。',
      ],
    },
    {
      id: 'vue08-3',
      title: 'Router vs Pinia 一句话',
      relatedConcept: '工程边界',
      task: '在代码注释中各写**一句**：Router 解决什么问题、Pinia 解决什么问题；不必写具体 API（本题为概念）。',
      hints: [
        '一句概括 URL/视图/导航 与 跨组件业务状态/异步 的分工即可。',
      ],
    },
  ],
}

export const getLessonExercises = (lessonId: string) => lessonExercisesByLessonId[lessonId] ?? []
