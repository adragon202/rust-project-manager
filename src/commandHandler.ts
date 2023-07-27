import * as vscode from 'vscode';
import * as process from 'child_process';

/**
 * Abstract Command Handler to reduce boilerplate code for command execution.
 */
export abstract class CommandHandler{
    /**
     * Returns the command line string to execute
     */
    abstract getCommand(): string;
    /**
     * Executes the command and returns the object formatted output of the command.
     */
    abstract execute(): Promise<unknown>;
    /**
     * Executes the command and returns the stdout of the command, handles async error handling.
     * @returns string: stdout of commmand
     */
    async executeCommand(path?: string): Promise<string>{
        return await new Promise<string>((resolve, reject) => {
            let command = this.getCommand();
            let options: process.ExecOptions = {
                cwd: path,
            };
            console.log(`Executing '${command}'`);
            process.exec(command, options, (err, stdout, stderr) => 
            {
                //console.log(`stdout: ${stdout}`);
                console.log(`stderr: ${stderr}`);
                if (err){
                    console.log(`err: ${err}`);
                    reject(err);
                    return;
                }
                if (stderr !== null && stderr?.trim() !== '')
                {
                    reject(stderr);
                    return;
                }
                resolve(stdout);
            });
        });
    }//end ExecuteCommand(): Promise<string>

    spawnCommand(): process.ChildProcessWithoutNullStreams{
        let command = this.getCommand();
        console.log(`Spawning '${command}'`);
        return process.spawn(command);
    }
}//end export abstract class CommandHandler