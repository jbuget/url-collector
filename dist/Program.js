"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const version_1 = require("./version");
class Program {
    constructor() {
        this._version = version_1.LIB_VERSION;
        this._command = new commander_1.Command();
        this._command.version(this._version);
    }
    async run(argv) {
        this._command.parse(argv);
        const options = this._command.opts();
        console.log(options);
    }
}
exports.default = Program;
//# sourceMappingURL=Program.js.map