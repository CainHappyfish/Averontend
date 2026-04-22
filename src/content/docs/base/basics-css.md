## 盒模型与 box-sizing

一个盒子由四部分组成：`content`、`padding`、`border`、`margin`。

- `content`：实际内容区域（文本/图片）
- `padding`：内边距，透明，不能为负
- `border`：边框（宽度、样式、颜色）
- `margin`：外边距，元素与元素之间的距离

通过 `box-sizing` 控制盒模型计算方式：

```css
box-sizing: content-box; /* 标准盒模型（默认） */
box-sizing: border-box;  /* 怪异盒模型（常用） */
```

### 标准盒模型（content-box）

- 总宽度 = `width + padding + border + margin`
- 总高度 = `height + padding + border + margin`

即：`width/height` 只表示内容区大小。

### 怪异盒模型（border-box）

- 总宽度 = `width + margin`
- 总高度 = `height + margin`

即：`width/height` 已包含 `padding` 和 `border`。

---

## 选择器与优先级

常见权重：

- `#id`：100
- `.class` / `[attr]` / `:hover`：10
- `div` / `::before`：1
- 关系选择器（`>`、`+`、空格）和 `*` 本身不增加权重

优先级从高到低：

1. `!important`
2. 行内样式
3. ID 选择器
4. 类/伪类/属性选择器
5. 标签/伪元素选择器

---

## 可继承与不可继承属性

### 可继承（多为文本相关）

- `color`
- `font-size`
- `font-weight`
- `line-height`
- `cursor`

### 不可继承（多为布局相关）

- `margin`、`padding`、`border`
- `display`
- `background`
- `position`
- `width`、`height`

---

## display 常用取值

- `block`：块级，可设宽高，独占一行
- `inline`：行内，不可设宽高，不换行
- `inline-block`：行内块，可设宽高，不独占一行
- `flex`：弹性布局容器
- `table`：表格布局行为
- `none`：不显示且不占位

---

## 常见隐藏方式

- `display: none`：移出文档流，不占位
- `visibility: hidden`：占位但不可见
- `opacity: 0`：透明但仍可点击（取决于其它属性）
- 绝对定位移出可视区：`position: absolute; left: -9999px;`

---

## 文本溢出：单行与多行

### 单行省略

```css
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
```

### 多行省略（常见 WebKit 方案）

```css
overflow: hidden;
text-overflow: ellipsis;
display: -webkit-box;
-webkit-box-orient: vertical;
-webkit-line-clamp: 3;
```

---

## Sass 与 Less

它们都是 CSS 预处理器，提供变量、嵌套、复用、函数等能力。

主要区别：

1. 变量语法不同：`Less` 使用 `@`，`Sass/SCSS` 使用 `$`
2. 生态与实现不同：当前 Sass 主要是 `Dart Sass`；Less 有独立编译链
3. 语法能力侧重不同：Sass 在流程控制（条件、循环）上更常用

---

## link 与 @import 引入样式

- `link` 是 HTML 标签；`@import` 是 CSS 语法
- `link` 可并行加载；`@import` 通常依赖 CSS 解析后再加载
- `link` 兼容性与控制能力更好，工程中更推荐 `link`

---

## 常用 CSS 单位

- `px`：像素单位
- `%`：相对父元素
- `em`：相对当前元素字体大小（或父级上下文）
- `rem`：相对根元素字体大小
- `vw` / `vh`：相对视口宽高

---

## Flex 一维布局

`flex` 是一维布局模型，用于快速分配主轴/交叉轴空间。

常用属性：

- 容器：`display: flex`
- 主轴方向：`flex-direction`
- 是否换行：`flex-wrap`
- 主轴对齐：`justify-content`
- 交叉轴对齐：`align-items`
- 多行对齐：`align-content`

示例：

```html
<style>
  .container {
    display: flex;
    flex-wrap: wrap;
    width: 420px;
    height: 320px;
    gap: 10px;
    padding: 10px;
    border: 1px solid #0f172a;
    align-content: space-between;
  }

  .item {
    width: 100px;
    height: 80px;
    background: coral;
  }
</style>

<div class="container">
  <div class="item"></div>
  <div class="item"></div>
  <div class="item"></div>
  <div class="item"></div>
  <div class="item"></div>
  <div class="item"></div>
</div>
```

### flex: 1 表示什么

`flex: 1` 常等价于 `flex: 1 1 0%`（不同浏览器实现细节略有差异）：

- `flex-grow: 1`：可分配剩余空间
- `flex-shrink: 1`：空间不足时可收缩
- `flex-basis: 0%`：初始基准尺寸趋向 0

---

## BFC：是什么、如何创建

BFC（块级格式化上下文）是独立布局环境，可隔离内部与外部布局影响。

常见触发方式：

- `overflow: hidden/auto/scroll`
- `display: flow-root`（推荐）
- `float` 非 `none`
- `position: absolute/fixed`
- `display: inline-block/flex` 等

BFC 常见作用：

- 避免垂直 margin 重叠
- 清除浮动影响（解决父元素高度塌陷）
- 构建左右两栏等自适应布局

---

## 外边距折叠（margin 重叠）与处理

垂直方向相邻块级元素的 `margin` 可能合并（取更“强”的值），称为 margin collapsing。

解决方式（常用）：

- 给父元素创建 BFC（如 `overflow: hidden` 或 `display: flow-root`）
- 给父元素加边框/内边距
- 使用 `position` / `float` 改变元素格式化上下文

---

## position 常用值

- `static`（默认）：正常文档流
- `relative`：相对自身原位置偏移
- `absolute`：相对最近的定位祖先定位
- `fixed`：相对视口定位
- `sticky`：在滚动阈值前后切换相对/固定效果
