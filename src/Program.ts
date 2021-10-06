import { Command } from 'commander';
import { LIB_VERSION } from './version';

export default class Program {
  private readonly _version: string;
  private readonly _command: Command;

  constructor() {
    this._version = LIB_VERSION;
    this._command = new Command();
    this._command.version(this._version);
  }

  async run(argv: string[]): Promise<void> {
    this._command.parse(argv);
    const options = this._command.opts();
    console.log(options);
  }
}
