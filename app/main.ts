import fs from "fs";

const args: string[] = process.argv.slice(2);

if (args.length < 2) {
  console.error("Usage: ./your_program.sh <command> <filename>");
  process.exit(1);
}

const command: string = args[0];

if (command !== "tokenize" && command !== "parse" && command !== "evaluate" && command !== "run") {
  console.error(`Usage: Unknown command: ${command}`);
  process.exit(1);
}

const filename: string = args[1];
const fileContent: string = fs.readFileSync(filename, "utf8");

// Token class
class Token {
  constructor(
    public type: string,
    public lexeme: string,
    public literal: any,
    public line: number
  ) { }
}

// AST Expression classes
abstract class Expr {
  abstract accept<R>(visitor: ExprVisitor<R>): R;
}

interface ExprVisitor<R> {
  visitLiteralExpr(expr: Literal): R;
  visitUnaryExpr(expr: Unary): R;
  visitBinaryExpr(expr: Binary): R;
  visitGroupingExpr(expr: Grouping): R;
  visitVariableExpr(expr: Variable): R;
  visitAssignExpr(expr: Assign): R;
  visitLogicalExpr(expr: Logical): R;
  visitCallExpr(expr: Call): R;
}

class Literal extends Expr {
  constructor(public value: any) {
    super();
  }

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitLiteralExpr(this);
  }
}

class Unary extends Expr {
  constructor(public operator: Token, public right: Expr) {
    super();
  }

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitUnaryExpr(this);
  }
}

class Binary extends Expr {
  constructor(public left: Expr, public operator: Token, public right: Expr) {
    super();
  }

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitBinaryExpr(this);
  }
}

class Grouping extends Expr {
  constructor(public expression: Expr) {
    super();
  }

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitGroupingExpr(this);
  }
}

class Variable extends Expr {
  constructor(public name: Token) {
    super();
  }

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitVariableExpr(this);
  }
}

class Assign extends Expr {
  constructor(public name: Token, public value: Expr) {
    super();
  }

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitAssignExpr(this);
  }
}

class Logical extends Expr {
  constructor(public left: Expr, public operator: Token, public right: Expr) {
    super();
  }

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitLogicalExpr(this);
  }
}

class Call extends Expr {
  constructor(
    public callee: Expr,
    public paren: Token,
    public args: Expr[]
  ) {
    super();
  }

  accept<R>(visitor: ExprVisitor<R>): R {
    return visitor.visitCallExpr(this);
  }
}

// Statement classes
abstract class Stmt {
  abstract accept<R>(visitor: StmtVisitor<R>): R;
}

interface StmtVisitor<R> {
  visitExpressionStmt(stmt: Expression): R;
  visitPrintStmt(stmt: Print): R;
  visitVarStmt(stmt: Var): R;
  visitBlockStmt(stmt: Block): R;
  visitIfStmt(stmt: If): R;
  visitWhileStmt(stmt: While): R;
  visitFunctionStmt(stmt: Function): R;
  visitReturnStmt(stmt: Return): R;
}

class Expression extends Stmt {
  constructor(public expression: Expr) {
    super();
  }

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitExpressionStmt(this);
  }
}

class Print extends Stmt {
  constructor(public expression: Expr) {
    super();
  }

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitPrintStmt(this);
  }
}

class Var extends Stmt {
  constructor(public name: Token, public initializer: Expr | null) {
    super();
  }

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitVarStmt(this);
  }
}

class Block extends Stmt {
  constructor(public statements: Stmt[]) {
    super();
  }

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitBlockStmt(this);
  }
}

class If extends Stmt {
  constructor(
    public condition: Expr,
    public thenBranch: Stmt,
    public elseBranch: Stmt | null
  ) {
    super();
  }

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitIfStmt(this);
  }
}

class While extends Stmt {
  constructor(public condition: Expr, public body: Stmt) {
    super();
  }

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitWhileStmt(this);
  }
}

class Function extends Stmt {
  constructor(
    public name: Token,
    public params: Token[],
    public body: Stmt[]
  ) {
    super();
  }

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitFunctionStmt(this);
  }
}

class Return extends Stmt {
  constructor(public keyword: Token, public value: Expr | null) {
    super();
  }

  accept<R>(visitor: StmtVisitor<R>): R {
    return visitor.visitReturnStmt(this);
  }
}

// AST Printer
class AstPrinter implements ExprVisitor<string> {
  print(expr: Expr): string {
    return expr.accept(this);
  }

  visitLiteralExpr(expr: Literal): string {
    if (expr.value === null) return "nil";
    if (typeof expr.value === "boolean") return expr.value.toString();
    if (typeof expr.value === "number") {
      let str = expr.value.toString();
      if (!str.includes('.')) str += '.0';
      return str;
    }
    return expr.value.toString();
  }

  visitUnaryExpr(expr: Unary): string {
    return this.parenthesize(expr.operator.lexeme, expr.right);
  }

  visitBinaryExpr(expr: Binary): string {
    return this.parenthesize(expr.operator.lexeme, expr.left, expr.right);
  }

  visitGroupingExpr(expr: Grouping): string {
    return this.parenthesize("group", expr.expression);
  }

  visitVariableExpr(expr: Variable): string {
    return expr.name.lexeme;
  }

  visitAssignExpr(expr: Assign): string {
    return `(= ${expr.name.lexeme} ${expr.value.accept(this)})`;
  }

  visitLogicalExpr(expr: Logical): string {
    return this.parenthesize(expr.operator.lexeme, expr.left, expr.right);
  }

  visitCallExpr(expr: Call): string {
    return this.parenthesize("call", expr.callee, ...expr.args);
  }

  private parenthesize(name: string, ...exprs: Expr[]): string {
    let result = `(${name}`;
    for (const expr of exprs) {
      result += ` ${expr.accept(this)}`;
    }
    result += ")";
    return result;
  }
}

// Parser
class Parser {
  private tokens: Token[];
  private current: number = 0;
  private hadError: boolean = false;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): Expr | null {
    try {
      return this.expression();
    } catch (error) {
      return null;
    }
  }

  parseStatements(): Stmt[] {
    const statements: Stmt[] = [];
    while (!this.isAtEnd()) {
      const stmt = this.declaration();
      if (stmt) statements.push(stmt);
    }
    return statements;
  }

  private declaration(): Stmt | null {
    try {
      if (this.match("FUN")) return this.function("function");
      if (this.match("VAR")) return this.varDeclaration();
      return this.statement();
    } catch (error) {
      this.synchronize();
      return null;
    }
  }

  private function(kind: string): Stmt {
    const name = this.consume("IDENTIFIER", `Expect ${kind} name.`);
    this.consume("LEFT_PAREN", `Expect '(' after ${kind} name.`);

    const parameters: Token[] = [];
    if (!this.check("RIGHT_PAREN")) {
      do {
        parameters.push(this.consume("IDENTIFIER", "Expect parameter name."));
      } while (this.match("COMMA"));
    }
    this.consume("RIGHT_PAREN", "Expect ')' after parameters.");

    this.consume("LEFT_BRACE", `Expect '{' before ${kind} body.`);
    const body = this.block();

    return new Function(name, parameters, body);
  }

  private varDeclaration(): Stmt {
    const name = this.consume("IDENTIFIER", "Expect variable name.");

    let initializer: Expr | null = null;
    if (this.match("EQUAL")) {
      initializer = this.expression();
    }

    this.consume("SEMICOLON", "Expect ';' after variable declaration.");
    return new Var(name, initializer);
  }

  private statement(): Stmt | null {
    if (this.match("FOR")) return this.forStatement();
    if (this.match("IF")) return this.ifStatement();
    if (this.match("PRINT")) return this.printStatement();
    if (this.match("RETURN")) return this.returnStatement();
    if (this.match("WHILE")) return this.whileStatement();
    if (this.match("LEFT_BRACE")) return new Block(this.block());
    return this.expressionStatement();
  }

  private forStatement(): Stmt {
    this.consume("LEFT_PAREN", "Expect '(' after 'for'.");

    // Initializer
    let initializer: Stmt | null;
    if (this.match("SEMICOLON")) {
      initializer = null;
    } else if (this.match("VAR")) {
      initializer = this.varDeclaration();
    } else {
      initializer = this.expressionStatement();
    }

    // Condition
    let condition: Expr | null = null;
    if (!this.check("SEMICOLON")) {
      condition = this.expression();
    }
    this.consume("SEMICOLON", "Expect ';' after loop condition.");

    // Increment
    let increment: Expr | null = null;
    if (!this.check("RIGHT_PAREN")) {
      increment = this.expression();
    }
    this.consume("RIGHT_PAREN", "Expect ')' after for clauses.");

    // Body
    let body = this.statement();

    // Desugar to while loop
    if (increment !== null) {
      body = new Block([body!, new Expression(increment)]);
    }

    if (condition === null) condition = new Literal(true);
    body = new While(condition, body!);

    if (initializer !== null) {
      body = new Block([initializer, body]);
    }

    return body;
  }

  private ifStatement(): Stmt {
    this.consume("LEFT_PAREN", "Expect '(' after 'if'.");
    const condition = this.expression();
    this.consume("RIGHT_PAREN", "Expect ')' after if condition.");

    const thenBranch = this.statement();
    let elseBranch: Stmt | null = null;
    if (this.match("ELSE")) {
      elseBranch = this.statement();
    }

    return new If(condition, thenBranch!, elseBranch);
  }

  private whileStatement(): Stmt {
    this.consume("LEFT_PAREN", "Expect '(' after 'while'.");
    const condition = this.expression();
    this.consume("RIGHT_PAREN", "Expect ')' after condition.");
    const body = this.statement();

    return new While(condition, body!);
  }

  private block(): Stmt[] {
    const statements: Stmt[] = [];

    while (!this.check("RIGHT_BRACE") && !this.isAtEnd()) {
      const stmt = this.declaration();
      if (stmt) statements.push(stmt);
    }

    this.consume("RIGHT_BRACE", "Expect '}'.");
    return statements;
  }

  private printStatement(): Stmt {
    const value = this.expression();
    this.consume("SEMICOLON", "Expect ';' after value.");
    return new Print(value);
  }

  private returnStatement(): Stmt {
    const keyword = this.previous();
    let value: Expr | null = null;

    if (!this.check("SEMICOLON")) {
      value = this.expression();
    }

    this.consume("SEMICOLON", "Expect ';' after return value.");
    return new Return(keyword, value);
  }

  private expressionStatement(): Stmt {
    const expr = this.expression();
    this.consume("SEMICOLON", "Expect ';' after expression.");
    return new Expression(expr);
  }

  private synchronize(): void {
    this.advance();

    while (!this.isAtEnd()) {
      if (this.previous().type === "SEMICOLON") return;

      switch (this.peek().type) {
        case "CLASS":
        case "FUN":
        case "VAR":
        case "FOR":
        case "IF":
        case "WHILE":
        case "PRINT":
        case "RETURN":
          return;
      }

      this.advance();
    }
  }

  hasError(): boolean {
    return this.hadError;
  }

  private expression(): Expr {
    return this.assignment();
  }

  private assignment(): Expr {
    const expr = this.or();

    if (this.match("EQUAL")) {
      const equals = this.previous();
      const value = this.assignment(); // Right associative

      if (expr instanceof Variable) {
        const name = expr.name;
        return new Assign(name, value);
      }

      this.error(equals, "Invalid assignment target.");
    }

    return expr;
  }

  private or(): Expr {
    let expr = this.and();

    while (this.match("OR")) {
      const operator = this.previous();
      const right = this.and();
      expr = new Logical(expr, operator, right);
    }

    return expr;
  }

  private and(): Expr {
    let expr = this.equality();

    while (this.match("AND")) {
      const operator = this.previous();
      const right = this.equality();
      expr = new Logical(expr, operator, right);
    }

    return expr;
  }

  private equality(): Expr {
    let expr = this.comparison();

    while (this.match("BANG_EQUAL", "EQUAL_EQUAL")) {
      const operator = this.previous();
      const right = this.comparison();
      expr = new Binary(expr, operator, right);
    }

    return expr;
  }

  private comparison(): Expr {
    let expr = this.term();

    while (this.match("GREATER", "GREATER_EQUAL", "LESS", "LESS_EQUAL")) {
      const operator = this.previous();
      const right = this.term();
      expr = new Binary(expr, operator, right);
    }

    return expr;
  }

  private term(): Expr {
    let expr = this.factor();

    while (this.match("PLUS", "MINUS")) {
      const operator = this.previous();
      const right = this.factor();
      expr = new Binary(expr, operator, right);
    }

    return expr;
  }

  private factor(): Expr {
    let expr = this.unary();

    while (this.match("STAR", "SLASH")) {
      const operator = this.previous();
      const right = this.unary();
      expr = new Binary(expr, operator, right);
    }

    return expr;
  }

  private unary(): Expr {
    if (this.match("BANG", "MINUS")) {
      const operator = this.previous();
      const right = this.unary();
      return new Unary(operator, right);
    }

    return this.call();
  }

  private call(): Expr {
    let expr = this.primary();

    while (true) {
      if (this.match("LEFT_PAREN")) {
        expr = this.finishCall(expr);
      } else {
        break;
      }
    }

    return expr;
  }

  private finishCall(callee: Expr): Expr {
    const args: Expr[] = [];

    if (!this.check("RIGHT_PAREN")) {
      do {
        args.push(this.expression());
      } while (this.match("COMMA"));
    }

    const paren = this.consume("RIGHT_PAREN", "Expect ')' after arguments.");

    return new Call(callee, paren, args);
  }

  private primary(): Expr {
    if (this.match("FALSE")) return new Literal(false);
    if (this.match("TRUE")) return new Literal(true);
    if (this.match("NIL")) return new Literal(null);

    if (this.match("NUMBER", "STRING")) {
      return new Literal(this.previous().literal);
    }

    if (this.match("IDENTIFIER")) {
      return new Variable(this.previous());
    }

    if (this.match("LEFT_PAREN")) {
      const expr = this.expression();
      this.consume("RIGHT_PAREN", "Expect ')' after expression.");
      return new Grouping(expr);
    }

    throw this.error(this.peek(), "Expect expression.");
  }

  private consume(type: string, message: string): Token {
    if (this.check(type)) return this.advance();
    throw this.error(this.peek(), message);
  }

  private error(token: Token, message: string): Error {
    this.hadError = true;
    if (token.type === "EOF") {
      console.error(`[line ${token.line}] Error at end: ${message}`);
    } else {
      console.error(`[line ${token.line}] Error at '${token.lexeme}': ${message}`);
    }
    return new Error(message);
  }

  private match(...types: string[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: string): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === "EOF";
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }
}

// Interpreter
interface LoxCallable {
  arity(): number;
  call(interpreter: Interpreter, args: any[]): any;
}

class ClockNative implements LoxCallable {
  arity(): number {
    return 0;
  }

  call(interpreter: Interpreter, args: any[]): any {
    return Date.now() / 1000;
  }

  toString(): string {
    return "<native fn>";
  }
}

class LoxFunction implements LoxCallable {
  private declaration: Function;
  private closure: Environment;

  constructor(declaration: Function, closure: Environment) {
    this.declaration = declaration;
    this.closure = closure;
  }

  arity(): number {
    return this.declaration.params.length;
  }

  call(interpreter: Interpreter, args: any[]): any {
    const environment = new Environment(this.closure);

    for (let i = 0; i < this.declaration.params.length; i++) {
      environment.define(this.declaration.params[i].lexeme, args[i]);
    }

    try {
      interpreter.executeBlock(this.declaration.body, environment);
    } catch (returnValue) {
      if (returnValue instanceof ReturnException) {
        return returnValue.value;
      }
      throw returnValue;
    }

    return null;
  }

  toString(): string {
    return `<fn ${this.declaration.name.lexeme}>`;
  }
}

class Environment {
  private values: Map<string, any> = new Map();
  public enclosing: Environment | null = null;

  constructor(enclosing: Environment | null = null) {
    this.enclosing = enclosing;
  }

  define(name: string, value: any): void {
    this.values.set(name, value);
  }

  get(name: Token): any {
    if (this.values.has(name.lexeme)) {
      return this.values.get(name.lexeme);
    }

    if (this.enclosing !== null) {
      return this.enclosing.get(name);
    }

    throw new RuntimeError(name, `Undefined variable '${name.lexeme}'.`);
  }

  assign(name: Token, value: any): void {
    if (this.values.has(name.lexeme)) {
      this.values.set(name.lexeme, value);
      return;
    }

    if (this.enclosing !== null) {
      this.enclosing.assign(name, value);
      return;
    }

    throw new RuntimeError(name, `Undefined variable '${name.lexeme}'.`);
  }
  getAt(distance: number, name: string): any {
    return this.ancestor(distance).values.get(name);
  }

  assignAt(distance: number, name: Token, value: any): void {
    this.ancestor(distance).values.set(name.lexeme, value);
  }

  ancestor(distance: number): Environment {
    let environment: Environment = this;
    for (let i = 0; i < distance; i++) {
      if (environment.enclosing) {
        environment = environment.enclosing;
      }
    }
    return environment;
  }
}

class RuntimeError extends Error {
  constructor(public token: Token, message: string) {
    super(message);
  }
}

class ReturnException extends Error {
  constructor(public value: any) {
    super();
  }
}

class Resolver implements ExprVisitor<void>, StmtVisitor<void> {
  private interpreter: Interpreter;
  private scopes: Map<string, boolean>[] = [];
  private currentFunction: string = "none";
  private hadError: boolean = false;

  constructor(interpreter: Interpreter) {
    this.interpreter = interpreter;
  }

  resolveStatements(statements: Stmt[]): void {
    for (const statement of statements) {
      this.resolveStmt(statement);
    }
  }
  hasError(): boolean {
    return this.hadError;
  }

  private error(token: Token, message: string): void {
    this.hadError = true;
    console.error(`[line ${token.line}] Error at '${token.lexeme}': ${message}`);
  }

  private resolveStmt(stmt: Stmt): void {
    stmt.accept(this);
  }

  private resolveExpr(expr: Expr): void {
    expr.accept(this);
  }

  visitBlockStmt(stmt: Block): void {
    this.beginScope();
    this.resolveStatements(stmt.statements);
    this.endScope();
  }

  visitVarStmt(stmt: Var): void {
    this.declare(stmt.name);
    if (stmt.initializer !== null) {
      this.resolveExpr(stmt.initializer);
    }
    this.define(stmt.name);
  }

  visitVariableExpr(expr: Variable): void {
    if (this.scopes.length > 0) {
      const scope = this.scopes[this.scopes.length - 1];
      if (scope.has(expr.name.lexeme) && scope.get(expr.name.lexeme) === false) {
        this.error(expr.name, "Can't read local variable in its own initializer.");  // ✅ ADD THIS
      }
    }
    this.resolveLocal(expr, expr.name);
  }

  visitAssignExpr(expr: Assign): void {
    this.resolveExpr(expr.value);
    this.resolveLocal(expr, expr.name);
  }

  visitFunctionStmt(stmt: Function): void {
    this.declare(stmt.name);
    this.define(stmt.name);
    this.resolveFunction(stmt, "function");
  }

  visitExpressionStmt(stmt: Expression): void {
    this.resolveExpr(stmt.expression);
  }

  visitIfStmt(stmt: If): void {
    this.resolveExpr(stmt.condition);
    this.resolveStmt(stmt.thenBranch);
    if (stmt.elseBranch !== null) {
      this.resolveStmt(stmt.elseBranch);
    }
  }

  visitPrintStmt(stmt: Print): void {
    this.resolveExpr(stmt.expression);
  }

  visitReturnStmt(stmt: Return): void {
    if (this.currentFunction === "none") {
      // Error: return outside function
    }
    if (stmt.value !== null) {
      this.resolveExpr(stmt.value);
    }
  }

  visitWhileStmt(stmt: While): void {
    this.resolveExpr(stmt.condition);
    this.resolveStmt(stmt.body);
  }

  visitBinaryExpr(expr: Binary): void {
    this.resolveExpr(expr.left);
    this.resolveExpr(expr.right);
  }

  visitCallExpr(expr: Call): void {
    this.resolveExpr(expr.callee);
    for (const arg of expr.args) {
      this.resolveExpr(arg);
    }
  }

  visitGroupingExpr(expr: Grouping): void {
    this.resolveExpr(expr.expression);
  }

  visitLiteralExpr(expr: Literal): void {
    // Nothing to resolve
  }

  visitLogicalExpr(expr: Logical): void {
    this.resolveExpr(expr.left);
    this.resolveExpr(expr.right);
  }

  visitUnaryExpr(expr: Unary): void {
    this.resolveExpr(expr.right);
  }

  private resolveFunction(func: Function, type: string): void {
    const enclosingFunction = this.currentFunction;
    this.currentFunction = type;

    this.beginScope();
    for (const param of func.params) {
      this.declare(param);
      this.define(param);
    }
    this.resolveStatements(func.body);
    this.endScope();

    this.currentFunction = enclosingFunction;
  }

  private beginScope(): void {
    this.scopes.push(new Map<string, boolean>());
  }

  private endScope(): void {
    this.scopes.pop();
  }

  private declare(name: Token): void {
    if (this.scopes.length === 0) return;
    const scope = this.scopes[this.scopes.length - 1];

    if (scope.has(name.lexeme)) {
      this.error(name, "Already a variable with this name in this scope.");
    }

    scope.set(name.lexeme, false);
  }

  private define(name: Token): void {
    if (this.scopes.length === 0) return;
    const scope = this.scopes[this.scopes.length - 1];
    scope.set(name.lexeme, true);
  }

  private resolveLocal(expr: Expr, name: Token): void {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i].has(name.lexeme)) {
        this.interpreter.resolve(expr, this.scopes.length - 1 - i);
        return;
      }
    }
    // Not found. Assume it's global.
  }
}

class Interpreter implements ExprVisitor<any>, StmtVisitor<void> {
  private hadRuntimeError: boolean = false;
  private globals: Environment = new Environment();
  private locals: Map<Expr, number> = new Map();
  private environment: Environment = this.globals;

  constructor() {
    this.globals.define("clock", new ClockNative());
  }

  interpret(expression: Expr): any {
    try {
      return this.evaluate(expression);
    } catch (error) {
      if (error instanceof RuntimeError) {
        this.hadRuntimeError = true;
        console.error(error.message);
        console.error(`[line ${error.token.line}]`);
      }
      return null;
    }
  }

  interpretStatements(statements: Stmt[]): void {
    try {
      for (const statement of statements) {
        this.execute(statement);
      }
    } catch (error) {
      if (error instanceof RuntimeError) {
        this.hadRuntimeError = true;
        console.error(error.message);
        console.error(`[line ${error.token.line}]`);
      }
    }
  }

  private execute(stmt: Stmt): void {
    stmt.accept(this);
  }

  visitExpressionStmt(stmt: Expression): void {
    this.evaluate(stmt.expression);
  }

  visitPrintStmt(stmt: Print): void {
    const value = this.evaluate(stmt.expression);
    console.log(this.stringify(value));
  }

  visitVarStmt(stmt: Var): void {
    let value = null;
    if (stmt.initializer !== null) {
      value = this.evaluate(stmt.initializer);
    }

    this.environment.define(stmt.name.lexeme, value);
  }

  visitBlockStmt(stmt: Block): void {
    this.executeBlock(stmt.statements, new Environment(this.environment));
  }

  visitIfStmt(stmt: If): void {
    if (this.isTruthy(this.evaluate(stmt.condition))) {
      this.execute(stmt.thenBranch);
    } else if (stmt.elseBranch !== null) {
      this.execute(stmt.elseBranch);
    }
  }

  visitWhileStmt(stmt: While): void {
    while (this.isTruthy(this.evaluate(stmt.condition))) {
      this.execute(stmt.body);
    }
  }

  visitFunctionStmt(stmt: Function): void {
    const func = new LoxFunction(stmt, this.environment);
    this.environment.define(stmt.name.lexeme, func);
  }

  visitReturnStmt(stmt: Return): void {
    let value = null;
    if (stmt.value !== null) {
      value = this.evaluate(stmt.value);
    }

    throw new ReturnException(value);
  }

  executeBlock(statements: Stmt[], environment: Environment): void {
    const previous = this.environment;
    try {
      this.environment = environment;

      for (const statement of statements) {
        this.execute(statement);
      }
    } finally {
      this.environment = previous;
    }
  }

  hasRuntimeError(): boolean {
    return this.hadRuntimeError;
  }

  resolve(expr: Expr, depth: number): void {
    this.locals.set(expr, depth);
  }

  visitLiteralExpr(expr: Literal): any {
    return expr.value;
  }

  visitVariableExpr(expr: Variable): any {
    return this.lookUpVariable(expr.name, expr);
  }

  private lookUpVariable(name: Token, expr: Expr): any {
    const distance = this.locals.get(expr);
    if (distance !== undefined) {
      return this.environment.getAt(distance, name.lexeme);
    } else {
      return this.globals.get(name);
    }
  }

  visitAssignExpr(expr: Assign): any {
    const value = this.evaluate(expr.value);
    const distance = this.locals.get(expr);
    if (distance !== undefined) {
      this.environment.assignAt(distance, expr.name, value);
    } else {
      this.globals.assign(expr.name, value);
    }
    return value;
  }

  visitLogicalExpr(expr: Logical): any {
    const left = this.evaluate(expr.left);

    if (expr.operator.type === "OR") {
      if (this.isTruthy(left)) return left;
    } else if (expr.operator.type === "AND") {
      if (!this.isTruthy(left)) return left;
    }

    return this.evaluate(expr.right);
  }

  visitCallExpr(expr: Call): any {
    const callee = this.evaluate(expr.callee);

    const args: any[] = [];
    for (const argument of expr.args) {
      args.push(this.evaluate(argument));
    }

    if (!this.isCallable(callee)) {
      throw new RuntimeError(expr.paren, "Can only call functions and classes.");
    }

    const func: LoxCallable = callee as LoxCallable;

    if (args.length !== func.arity()) {
      throw new RuntimeError(
        expr.paren,
        `Expected ${func.arity()} arguments but got ${args.length}.`
      );
    }

    return func.call(this, args);
  }

  private isCallable(value: any): boolean {
    return value && typeof value === "object" && "call" in value && "arity" in value;
  }

  visitGroupingExpr(expr: Grouping): any {
    return this.evaluate(expr.expression);
  }

  visitUnaryExpr(expr: Unary): any {
    const right = this.evaluate(expr.right);

    switch (expr.operator.type) {
      case "MINUS":
        this.checkNumberOperand(expr.operator, right);
        return -Number(right);
      case "BANG":
        return !this.isTruthy(right);
    }

    return null;
  }

  visitBinaryExpr(expr: Binary): any {
    const left = this.evaluate(expr.left);
    const right = this.evaluate(expr.right);

    switch (expr.operator.type) {
      case "MINUS":
        this.checkNumberOperands(expr.operator, left, right);
        return Number(left) - Number(right);
      case "PLUS":
        if (typeof left === "number" && typeof right === "number") {
          return left + right;
        }
        if (typeof left === "string" && typeof right === "string") {
          return left + right;
        }
        throw new RuntimeError(expr.operator, "Operands must be two numbers or two strings.");
      case "SLASH":
        this.checkNumberOperands(expr.operator, left, right);
        return Number(left) / Number(right);
      case "STAR":
        this.checkNumberOperands(expr.operator, left, right);
        return Number(left) * Number(right);
      case "GREATER":
        this.checkNumberOperands(expr.operator, left, right);
        return Number(left) > Number(right);
      case "GREATER_EQUAL":
        this.checkNumberOperands(expr.operator, left, right);
        return Number(left) >= Number(right);
      case "LESS":
        this.checkNumberOperands(expr.operator, left, right);
        return Number(left) < Number(right);
      case "LESS_EQUAL":
        this.checkNumberOperands(expr.operator, left, right);
        return Number(left) <= Number(right);
      case "BANG_EQUAL":
        return !this.isEqual(left, right);
      case "EQUAL_EQUAL":
        return this.isEqual(left, right);
    }

    return null;
  }

  private evaluate(expr: Expr): any {
    return expr.accept(this);
  }

  private isTruthy(value: any): boolean {
    if (value === null) return false;
    if (typeof value === "boolean") return value;
    return true;
  }

  private isEqual(a: any, b: any): boolean {
    if (a === null && b === null) return true;
    if (a === null) return false;
    return a === b;
  }

  private checkNumberOperand(operator: Token, operand: any): void {
    if (typeof operand === "number") return;
    throw new RuntimeError(operator, "Operand must be a number.");
  }

  private checkNumberOperands(operator: Token, left: any, right: any): void {
    if (typeof left === "number" && typeof right === "number") return;
    throw new RuntimeError(operator, "Operands must be numbers.");
  }

  stringify(value: any): string {
    if (value === null) return "nil";
    if (typeof value === "number") {
      let text = value.toString();
      if (text.endsWith(".0")) {
        text = text.substring(0, text.length - 2);
      }
      return text;
    }
    return value.toString();
  }
}

// Scanner implementation
class Scanner {
  private source: string;
  private tokens: Token[] = [];
  private start: number = 0;
  private current: number = 0;
  private line: number = 1;
  private hadError: boolean = false;
  private keywords: Map<string, string> = new Map([
    ['and', 'AND'],
    ['class', 'CLASS'],
    ['else', 'ELSE'],
    ['false', 'FALSE'],
    ['for', 'FOR'],
    ['fun', 'FUN'],
    ['if', 'IF'],
    ['nil', 'NIL'],
    ['or', 'OR'],
    ['print', 'PRINT'],
    ['return', 'RETURN'],
    ['super', 'SUPER'],
    ['this', 'THIS'],
    ['true', 'TRUE'],
    ['var', 'VAR'],
    ['while', 'WHILE']
  ]);

  constructor(source: string) {
    this.source = source;
  }

  scanTokens(): Token[] {
    while (!this.isAtEnd()) {
      this.start = this.current;
      this.scanToken();
    }
    this.tokens.push(new Token("EOF", "", null, this.line));
    return this.tokens;
  }

  private scanToken(): void {
    const c = this.advance();

    switch (c) {
      case '(':
        this.addToken("LEFT_PAREN");
        break;
      case ')':
        this.addToken("RIGHT_PAREN");
        break;
      case '{':
        this.addToken("LEFT_BRACE");
        break;
      case '}':
        this.addToken("RIGHT_BRACE");
        break;
      case ',':
        this.addToken("COMMA");
        break;
      case '.':
        this.addToken("DOT");
        break;
      case '-':
        this.addToken("MINUS");
        break;
      case '+':
        this.addToken("PLUS");
        break;
      case ';':
        this.addToken("SEMICOLON");
        break;
      case '*':
        this.addToken("STAR");
        break;
      case '!':
        this.addToken(this.match('=') ? "BANG_EQUAL" : "BANG");
        break;
      case '=':
        this.addToken(this.match('=') ? "EQUAL_EQUAL" : "EQUAL");
        break;
      case '<':
        this.addToken(this.match('=') ? "LESS_EQUAL" : "LESS");
        break;
      case '>':
        this.addToken(this.match('=') ? "GREATER_EQUAL" : "GREATER");
        break;
      case '/':
        if (this.match('/')) {
          while (this.peek() !== '\n' && !this.isAtEnd()) {
            this.advance();
          }
        } else {
          this.addToken("SLASH");
        }
        break;
      case '"':
        this.scanString();
        break;
      case ' ':
      case '\r':
      case '\t':
        break;
      case '\n':
        this.line++;
        break;
      default:
        if (this.isDigit(c)) {
          this.scanNumber();
        } else if (this.isAlpha(c)) {
          this.scanIdentifier();
        } else {
          this.error(this.line, `Unexpected character: ${c}`);
        }
        break;
    }
  }

  private scanString(): void {
    while (this.peek() !== '"' && !this.isAtEnd()) {
      if (this.peek() === '\n') this.line++;
      this.advance();
    }

    if (this.isAtEnd()) {
      this.error(this.line, "Unterminated string.");
      return;
    }

    this.advance();
    const value = this.source.substring(this.start + 1, this.current - 1);
    this.addToken("STRING", value);
  }

  private scanNumber(): void {
    while (this.isDigit(this.peek())) {
      this.advance();
    }

    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      this.advance();
      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }

    const value = parseFloat(this.source.substring(this.start, this.current));
    this.addToken("NUMBER", value);
  }

  private scanIdentifier(): void {
    while (this.isAlphaNumeric(this.peek())) {
      this.advance();
    }

    const text = this.source.substring(this.start, this.current);
    const tokenType = this.keywords.get(text) || "IDENTIFIER";

    // Only set literal values for true, false, nil (used by parser)
    // But these won't be displayed in tokenize output
    let literal = null;
    if (tokenType === "TRUE") literal = true;
    else if (tokenType === "FALSE") literal = false;
    else if (tokenType === "NIL") literal = null;

    this.addToken(tokenType, literal);
  }

  private match(expected: string): boolean {
    if (this.isAtEnd()) return false;
    if (this.source.charAt(this.current) !== expected) return false;
    this.current++;
    return true;
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.source.charAt(this.current);
  }

  private peekNext(): string {
    if (this.current + 1 >= this.source.length) return '\0';
    return this.source.charAt(this.current + 1);
  }

  private isDigit(c: string): boolean {
    return c >= '0' && c <= '9';
  }

  private isAlpha(c: string): boolean {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
  }

  private isAlphaNumeric(c: string): boolean {
    return this.isAlpha(c) || this.isDigit(c);
  }

  private advance(): string {
    return this.source.charAt(this.current++);
  }

  private isAtEnd(): boolean {
    return this.current >= this.source.length;
  }

  private addToken(type: string, literal: any = null): void {
    const text = this.source.substring(this.start, this.current);
    this.tokens.push(new Token(type, text, literal, this.line));
  }

  private error(line: number, message: string): void {
    console.error(`[line ${line}] Error: ${message}`);
    this.hadError = true;
  }

  hasError(): boolean {
    return this.hadError;
  }
}

// Main execution
const scanner = new Scanner(fileContent);
const tokens = scanner.scanTokens();

if (command === "tokenize") {
  tokens.forEach(token => {
    let literalStr = "null";
    // Only display literal values for NUMBER and STRING tokens
    if (token.type === "NUMBER" && token.literal !== null) {
      literalStr = token.literal.toString();
      if (!literalStr.includes('.')) literalStr += '.0';
    } else if (token.type === "STRING" && token.literal !== null) {
      literalStr = token.literal;
    }
    console.log(`${token.type} ${token.lexeme} ${literalStr}`);
  });

  if (scanner.hasError()) {
    process.exit(65);
  }
} else if (command === "parse") {
  if (scanner.hasError()) {
    process.exit(65);
  }

  const parser = new Parser(tokens);
  const expression = parser.parse();

  if (parser.hasError()) {
    process.exit(65);
  }

  if (expression) {
    const printer = new AstPrinter();
    console.log(printer.print(expression));
  }
} else if (command === "evaluate") {
  if (scanner.hasError()) {
    process.exit(65);
  }

  const parser = new Parser(tokens);
  const expression = parser.parse();

  if (parser.hasError()) {
    process.exit(65);
  }

  if (expression) {
    const interpreter = new Interpreter();
    const result = interpreter.interpret(expression);

    if (interpreter.hasRuntimeError()) {
      process.exit(70);
    }

    console.log(interpreter.stringify(result));
  }
} else if (command === "run") {
  if (scanner.hasError()) {
    process.exit(65);
  }

  const parser = new Parser(tokens);
  const statements = parser.parseStatements();

  if (parser.hasError()) {
    process.exit(65);
  }

  const interpreter = new Interpreter();

  const resolver = new Resolver(interpreter);
  resolver.resolveStatements(statements);

  if (resolver.hasError()) {      // ✅ ADD THIS CHECK
    process.exit(65);              // ✅ ADD THIS
  }                                 // ✅ ADD THIS

  interpreter.interpretStatements(statements);

  if (interpreter.hasRuntimeError()) {
    process.exit(70);
  }
}
