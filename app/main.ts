import fs from "fs";

const args: string[] = process.argv.slice(2);

if (args.length < 2) {
  console.error("Usage: ./your_program.sh <command> <filename>");
  process.exit(1);
}

const command: string = args[0];

if (command !== "tokenize" && command !== "parse") {
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

  private expression(): Expr {
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

    throw new Error("Expect expression.");
  }

  private consume(type: string, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new Error(message);
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
  const parser = new Parser(tokens);
  const expression = parser.parse();
  
  if (expression) {
    const printer = new AstPrinter();
    console.log(printer.print(expression));
  }
}
