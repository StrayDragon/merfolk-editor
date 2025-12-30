# Mermaid Flowchart Syntax Specification

## 1. Grammar Structure

```
document        ::= graph_decl (statement)* EOF
graph_decl      ::= ('flowchart' | 'graph') direction_decl
direction_decl  ::= 'TD' | 'TB' | 'BT' | 'RL' | 'LR'
statement       ::= node_decl
                 | edge_decl
                 | subgraph_decl
                 | style_decl
                 | class_decl
                 | classdef_decl
                 | click_decl
                 | direction_decl
```

## 2. Node Declaration

```
node_decl       ::= node_id [node_text] [node_shape]
                 | node_id '@{' node_attrs '}'

node_id         ::= IDENTIFIER
node_text       ::= STRING | MARKDOWN_STRING

node_shape      ::= '[' ']'           # Rectangle (default)
                 | '(' ')'            # Rounded edges
                 | '[' '(' ')' ']'    # Stadium
                 | '[' '[' ']' ']'    # Subroutine
                 | '(' '[' ']' ')'    # Cylindrical
                 | '(' '(' ')' ')'    # Circle
                 | '>' ']'            # Asymmetric
                 | '{' '}'            # Rhombus/Diamond
                 | '/' '/'            # Parallelogram
                 | '\' '\' ']'        # Parallelogram alt
                 | '/' '\' ']'        # Trapezoid
                 | '\' '/' ']'        # Trapezoid alt
                 | '{{' '}}'          # Hexagon
```

### v11.3.0+ Extended Shapes (via @{shape: xxx})

```
extended_shape ::= 'rect'              # Rectangle
                 | 'round-rect'        # Rounded Rectangle
                 | 'stadium'           # Stadium
                 | 'subroutine'        # Subroutine
                 | 'cylinder'          # Cylinder
                 | 'circle'            # Circle
                 | 'asymmetric'        # Asymmetric
                 | 'rhombus'           # Rhombus
                 | 'hexagon'           # Hexagon
                 | 'parallelogram'     # Parallelogram
                 | 'parallelogram-alt' # Parallelogram alt
                 | 'trapezoid'         # Trapezoid
                 | 'trapezoid-alt'     # Trapezoid alt
                 | 'dbl-circ'          # Double Circle
                 | 'rect-left-notify'  # Notched Rectangle
                 | 'display'           # Curved Trapezoid
                 | 'lean-right'        # Lean Right
                 | 'lean-left'         # Lean Left
                 | 'trap-b'            # Trapezoid Base Bottom
                 | 'trap-t'            # Trapezoid Base Top
                 | 'invert-circle'     # Inverted Circle
                 | 'sm-circ'           # Small Circle
                 | 'framed-circle'     # Framed Circle
                 | 'fork'              # Long Rectangle
                 | 'hourglass'         # Hourglass
                 | 'lin-rect'          # Lined Rectangle
                 | 'notch-rect'        # Notched Rectangle (Card)
                 | 'text'              # Text Block
                 | 'comment'           # Curly Brace Left
                 | 'comment-right'     # Curly Brace Right
                 | 'comment-both'      # Curly Brace Both
                 | 'com-link'          # Lightning Bolt
                 | 'document'          # Document
                 | 'delay'             # Half-Rounded Rectangle
                 | 'stored-data'       # Bow Tie Rectangle
                 | 'disc'              # Horizontal Cylinder
                 | 'lined-disc'        # Lined Cylinder
                 | 'divided-process'   # Divided Rectangle
                 | 'extract'           # Small Triangle
                 | 'internal-storage'  # Window Pane
                 | 'junction'          # Filled Circle
                 | 'lined-doc'         # Lined Document
                 | 'loop-limit'        # Notched Pentagon
                 | 'manual-file'       # Flipped Triangle
                 | 'manual-input'      # Sloped Rectangle
                 | 'multi-doc'         # Stacked Document
                 | 'multi-process'     # Stacked Rectangle
                 | 'paper-tape'        # Flag
                 | 'summary'           # Crossed Circle
                 | 'tagged-doc'        # Tagged Document
                 | 'tagged-process'    # Tagged Rectangle

# Special shapes
special_shape  ::= 'icon:' icon_params
                 | 'image:' image_params

icon_params    ::= IDENTIFIER (',' ICON_ATTR '=' VALUE)*
image_params   ::= URI (',' IMAGE_ATTR '=' VALUE)*
```

### String Types

```
STRING          ::= '"' UNICODE_TEXT '"'
MARKDOWN_STRING ::= '`' MARKDOWN_CONTENT '`'
UNICODE_TEXT    ::= TEXT_WITH_UNICODE
MARKDOWN_CONTENT ::= TEXT_WITH_MARKDOWN
```

## 3. Edge Declaration

```
edge_decl       ::= node_or_ref edge_op [edge_label] edge_op node_or_ref
                 | node_or_ref edge_op node_or_ref

node_or_ref     ::= node_id | subgraph_id

edge_op         ::= '-->'              # Solid arrow
                 | '---'              # Solid line
                 | '.-'  '-.'         # Dotted (partial)
                 | '.-'  LABEL '-.'   # Dotted with label
                 | '==>'              # Thick arrow
                 | '==='               # Thick line
                 | '~~~'               # Invisible link
                 | '--o'              # Circle end
                 | 'o--'              # Circle start
                 | '--x'              # Cross end
                 | 'x--'              # Cross start
                 | '<-->'             # Bidirectional
                 | '--'               # Open link

edge_label      ::= '--' TEXT '--'    # For solid/thick
                 | '-' TEXT '-'       # For dotted
```

### Edge Patterns

```
# Pattern types:
solid_pattern   ::= '---'
dotted_pattern  ::= '-.' | '.-'
thick_pattern   ::= '==='
invisible_pattern ::= '~~~'

# Minimum length modifier
edge_min_length ::= edge_op '|' NUMBER '|'
```

### Chaining

```
chain_decl      ::= node_or_ref (edge_op [edge_label] node_or_ref)+
multi_decl      ::= node_or_ref edge_op (node_or_ref '&' node_or_ref)+
```

### Edge ID (for styling)

```
edge_with_id    ::= node_or_ref edge_id edge_op node_or_ref
edge_id         ::= ':::' IDENTIFIER ':::'
```

## 4. Subgraph Declaration

```
subgraph_decl   ::= 'subgraph' subgraph_id [direction_decl]
                    (statement)*
                    'end'

subgraph_id     ::= IDENTIFIER | STRING | MARKDOWN_STRING
```

**Note**: Subgraph direction is maintained only when linking TO the subgraph, not linking within.

## 5. Styling

### Style Declaration

```
style_decl      ::= 'style' IDENTIFIER style_content
style_content   ::= STYLE_STMT (',' STYLE_STMT)*
STYLE_STMT      ::= ATTR ':' VALUE
ATTR            ::= 'fill' | 'stroke' | 'stroke-width' | 'stroke-dasharray'
                 | 'color' | 'font-family' | 'font-size' | 'font-weight'
                 | 'shadow' | 'opacity' | 'border-radius'
```

### Class Declaration

```
class_decl      ::= 'class' IDENTIFIER (',' IDENTIFIER)* class_list
class_list      ::= CLASS_NAME (',' CLASS_NAME)*
CLASS_NAME      ::= IDENTIFIER
```

### ClassDef Declaration

```
classdef_decl   ::= 'classDef' CLASS_NAME style_content
```

### Default Class

```
default_class   ::= 'classDef' 'default' style_content
```

### Link Styling

```
link_style      ::= 'linkStyle' NUMBER_LIST style_content
NUMBER_LIST     ::= NUMBER (',' NUMBER)*
```

### Curve Styling

```
curve_style     ::= STYLE_CURVE_TYPE
STYLE_CURVE_TYPE ::= 'basis' | 'linear' | 'monotoneX' | 'monotoneY'
                  | 'natural' | 'stepBefore' | 'stepAfter'
                  | 'catmullRom' | 'bumpX' | 'bumpY'
```

## 6. Interactive Features

### Click Declaration

```
click_decl      ::= 'click' node_id 'href' URI
                    ('call' FUNC_NAME)?
                    ('_'('tooltip' | 'for') '("' TEXT '"')?)?
```

### Animation

```
animation       ::= vertex ':::animation' ANIMATION_TYPE
ANIMATION_TYPE  ::= 'none' | 'stroke' | 'bounce' | 'draw' | 'flow'
```

## 7. Icon and Image Syntax

### FontAwesome Icon

```
icon_syntax     ::= 'fa:' ICON_SET '-' ICON_NAME
ICON_SET        ::= 'fa' | 'fab' | 'fas' | 'far' | 'fal'
ICON_NAME       ::= IDENTIFIER
```

### Icon Parameters

```
icon_params     ::= (',' COLOR '=' COLOR_VALUE)?
                    (',' 'scale' '=' NUMBER)?
                    (',' 'strokeWidth' '=' NUMBER)?

COLOR_VALUE     ::= HEX_COLOR | COLOR_NAME
HEX_COLOR       ::= '#' HEX_DIGIT*6
```

### Image Parameters

```
image_params    ::= (',' 'width' '=' NUMBER)?
                    (',' 'height' '=' NUMBER)?
                    (',' 'fit' '=' ('contain' | 'cover'))?
```

## 8. Lexical Tokens

```
IDENTIFIER      ::= [a-zA-Z_] [a-zA-Z0-9_-]*
NUMBER          ::= [0-9]+
URI             ::= STRING
FUNC_NAME       ::= IDENTIFIER
TEXT            ::= [^"']+
```

## 9. Reserved Keywords

```
Reserved words (capitalize to avoid collision):
- 'end' -> use 'End', 'END', or workaround
- 'o' or 'x' at edge start -> use space or capitalize
```

## 10. Entity Escaping

```
# Use HTML entity codes for special characters:
&num;           -> #
&amp;           -> &
&percent;       -> %
&lpar;          -> (
&rpar;          -> )
```

## 11. Comments

```
# Single-line comments start with %%
%% This is a comment
```

## 12. Configuration (YAML Frontmatter)

```
---
config:
  flowchart:
    htmlLabels: true|false
    curve: STYLE_CURVE_TYPE
    padding: NUMBER
    useMaxWidth: true|false
---
```

## 13. Complete Example Syntax

```
flowchart LR
    %% Graph direction: Left to Right

    %% Node declarations
    A[Default Rectangle]
    B(Rounded Edges)
    C([Stadium Shape])
    D[[Subroutine]]
    E[(Cylinder)]
    F((Circle))
    G>Asymmetric]
    H{Rhombus/Diamond}
    I[/Parallelogram/]
    J[\Parallelogram Alt\]
    K[/Trapezoid\]
    L[\Trapezoid Alt/]
    M{{Hexagon}}

    %% Extended shapes (v11.3.0+)
    N@{shape: dbl-circ, label: "Double Circle"}
    O@{shape: icon:fa:fa-user, color: #f00, scale: 2}
    P@{shape: image:https://example.com/img.png, width: 100, height: 100}

    %% Edge declarations
    A --> B
    B -.-> C
    C ==> D
    A -- "Label" --> E
    F -. "Dotted Label" .-> G
    H == "Thick Label" ==> I

    %% Chaining
    J --> K --> L

    %% Multi-endpoint
    A --> B & C --> D

    %% Invisible link
    A ~~~ H

    %% Bidirectional
    A <--> B

    %% Circle/Cross edges
    A --o B
    A ---x C
    oA --> B
    xA --> C

    %% Subgraph
    subgraph SG1
        direction TB
        X[Node X]
        Y[Node Y]
        X --> Y
    end

    subgraph "Subgraph 2"
        direction LR
        P[Node P]
        Q[Node Q]
    end

    %% Styling
    style A fill:#f9f,stroke:#333,stroke-width:4px
    style B fill:#bbf,stroke:#f66,stroke-width:2px,color:#fff,stroke-dasharray: 5 5

    %% Classes
    classDef myClass fill:#f96,stroke:#333,stroke-width:2px,color:#fff;
    class A,B myClass

    %% Link styling
    linkStyle 0 stroke:#ff0,stroke-width:4px

    %% Click interaction
    click A href "https://example.com" _blank

    %% Edge ID for styling
    A:::edge1 --> B
    style edge1 stroke:#0f0,stroke-width:3px

    %% Markdown strings
    R["`This **is** _Markdown_`"]
    S --> T["`Line1\nLine 2\nLine 3`"]
```

## 14. Semantics

### Node Identity
- Node ID is declared at first use
- Subsequent references use the same node
- Last text definition wins if multiple exist

### Scope
- Subgraphs create local scope for direction
- Nodes in subgraphs are globally accessible
- Styles and classes are global

### Evaluation Order
- Statements are evaluated sequentially
- Forward and backward references allowed
- Later statements override earlier ones for same attributes

### Visual Layout
- Direction controls automatic layout
- Invisible edges affect layout only
- Subgraphs create visual grouping
