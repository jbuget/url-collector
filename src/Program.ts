import { Command } from 'commander';

export default class Program {
  private readonly _version: string;
  private readonly _command: Command;

  constructor() {
    this._version = '0.0.1';
    this._command = new Command();
    this._command.version(this._version);
  }

  async run(argv: string[]): Promise<void> {
    this._command.parse(argv);
    const options = this._command.opts();
    console.log(options);
  }
}
