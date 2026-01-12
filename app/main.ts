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
      case ' ':
      case '\r':
      case '\t':
        // Ignore whitespace
        break;
      case '\n':
        this.line++;
        break;
      default:
        // Unknown character - report error
        this.error(this.line, `Unexpected character: ${c}`);
        break;
    }
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
