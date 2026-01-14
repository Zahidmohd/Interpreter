# Lox Interpreter in TypeScript

A complete **tree-walk interpreter** for the Lox programming language, built from scratch in TypeScript. This interpreter implements the full Lox language specification, including variables, functions, closures, classes, inheritance, and more.

[![Made with TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Runtime: Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=flat&logo=bun&logoColor=white)](https://bun.sh/)

## 🎯 Features

- ✅ **Complete Language Implementation**: Full support for Lox syntax and semantics
- ✅ **Variables & Scoping**: Lexical scoping with block-level scope
- ✅ **Functions**: First-class functions with closures
- ✅ **Classes & OOP**: Full object-oriented programming support
- ✅ **Inheritance**: Class inheritance with `super` keyword
- ✅ **Static Analysis**: Compile-time variable resolution and error detection
- ✅ **Comprehensive Error Handling**: Clear error messages with line numbers
- ✅ **Native Functions**: Built-in `clock()` function

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) runtime (v1.2 or higher)
- Git (for cloning)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd codecrafters-interpreter-typescript

# Install dependencies (if any)
bun install

# Make the script executable
chmod +x your_program.sh
```

### Running Your First Lox Program

Create a file `hello.lox`:
```lox
print "Hello, World!";
```

Run it:
```bash
./your_program.sh run hello.lox
```

Output:
```
Hello, World!
```

## 📖 Usage

The interpreter supports four commands:

### 1. Tokenize
Scan source code and output tokens:
```bash
./your_program.sh tokenize source.lox
```

Example output:
```
PRINT print null
STRING "Hello" Hello
SEMICOLON ; null
EOF  null
```

### 2. Parse
Parse an expression and display the AST:
```bash
./your_program.sh parse expression.lox
```

Example output:
```
(+ (* 2.0 3.0) 4.0)
```

### 3. Evaluate
Evaluate a single expression:
```bash
./your_program.sh evaluate expression.lox
```

Example:
```lox
// expression.lox
2 * 3 + 4
```
Output: `10`

### 4. Run
Execute a complete Lox program:
```bash
./your_program.sh run program.lox
```

## 💡 Example Programs

### Variables and Expressions
```lox
var name = "Alice";
var age = 30;
var greeting = "Hello, " + name + "!";

print greeting;  // Hello, Alice!
print age * 2;   // 60
```

### Control Flow
```lox
var x = 10;

if (x > 5) {
  print "x is greater than 5";
} else {
  print "x is 5 or less";
}

// Loops
var i = 0;
while (i < 5) {
  print i;
  i = i + 1;
}
```

### Functions
```lox
fun greet(name) {
  return "Hello, " + name + "!";
}

print greet("Bob");  // Hello, Bob!

// Functions are first-class values
var sayHi = greet;
print sayHi("Charlie");  // Hello, Charlie!
```

### Closures
```lox
fun makeCounter() {
  var count = 0;
  
  fun increment() {
    count = count + 1;
    return count;
  }
  
  return increment;
}

var counter = makeCounter();
print counter();  // 1
print counter();  // 2
print counter();  // 3
```

### Classes and OOP
```lox
class Person {
  init(name, age) {
    this.name = name;
    this.age = age;
  }
  
  greet() {
    print "Hi, I'm " + this.name;
  }
  
  birthday() {
    this.age = this.age + 1;
    print "Happy birthday! Now " + this.age;
  }
}

var alice = Person("Alice", 30);
alice.greet();      // Hi, I'm Alice
alice.birthday();   // Happy birthday! Now 31
```

### Inheritance
```lox
class Animal {
  init(name) {
    this.name = name;
  }
  
  speak() {
    print this.name + " makes a sound";
  }
}

class Dog < Animal {
  speak() {
    print this.name + " barks";
  }
  
  fetch() {
    super.speak();  // Call parent method
    print this.name + " fetches the ball";
  }
}

var dog = Dog("Rex");
dog.speak();  // Rex barks
dog.fetch();  // Rex makes a sound
              // Rex fetches the ball
```

## 🏗️ How It Was Built

This interpreter was built **completely from scratch** following the principles from "Crafting Interpreters" by Robert Nystrom. Here's the development journey:

### Phase 1: Lexical Analysis (Scanner)
**Goal**: Convert source code into tokens

I started by building the **Scanner**, which reads the source code character by character and groups them into meaningful tokens. This involved:

- Recognizing single-character tokens (`(`, `)`, `+`, `-`, etc.)
- Handling two-character tokens (`==`, `!=`, `<=`, `>=`)
- Parsing string literals (handling escape sequences and unterminated strings)
- Parsing number literals (integers and decimals)
- Identifying keywords vs identifiers
- Tracking line numbers for error reporting

**Key Challenge**: Distinguishing between division (`/`) and comments (`//`), and handling string literals that span multiple characters.

### Phase 2: Syntax Analysis (Parser)
**Goal**: Build an Abstract Syntax Tree (AST) from tokens

Next, I implemented a **recursive descent parser** that:

- Defines grammar rules for expressions and statements
- Implements operator precedence correctly (using the precedence climbing method)
- Handles both expressions (`2 + 3 * 4`) and statements (`print "hi";`)
- Creates AST nodes representing the program structure
- Implements error recovery (synchronization at statement boundaries)

**Key Challenge**: Implementing operator precedence correctly. I used a hierarchy of parsing methods, where each method handles one level of precedence.

### Phase 3: Semantic Analysis (Resolver)
**Goal**: Perform static analysis before execution

I added a **Resolver** pass that:

- Walks the AST before interpretation
- Tracks variable declarations and their scopes
- Resolves each variable reference to its declaration
- Calculates scope distances for O(1) variable lookup
- Detects semantic errors at "compile time":
  - Variable used in its own initializer
  - Duplicate declarations in the same scope
  - `return` outside functions
  - `this` outside classes
  - `super` in classes without superclasses

**Key Challenge**: Maintaining a stack of scopes and correctly calculating the distance from a variable reference to its declaration.

### Phase 4: Interpretation (Execution)
**Goal**: Execute the AST and produce results

Finally, I built the **Interpreter** using the Visitor pattern:

- Implemented expression evaluation (arithmetic, comparison, logical)
- Created an environment chain for variable scoping
- Added support for control flow (if, while, for)
- Implemented runtime type checking and error handling

**Key Challenge**: Managing the environment chain for nested scopes and ensuring proper variable lookup.

### Phase 5: Functions & Closures
**Goal**: Add first-class functions

I extended the interpreter to support functions:

- Function declarations and calls
- Parameter binding
- Return statements (using exceptions for control flow)
- **Closures**: Capturing the environment where a function is defined
- Native functions (`clock()`)

**Key Challenge**: Implementing closures required capturing the environment at function definition time, not call time.

### Phase 6: Classes & Objects
**Goal**: Add object-oriented programming

I added classes and objects:

- Class declarations with methods
- Instance creation (calling classes as constructors)
- Dynamic properties (fields)
- Method binding (ensuring `this` refers to the instance)
- Constructors (`init()` method)
- Ensuring `init()` always returns the instance

**Key Challenge**: Implementing method binding so that `this` correctly refers to the instance, even when methods are passed around as values.

### Phase 7: Inheritance
**Goal**: Support class hierarchies

Finally, I implemented inheritance:

- Superclass specification (`class Dog < Animal`)
- Method inheritance (searching up the class hierarchy)
- `super` keyword for calling parent methods
- Proper environment setup for `super` and `this`

**Key Challenge**: Implementing `super` required creating a special environment where both `super` (the superclass) and `this` (the current instance) are accessible.

## 🏛️ Architecture

```
Source Code
    ↓
┌─────────┐
│ Scanner │  → Lexical Analysis (characters → tokens)
└─────────┘
    ↓
┌─────────┐
│ Parser  │  → Syntax Analysis (tokens → AST)
└─────────┘
    ↓
┌──────────┐
│ Resolver │  → Semantic Analysis (resolve variables, detect errors)
└──────────┘
    ↓
┌──────────────┐
│ Interpreter  │  → Execution (walk AST, produce results)
└──────────────┘
    ↓
Output
```

### Key Design Decisions

1. **Visitor Pattern**: Used for cleanly separating AST traversal logic from AST node definitions
2. **Environment Chain**: Linked list of scopes for managing variable bindings
3. **Static Resolution**: Pre-calculate variable scope distances for O(1) lookup during execution
4. **Closures via Captured Environments**: Functions store their defining environment
5. **Method Binding**: Create new function instances with `this` pre-bound when accessing methods

## 📁 Project Structure

```
codecrafters-interpreter-typescript/
├── app/
│   └── main.ts              # Complete interpreter implementation (1900+ lines)
├── .codecrafters/
│   └── compile.sh           # Build script
├── your_program.sh          # Entry point script
├── codecrafters.yml         # Configuration
├── package.json             # Dependencies
└── README.md               # This file
```

### Main Components in `app/main.ts`

```typescript
// Lexical Analysis
class Token { ... }
class Scanner { ... }

// AST Definitions
class Expr { ... }          // Base class for expressions
class Stmt { ... }          // Base class for statements
// + 15 expression types (Literal, Binary, Call, Get, This, Super, etc.)
// + 9 statement types (Print, Var, Function, Class, Return, etc.)

// Syntax Analysis
class Parser { ... }

// Semantic Analysis
class Resolver { ... }

// Runtime
class Environment { ... }
class LoxFunction { ... }
class LoxClass { ... }
class LoxInstance { ... }
class Interpreter { ... }

// Entry Point
main();  // Command dispatcher
```

## 🧪 Testing

The interpreter was developed following test-driven development with the CodeCrafters challenge platform. Each feature was implemented incrementally:

1. **Tokenization tests**: Verify correct token recognition
2. **Parsing tests**: Check AST structure
3. **Evaluation tests**: Test expression evaluation
4. **Statement tests**: Verify control flow and scoping
5. **Function tests**: Check closures and parameters
6. **Class tests**: Verify OOP features
7. **Inheritance tests**: Test `super` and method resolution

All tests verify:
- ✅ Correct output
- ✅ Proper exit codes (0 = success, 65 = compile error, 70 = runtime error)
- ✅ Error messages with line numbers

## 🎯 Language Features

### Literals
- Numbers: `42`, `3.14`
- Strings: `"hello world"`
- Booleans: `true`, `false`
- Nil: `nil`

### Operators
- Arithmetic: `+`, `-`, `*`, `/`
- Comparison: `<`, `<=`, `>`, `>=`
- Equality: `==`, `!=`
- Logical: `and`, `or`
- Unary: `-`, `!`

### Control Flow
- If statements with optional else
- While loops
- For loops (desugared to while)

### Functions
- First-class functions
- Closures
- Return statements
- Native `clock()` function

### Classes
- Class declarations
- Instance creation
- Methods
- Constructors (`init()`)
- Properties (fields)
- `this` keyword
- Inheritance with `<`
- `super` keyword

## ⚡ Performance

The interpreter includes several optimizations:

1. **Static Variable Resolution**: O(1) variable lookup after resolution
2. **Short-Circuit Evaluation**: Logical operators don't evaluate unnecessary operands
3. **Lazy Method Binding**: Methods are bound to instances only when accessed
4. **Direct Scope Access**: Resolved variables jump directly to their scope

## 🐛 Error Handling

The interpreter provides clear, helpful error messages:

### Compile-Time Errors (Exit Code 65)
```
[line 3] Error at 'a': Can't read local variable in its own initializer.
[line 5] Error at 'return': Can't return from top-level code.
[line 8] Error at 'this': Can't use 'this' outside of a class.
```

### Runtime Errors (Exit Code 70)
```
Operand must be a number.
[line 4]

Undefined variable 'count'.
[line 7]

Can only call functions and classes.
[line 10]
```

## 🔮 What's Next

Potential future enhancements:

- [ ] More native functions (string manipulation, math, I/O)
- [ ] Bytecode compiler and VM for better performance
- [ ] Garbage collection
- [ ] Module system
- [ ] REPL (Read-Eval-Print Loop)
- [ ] Debugger
- [ ] Standard library

## 📚 References

This interpreter was built following principles from:
- **"Crafting Interpreters"** by Robert Nystrom
- Website: https://craftinginterpreters.com/

The implementation was completed as part of the CodeCrafters "Build Your Own Interpreter" challenge.

## 📝 License

This project is open source and available for educational purposes.

## 🤝 Contributing

This is an educational project, but suggestions and improvements are welcome! Feel free to:
- Report bugs
- Suggest features
- Improve documentation
- Share interesting Lox programs

## ✨ Acknowledgments

- Robert Nystrom for the excellent "Crafting Interpreters" book
- CodeCrafters for the structured challenge platform
- The TypeScript and Bun teams for excellent tooling

---

**Built with ❤️ and TypeScript**
