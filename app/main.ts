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
      case ' ':
      case '\r':
      case '\t':
      case '\n':
        // Ignore whitespace
        break;
      default:
        // For now, ignore unknown characters
        break;
    }
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

  getTokens(): string[] {
    return this.tokens;
  }
}

const scanner = new Scanner(fileContent);
scanner.scanTokens();
scanner.getTokens().forEach(token => console.log(token));
