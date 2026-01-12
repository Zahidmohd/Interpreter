import fs from "fs";

const args: string[] = process.argv.slice(2);

if (args.length < 2) {
  console.error("Usage: ./your_program.sh <command> <filename>");
  process.exit(1);
}

const command: string = args[0];

if (command !== "tokenize" && command !== "parse" && command !== "evaluate") {
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
  ) {}
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

  hasError(): boolean {
    return this.hadError;
  }

  private expression(): Expr {
    return this.equality();
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

    return this.primary();
  }

  private primary(): Expr {
    if (this.match("FALSE")) return new Literal(false);
    if (this.match("TRUE")) return new Literal(true);
    if (this.match("NIL")) return new Literal(null);

    if (this.match("NUMBER", "STRING")) {
      return new Literal(this.previous().literal);
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
class RuntimeError extends Error {
  constructor(public token: Token, message: string) {
    super(message);
  }
}

class Interpreter implements ExprVisitor<any> {
  private hadRuntimeError: boolean = false;

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

  hasRuntimeError(): boolean {
    return this.hadRuntimeError;
  }

  visitLiteralExpr(expr: Literal): any {
    return expr.value;
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
        return Number(left) - Number(right);
      case "PLUS":
        if (typeof left === "number" && typeof right === "number") {
          return left + right;
        }
        if (typeof left === "string" && typeof right === "string") {
          return left + right;
        }
        break;
      case "SLASH":
        return Number(left) / Number(right);
      case "STAR":
        return Number(left) * Number(right);
      case "GREATER":
        return Number(left) > Number(right);
      case "GREATER_EQUAL":
        return Number(left) >= Number(right);
      case "LESS":
        return Number(left) < Number(right);
      case "LESS_EQUAL":
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
}
