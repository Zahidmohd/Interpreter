import fs from "fs";

const args: string[] = process.argv.slice(2);

if (args.length < 2) {
  console.error("Usage: ./your_program.sh tokenize <filename>");
  process.exit(1);
}

const command: string = args[0];

if (command !== "tokenize") {
  console.error(`Usage: Unknown command: ${command}`);
  process.exit(1);
}

const filename: string = args[1];
const fileContent: string = fs.readFileSync(filename, "utf8");

// Scanner implementation
class Scanner {
  private source: string;
  private tokens: string[] = [];
  private current: number = 0;
  private line: number = 1;
  private hadError: boolean = false;

  constructor(source: string) {
    this.source = source;
  }

  scanTokens(): void {
    while (!this.isAtEnd()) {
      this.scanToken();
    }
    this.tokens.push("EOF  null");
  }

  private scanToken(): void {
    const c = this.advance();
    
    switch (c) {
      case '(':
        this.addToken("LEFT_PAREN", "(");
        break;
      case ')':
        this.addToken("RIGHT_PAREN", ")");
        break;
      case '{':
        this.addToken("LEFT_BRACE", "{");
        break;
      case '}':
        this.addToken("RIGHT_BRACE", "}");
        break;
      case ',':
        this.addToken("COMMA", ",");
        break;
      case '.':
        this.addToken("DOT", ".");
        break;
      case '-':
        this.addToken("MINUS", "-");
        break;
      case '+':
        this.addToken("PLUS", "+");
        break;
      case ';':
        this.addToken("SEMICOLON", ";");
        break;
      case '*':
        this.addToken("STAR", "*");
        break;
      case '!':
        if (this.match('=')) {
          this.addToken("BANG_EQUAL", "!=");
        } else {
          this.addToken("BANG", "!");
        }
        break;
      case '=':
        if (this.match('=')) {
          this.addToken("EQUAL_EQUAL", "==");
        } else {
          this.addToken("EQUAL", "=");
        }
        break;
      case '<':
        if (this.match('=')) {
          this.addToken("LESS_EQUAL", "<=");
        } else {
          this.addToken("LESS", "<");
        }
        break;
      case '>':
        if (this.match('=')) {
          this.addToken("GREATER_EQUAL", ">=");
        } else {
          this.addToken("GREATER", ">");
        }
        break;
      case '/':
        if (this.match('/')) {
          // Comment - consume until end of line
          while (this.peek() !== '\n' && !this.isAtEnd()) {
            this.advance();
          }
        } else {
          this.addToken("SLASH", "/");
        }
        break;
      case '"':
        this.scanString();
        break;
      case ' ':
      case '\r':
      case '\t':
        // Ignore whitespace
        break;
      case '\n':
        this.line++;
        break;
      default:
        if (this.isDigit(c)) {
          this.scanNumber();
        } else {
          // Unknown character - report error
          this.error(this.line, `Unexpected character: ${c}`);
        }
        break;
    }
  }

  private isDigit(c: string): boolean {
    return c >= '0' && c <= '9';
  }

  private scanNumber(): void {
    const start = this.current - 1;
    
    // Consume all digits
    while (this.isDigit(this.peek())) {
      this.advance();
    }
    
    // Look for decimal point followed by digits
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      // Consume the '.'
      this.advance();
      
      // Consume fractional part
      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }
    
    const lexeme = this.source.substring(start, this.current);
    const value = parseFloat(lexeme);
    
    // Ensure the literal always has a decimal point
    const literal = lexeme.includes('.') ? value.toString() : value.toFixed(1);
    
    this.addTokenWithLiteral("NUMBER", lexeme, literal);
  }

  private peekNext(): string {
    if (this.current + 1 >= this.source.length) return '\0';
    return this.source.charAt(this.current + 1);
  }

  private scanString(): void {
    const start = this.current - 1; // Position of opening quote
    
    while (this.peek() !== '"' && !this.isAtEnd()) {
      if (this.peek() === '\n') {
        this.line++;
      }
      this.advance();
    }
    
    if (this.isAtEnd()) {
      this.error(this.line, "Unterminated string.");
      return;
    }
    
    // Consume closing quote
    this.advance();
    
    // Extract the string value (without quotes)
    const lexeme = this.source.substring(start, this.current);
    const value = this.source.substring(start + 1, this.current - 1);
    
    this.addTokenWithLiteral("STRING", lexeme, value);
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

  private advance(): string {
    return this.source.charAt(this.current++);
  }

  private isAtEnd(): boolean {
    return this.current >= this.source.length;
  }

  private addToken(type: string, lexeme: string): void {
    this.tokens.push(`${type} ${lexeme} null`);
  }

  private addTokenWithLiteral(type: string, lexeme: string, literal: string): void {
    this.tokens.push(`${type} ${lexeme} ${literal}`);
  }

  private error(line: number, message: string): void {
    console.error(`[line ${line}] Error: ${message}`);
    this.hadError = true;
  }

  getTokens(): string[] {
    return this.tokens;
  }

  hasError(): boolean {
    return this.hadError;
  }
}

const scanner = new Scanner(fileContent);
scanner.scanTokens();
scanner.getTokens().forEach(token => console.log(token));

// Exit with code 65 if there were errors
if (scanner.hasError()) {
  process.exit(65);
}
