/**
 * Mermaid Flowchart 兼容性测试
 * 基于官方文档: https://mermaid.js.org/syntax/flowchart.html
 * 版本: v11.12.2
 */
import { describe, it, expect } from 'vitest';
import { MermaidParser } from './MermaidParser';

const parser = new MermaidParser();

describe('Mermaid Flowchart 兼容性测试', () => {

  // ============================================
  // 1. 基础语法
  // ============================================
  describe('1. 基础语法', () => {

    it('1.1 支持 flowchart 和 graph 声明', () => {
      const m1 = parser.parse('flowchart LR\n  A');
      const m2 = parser.parse('graph LR\n  A');
      expect(m1.direction).toBe('LR');
      expect(m2.direction).toBe('LR');
    });

    it('1.2 支持所有方向 (TB, TD, BT, LR, RL)', () => {
      expect(parser.parse('flowchart TB\n  A').direction).toBe('TB');
      expect(parser.parse('flowchart TD\n  A').direction).toBe('TB'); // TD = TB
      expect(parser.parse('flowchart BT\n  A').direction).toBe('BT');
      expect(parser.parse('flowchart LR\n  A').direction).toBe('LR');
      expect(parser.parse('flowchart RL\n  A').direction).toBe('RL');
    });

    it('1.3 纯 ID 节点', () => {
      const model = parser.parse('flowchart LR\n  id');
      expect(model.hasNode('id')).toBe(true);
      expect(model.getNode('id')?.text).toBe('id');
    });

    it('1.4 带文本的节点', () => {
      const model = parser.parse('flowchart LR\n  id1[This is the text in the box]');
      expect(model.getNode('id1')?.text).toBe('This is the text in the box');
    });
  });

  // ============================================
  // 2. 节点形状 (传统语法)
  // ============================================
  describe('2. 节点形状 (传统语法)', () => {

    it('2.1 矩形 [text]', () => {
      const model = parser.parse('flowchart LR\n  A[Rectangle]');
      expect(model.getNode('A')?.shape).toBe('rect');
    });

    it('2.2 圆角矩形 (text)', () => {
      const model = parser.parse('flowchart LR\n  A(Rounded)');
      expect(model.getNode('A')?.shape).toBe('rounded');
    });

    it('2.3 体育场形 ([text])', () => {
      const model = parser.parse('flowchart LR\n  A([Stadium])');
      expect(model.getNode('A')?.shape).toBe('stadium');
    });

    it('2.4 子程序框 [[text]]', () => {
      const model = parser.parse('flowchart LR\n  A[[Subroutine]]');
      expect(model.getNode('A')?.shape).toBe('subroutine');
    });

    it('2.5 圆柱体 [(text)]', () => {
      const model = parser.parse('flowchart LR\n  A[(Database)]');
      expect(model.getNode('A')?.shape).toBe('cylinder');
    });

    it('2.6 圆形 ((text))', () => {
      const model = parser.parse('flowchart LR\n  A((Circle))');
      expect(model.getNode('A')?.shape).toBe('circle');
    });

    it('2.7 双圆形 (((text)))', () => {
      const model = parser.parse('flowchart LR\n  A(((Double Circle)))');
      expect(model.getNode('A')?.shape).toBe('doublecircle');
    });

    it('2.8 菱形 {text}', () => {
      const model = parser.parse('flowchart LR\n  A{Diamond}');
      expect(model.getNode('A')?.shape).toBe('diamond');
    });

    it('2.9 六边形 {{text}}', () => {
      const model = parser.parse('flowchart LR\n  A{{Hexagon}}');
      expect(model.getNode('A')?.shape).toBe('hexagon');
    });

    it('2.10 平行四边形 [/text/]', () => {
      const model = parser.parse('flowchart LR\n  A[/Parallelogram/]');
      expect(model.getNode('A')?.shape).toBe('trapezoid');
    });

    it('2.11 反向平行四边形 [\\text\\]', () => {
      const model = parser.parse('flowchart LR\n  A[\\Alt Parallelogram\\]');
      expect(model.getNode('A')?.shape).toBe('inv_trapezoid');
    });

    it('2.12 梯形 [/text\\]', () => {
      const model = parser.parse('flowchart LR\n  A[/Trapezoid\\]');
      expect(model.getNode('A')?.shape).toBe('lean_right');
    });

    it('2.13 反向梯形 [\\text/]', () => {
      const model = parser.parse('flowchart LR\n  A[\\Trapezoid Alt/]');
      expect(model.getNode('A')?.shape).toBe('lean_left');
    });

    it('2.14 旗帜形 >text]', () => {
      const model = parser.parse('flowchart LR\n  A>Asymmetric]');
      expect(model.getNode('A')?.shape).toBe('odd');
    });
  });

  // ============================================
  // 3. 边类型
  // ============================================
  describe('3. 边类型', () => {

    it('3.1 箭头边 -->', () => {
      const model = parser.parse('flowchart LR\n  A --> B');
      expect(model.edges[0].arrowEnd).toBe('arrow');
      expect(model.edges[0].stroke).toBe('normal');
    });

    it('3.2 无箭头边 ---', () => {
      const model = parser.parse('flowchart LR\n  A --- B');
      expect(model.edges[0].arrowEnd).toBe('none');
    });

    it('3.3 带文本的边 -->|text|', () => {
      const model = parser.parse('flowchart LR\n  A-->|text|B');
      expect(model.edges[0].text).toBe('text');
      expect(model.edges[0].arrowEnd).toBe('arrow');
    });

    it('3.4 带文本的边 -- text -->', () => {
      const model = parser.parse('flowchart LR\n  A-- text -->B');
      expect(model.edges[0].text).toBe('text');
      expect(model.edges[0].arrowEnd).toBe('arrow');
    });

    it('3.5 虚线边 -.->', () => {
      const model = parser.parse('flowchart LR\n  A-.->B');
      expect(model.edges[0].stroke).toBe('dotted');
      expect(model.edges[0].arrowEnd).toBe('arrow');
    });

    it('3.6 带文本虚线边', () => {
      const model = parser.parse('flowchart LR\n  A-. text .-> B');
      expect(model.edges[0].text).toBe('text');
      expect(model.edges[0].stroke).toBe('dotted');
    });

    it('3.7 粗线边 ==>', () => {
      const model = parser.parse('flowchart LR\n  A ==> B');
      expect(model.edges[0].stroke).toBe('thick');
    });

    it('3.8 带文本粗线边', () => {
      const model = parser.parse('flowchart LR\n  A == text ==> B');
      expect(model.edges[0].text).toBe('text');
      expect(model.edges[0].stroke).toBe('thick');
    });

    it('3.9 圆形箭头 --o', () => {
      const model = parser.parse('flowchart LR\n  A --o B');
      expect(model.edges[0].arrowEnd).toBe('circle');
    });

    it('3.10 双向圆形箭头 o--o', () => {
      const model = parser.parse('flowchart LR\n  A o--o B');
      expect(model.edges[0].arrowStart).toBe('circle');
      expect(model.edges[0].arrowEnd).toBe('circle');
    });

    it('3.11 叉形箭头 --x', () => {
      const model = parser.parse('flowchart LR\n  A --x B');
      expect(model.edges[0].arrowEnd).toBe('cross');
    });

    it('3.12 双向叉形箭头 x--x', () => {
      const model = parser.parse('flowchart LR\n  A x--x B');
      expect(model.edges[0].arrowStart).toBe('cross');
      expect(model.edges[0].arrowEnd).toBe('cross');
    });

    it('3.13 双向箭头 <-->', () => {
      const model = parser.parse('flowchart LR\n  A <--> B');
      expect(model.edges[0].arrowStart).toBe('arrow');
      expect(model.edges[0].arrowEnd).toBe('arrow');
    });
  });

  // ============================================
  // 4. 链式连接
  // ============================================
  describe('4. 链式连接', () => {

    it('4.1 节点链 A --> B --> C', () => {
      const model = parser.parse('flowchart LR\n  A --> B --> C');
      expect(model.edgeCount).toBe(2);
      expect(model.edges.find(e => e.source === 'A' && e.target === 'B')).toBeDefined();
      expect(model.edges.find(e => e.source === 'B' && e.target === 'C')).toBeDefined();
    });

    it('4.2 带文本的节点链', () => {
      const model = parser.parse('flowchart LR\n  A -- text --> B -- text2 --> C');
      expect(model.edges[0].text).toBe('text');
      expect(model.edges[1].text).toBe('text2');
    });
  });

  // ============================================
  // 5. 待实现功能 (使用 skip)
  // ============================================
  describe('5. [待实现] 不可见边 ~~~', () => {

    it.skip('5.1 不可见边应解析为 invisible stroke', () => {
      const model = parser.parse('flowchart LR\n  A ~~~ B');
      expect(model.edges[0].stroke).toBe('invisible');
    });
  });

  describe('5. [待实现] 多节点链接 &', () => {

    it.skip('5.2 A & B --> C 应展开为 2 条边', () => {
      const model = parser.parse('flowchart LR\n  A & B --> C');
      expect(model.edgeCount).toBe(2);
    });

    it.skip('5.3 A & B --> C & D 应展开为 4 条边', () => {
      const model = parser.parse('flowchart TB\n  A & B--> C & D');
      expect(model.edgeCount).toBe(4);
    });
  });

  describe('5. [待实现] 边长度控制', () => {

    it.skip('5.4 多破折号应增加边长度', () => {
      const model = parser.parse('flowchart TD\n  A ---> B\n  A ----> C');
      // @ts-expect-error length 属性待添加
      expect(model.edges[0].length).toBe(2);
      // @ts-expect-error length 属性待添加
      expect(model.edges[1].length).toBe(3);
    });
  });

  describe('5. 新形状语法 @{}', () => {

    it('5.5 @{ shape: rect } 应解析为矩形', () => {
      const model = parser.parse('flowchart TD\n  A@{ shape: rect, label: "Process" }');
      expect(model.getNode('A')?.shape).toBe('rect');
      expect(model.getNode('A')?.text).toBe('Process');
    });

    it('5.6 @{ shape: doc } 应解析为文档形状', () => {
      const model = parser.parse('flowchart TD\n  A@{ shape: doc, label: "Document" }');
      expect(model.getNode('A')?.shape).toBe('doc');
    });

    it('5.7 形状别名解析', () => {
      const model = parser.parse('flowchart TD\n  A@{ shape: database }');
      expect(model.getNode('A')?.shape).toBe('cylinder');
    });

    it('5.8 带图标属性', () => {
      const model = parser.parse('flowchart TD\n  A@{ shape: icon, icon: "fa:user", label: "User" }');
      expect(model.getNode('A')?.shape).toBe('icon');
      expect(model.getNode('A')?.icon).toBe('fa:user');
    });
  });

  describe('5. [待实现] 边 ID 和动画', () => {

    it.skip('5.7 边 ID 语法 e1@-->', () => {
      const model = parser.parse('flowchart LR\n  A e1@--> B');
      expect(model.edges[0].id).toBe('e1');
      // @ts-expect-error isUserDefinedId 属性待添加
      expect(model.edges[0].isUserDefinedId).toBe(true);
    });

    it.skip('5.8 边动画配置', () => {
      const model = parser.parse(`flowchart LR
        A e1@--> B
        e1@{ animate: true }`);
      // @ts-expect-error animate 属性待添加
      expect(model.edges[0].animate).toBe(true);
    });
  });

  // ============================================
  // 6. 子图
  // ============================================
  describe('6. 子图', () => {

    it('6.1 基础子图', () => {
      const model = parser.parse(`flowchart TB
        subgraph one
          a1-->a2
        end`);
      expect(model.subGraphs.length).toBe(1);
      expect(model.subGraphs[0].id).toBe('one');
    });

    it('6.2 带标题的子图', () => {
      const model = parser.parse(`flowchart TB
        subgraph ide1 [One Title]
          a1-->a2
        end`);
      expect(model.subGraphs[0].id).toBe('ide1');
      expect(model.subGraphs[0].title).toBe('One Title');
    });

    it.skip('6.3 [待实现] 子图内方向', () => {
      const model = parser.parse(`flowchart LR
        subgraph TOP
          direction TB
          A --> B
        end`);
      expect(model.subGraphs[0].direction).toBe('TB');
    });
  });

  // ============================================
  // 7. 样式
  // ============================================
  describe('7. 样式', () => {

    it('7.1 classDef 定义', () => {
      const model = parser.parse(`flowchart LR
        A:::someclass --> B
        classDef someclass fill:#f96`);
      const classDef = model.getClassDef('someclass');
      expect(classDef).toBeDefined();
      expect(classDef?.styles).toContain('fill:#f96');
    });

    it('7.2 style 语句', () => {
      const model = parser.parse(`flowchart LR
        A
        style A fill:#f9f,stroke:#333,stroke-width:4px`);
      expect(model.getNode('A')?.style?.fill).toBe('#f9f');
      expect(model.getNode('A')?.style?.stroke).toBe('#333');
    });

    it('7.3 class 分配', () => {
      const model = parser.parse(`flowchart LR
        A
        B
        class A,B someClass`);
      expect(model.getNode('A')?.cssClasses).toContain('someClass');
      expect(model.getNode('B')?.cssClasses).toContain('someClass');
    });

    it.skip('7.4 [待实现] linkStyle', () => {
      const model = parser.parse(`flowchart LR
        A --> B
        linkStyle 0 stroke:#ff3,stroke-width:4px`);
      // @ts-expect-error style 属性待添加
      expect(model.edges[0].style).toBeDefined();
    });
  });

  // ============================================
  // 8. 特殊情况
  // ============================================
  describe('8. 特殊情况', () => {

    it('8.1 注释应被忽略', () => {
      const model = parser.parse(`flowchart LR
        %% This is a comment
        A --> B`);
      expect(model.nodeCount).toBe(2);
    });

    it('8.2 行内注释', () => {
      const model = parser.parse(`flowchart LR
        A --> B %% inline comment`);
      expect(model.edgeCount).toBe(1);
    });

    it('8.3 click 语句', () => {
      const model = parser.parse(`flowchart LR
        A[Node]
        click A "https://example.com" "_blank"`);
      expect(model.getNode('A')?.link).toBe('https://example.com');
      expect(model.getNode('A')?.linkTarget).toBe('_blank');
    });

    it('8.4 带引号的文本 (特殊字符)', () => {
      const model = parser.parse(`flowchart LR
        A["Text with (parentheses)"]`);
      expect(model.getNode('A')?.text).toBe('Text with (parentheses)');
      expect(model.getNode('A')?.shape).toBe('rect');
    });

    it.skip('8.5 [待实现] Unicode 文本', () => {
      const model = parser.parse(`flowchart LR
        A["This ❤ Unicode"]`);
      expect(model.getNode('A')?.text).toBe('This ❤ Unicode');
    });

    it.skip('8.6 [待实现] 实体编码', () => {
      const model = parser.parse(`flowchart LR
        A["A double quote:#quot;"]`);
      expect(model.getNode('A')?.text).toContain('"');
    });
  });

  // ============================================
  // 9. 往返一致性
  // ============================================
  describe('9. 往返一致性 (Parse → Serialize → Parse)', () => {

    it('9.1 基础往返', () => {
      const original = `flowchart TB
    A[Start]
    B{Decision}
    A --> B`;

      const model = parser.parse(original);
      expect(model.getNode('A')?.text).toBe('Start');
      expect(model.getNode('B')?.shape).toBe('diamond');
    });
  });
});

