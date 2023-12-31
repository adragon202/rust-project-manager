import { CommandHandler } from './commandHandler';
import * as child_process from 'child_process';

/** Pre-existing Crate Templates accepted by CargoNew */
export enum CrateType{
    /** (Default) Binary Application Executable */
    bin,
    /** Library extension */
    lib,
}

/** Known Version Control Systems that can be initialized by CargoNew. */
export enum CrateVersionControl{
    /** (Default) */
    git,
    hg,
    pijul,
    fossil,
    /** Do not initialize any version control at all. */
    none
}

/**
 * Create a new cargo package at <path>
 */
export class NewCrate extends CommandHandler{
    /** Type to use for new Crate */
    crateType?: CrateType;
    /** Path to where the new crate will exist locally */
    path: string;
    /** Edition to set for the crate generated. Defaults to latest 2021 */
    edition?: 2015 | 2018 | 2021;
    /** Initialize the new repository for the given version control system */
    versionControl?: CrateVersionControl;
    /** Run without accessing the network */
    isOffline: boolean = false;
    /** Create Cargo Package in new directory */
    createDirectory: boolean = true;
    /** Override a configuration value */
    config: Map<string, string> = new Map<string, string>();
    constructor(path: string, crateType?: CrateType){
        super();
        this.path = path;
        this.crateType = crateType;
    }
    getCommand(): string{
        let cmd: string = `cargo ${(this.createDirectory ? 'new' : 'init')}`;
        if (this.edition !== undefined && this.edition !== null){
            cmd += `--edition ${this.edition}`;
        }
        if (this.versionControl !== undefined && this.versionControl !== null){
            cmd += ` --vcs ${CrateVersionControl[this.versionControl]}`;
        }
        if (this.isOffline){
            cmd += ` --offline`;
        }
        for(let [key, value] of this.config){
            cmd += ` --config ${key}=${value}`;
        }
        if (this.crateType !== undefined && this.crateType !== null){
            cmd += ` --${CrateType[this.crateType]}`;
        }
        let pathSubParts = this.path?.split('\\');
        if ((pathSubParts?.length ?? 0) > 0){
            let name = pathSubParts[pathSubParts.length - 1];
            if (name.includes(' ')){
                do{
                    name = name.replace(' ', '_');
                } while(name.includes(' '));
                cmd += ` --name ${name}`;
            }
        }
        cmd += ` "${this.path}"`;
        return cmd;
    }//end GetCommand(): string
    async execute(): Promise<void>{
        let stdout = await this.executeCommand();
        console.log(stdout);
    }//end Execute<T>(): Promise<T>
}

/**
 * Makes a new project from a template
 */
export class Generate{
    /** Type to use for new Crate */
    crateType?: CrateType;
    /** Directory to create / project name. Kebab-case is enforced unless forceName is true. */
    name: string;
    /** If true then don't convert the project name to kebab-case before creating the directory. */
    forceName: boolean = false;
    /** URL, Relative Path, ABsolute Path, or 'owner/repo' abbreviated GitHub URL of the repo to clone the template from. */
    gitRepoPath?: string;
    /** Branch to use when installing from git */
    gitBranch?: string;
    /** Tag to use when installing from git */
    gitTag?: string;
    /** Local Path to copy the template from. */
    localTemplate?: string;
    /** Generatea  favorite template as defined in the config (generateConfigFile). if undefined, use in place of the git option, otherwise specified the subfolder */
    favoriteTemplate?: string;
    /** Template Values in a file of format 'key=value', one per line */
    templateValuesFilePath?: string;
    /** Use specific configuration file. Defaults to $CARGO_HOME/cargo-generate or $HOME/.cargo/cargo-generate */
    configFile?: string;
    /** Initialize the new repository for the given version control system */
    versionControl?: CrateVersionControl;
    /** Create Cargo Package in new directory */
    createDirectory: boolean = true;
    /** Handler used to get a value for a specific prompt. Supports async behavior. */
    getValueHandler?: (process: child_process.ChildProcess, prompt: string) => Promise<string>;
    constructor(name: string){
        this.name = name;
    }
    /** Returns arguments for this command in array form. */
    getArgs(): string[]{
        let args: string[] = [];
        args.push('generate');
        if (this.name) { args.push(`--name`); args.push(`"${this.name}"`); }
        if (this.forceName) { args.push(' -f'); }
        if (this.gitRepoPath) { args.push(`--git`); args.push(`${this.gitRepoPath}`); }
        if (this.gitBranch) { args.push(`--branch`); args.push(`${this.gitBranch}`); }
        if (this.gitTag) { args.push(`--tag`); args.push(`${this.gitTag}`); }
        if (this.localTemplate) { args.push(`--path`); args.push(`"${this.localTemplate}"`); }
        if (this.favoriteTemplate) { args.push(`--favorite`); args.push(`${this.favoriteTemplate}`); }
        if (this.templateValuesFilePath) { args.push(`--template-values-file`); args.push(`'${this.templateValuesFilePath}'`); }
        if (this.configFile) { args.push(`--config`); args.push(`'${this.configFile}'`); }
        if (this.versionControl !== undefined && this.versionControl !== null){ args.push(`--vcs`); args.push(`${CrateVersionControl[this.versionControl]}`); }
        if (this.crateType !== null && this.crateType !== undefined) { args.push(`--${CrateType[this.crateType]}`); }
        if (this.createDirectory) { args.push(`--init`); }
        return args;
    }
    /** Generates command in a single string */
    getCommand(): string{
        let cmd = 'cargo';
        let args = this.getArgs();
        if (args.length > 0) { cmd += ' ' + args.join(' ');}
        return cmd;
    }
    /** Executes command. Returns on completion. */
    async execute(): Promise<void>{
        return new Promise<void>((resolve, reject) => {
            try{
                let command = this.getCommand();
                console.log(`Spawning '${command}'`);
                let spawn = child_process.spawn('cargo', this.getArgs(), {
                    stdio: ['pipe', 'pipe', 'pipe'],
                });
                // //Handle Data Stream
                spawn.stdout.on('data', async (data) => {
                    console.log(`cargo generate stdout '${data}'`);
                });
                let laststderr: string | null = null;
                spawn.stderr.on('data', async (err: Buffer | string) => {
                    try{
                        //Evaluate if Prompt
                        if (Buffer.isBuffer(err)){
                            err = err.toString();
                        }
                        else if (typeof(err) !== 'string'){
                            console.log(`Err is type ${typeof(err)}, not string`);
                            console.log(err);
                            err = `${err}`;
                        };
                        if (err.includes(':'))
                        {
                            err = err.substring(0, err.indexOf(':'));
                        }else{
                            //Process as error    
                            console.log(`cargo generate stderr '${err}'`);
                            return;
                        }
                        //Process as Prompt
                        if (laststderr === err || (laststderr && (err as string).startsWith(laststderr))){ return; }
                        laststderr = err;
                        console.log(`cargo generate stderr '${err}'`);
                        if (this.getValueHandler)
                        {
                            if (!spawn.stdin.writable) {throw new Error(`Stdin Not Writable`);}
                            let response = await this.getValueHandler(spawn, `${err}`);
                            console.log(`Responding to cargo generate stderr with '${response}'`);
                            spawn.stdin.write(response);
                        }else{
                            console.log(`Not Responding to cargo generate stdout`);
                        }
                        laststderr = null;
                    }catch(err){
                        spawn.kill();
                        reject(err);
                    }
                });
                spawn.stdin.on('drain', () => {
                    console.log(`stdin was drained`);
                })
                //Handle On Close events
                spawn.on('exit', (value) => { 
                    if (value !== null && value !== 0) { reject(`cargo generate exited with Code ${value}`); }
                    else { resolve(); }
                });
                spawn.on('close', (value) => { 
                    if (value !== null && value !== 0) { reject(`cargo generate exited with Code ${value}`); }
                    else { resolve(); }
                });
                spawn.on('error', (err) => {
                    console.log(`cargo generate error with '${err}'`);
                    reject(err); 
                });
                console.log(spawn.stdin.writableHighWaterMark);
                console.log(`cargo generate spawn configured`);
            }catch(err){
                reject(err);
            }
        });
    }
}

/**
 * Handles execution of the Search for Crates command.
 * This performs a textual search for crates on https://crates.io.
 * The matching crates will be displayed along with their description in TOML format suitable for copying into a Cargo.toml manifest.
 */
export class SearchCrates extends CommandHandler{
    /** partial or full string name of crate to identify  */
    query: string = '';
    /** Limit the number of results (default: 10, max: 100). */
    limit?: number = undefined;
    /** The URL of the registry index to use. */
    index?: string = undefined;
    /**
     *  Name of the registry to use. Registry names are defined in Cargo config files.
     *  If not specified, the default registry is used, which is defined by the registry.default config key which defaults to crates-io.
     */
    registry?: string = undefined;

    constructor(query: string){
        super();
        this.query = query;
    }
    getCommand(): string{
        let cmd: string = `cargo search`;
        if (this.limit) { cmd += ` --limit ${this.limit}`; }
        if (this.index) { cmd += ` --index ${this.index}`; }
        if (this.registry) { cmd += ` --registry ${this.registry}`; }
        cmd += ` ${this.query}`;
        return cmd;
    }//end GetCommand(): string
    async execute(): Promise<SearchCratesResults>{
        let stdout = await this.executeCommand();
        return new SearchCratesResults(stdout);
    }//end Execute<T>(): Promise<T>
}//end export class CargoSearch extends CommandHandler

/**
 * Formatted Results of the executed Cargo Search Command
 */
export class SearchCratesResults{
    /** Individual response items from search query */
    lineItems: SearchCratesResultsLineItem[] = [];

    constructor(stdout: string){
        if (!stdout) { return; }
        stdout.split('\n').forEach((line) => {
            if (!SearchCratesResultsLineItem.lineItemRegex.test(line)) { return; }
            this.lineItems.push(new SearchCratesResultsLineItem(line));
        });
    }
}//end export class CargoSearchResults

/**
 * Line Item result from Search
 */
export class SearchCratesResultsLineItem{
    /** Regex used to identify parsable result lines from stdout */
    static readonly lineItemRegex: RegExp = /[^\s]+\s[=]\s["][0-9\.]+["]\s+[#]\s[\w\d\s]+/i;
    /** name of crate */
    crate: string = '';
    /** version of crate */
    version: string = '';
    /** description of crate */
    description: string = '';

    constructor(line: string){
        this.crate = /[^\s]+/i.exec(line)?.[0] ?? '';
        this.version = /["][0-9\.]+["]/i.exec(line)?.[0].replace(/["]/g, '') ?? '';
        this.description = /[#]\s[\w\d\s]+/i.exec(line)?.[0].replace('#', '') ?? '';
        console.log(`Parsing ${line} into Cargo Search Result`);
        console.log(`Parsed ${this.crate} @ "${this.version}" # ${this.description}`);
    }
}//end export class CargoSearchResultsLineItem

/**
 * Handles execution of the Add Crate command.
 * Add dependencies to a Cargo.toml manifest file
 */
export class AddCrate extends CommandHandler{
    /** (Source Option) Name of crate to add to Cargo.toml */
    crate: string = '';
    /** (Source Option with crate) Fetch from a registry with a version constraint of “version” */
    version?: string = undefined;
    /** (Source Option) Filesystem path to local crate to add. */
    path?: string = undefined;
    /** (Source Option) Pull from a git repo at url */
    git?: string = undefined;
    /** (Source Option) Branch to use when adding from git. */
    gitBranch?: string = undefined;
    /** (Source Option) Tag to use when adding from git. */
    gitTag?: string = undefined;
    /** (Source Option) Specific commit to use when adding from git. */
    gitRevision?: string = undefined;
    /** (Source Option) Name of the registry to use. Registry names are defined in Cargo config files. If not specified, the default registry is used, which is defined by the registry.default config key which defaults to crates-io. */
    registry?: string = undefined;

    /** (Section Option) Add as a development dependency. */
    isDevelopment: boolean = false;
    /** (Section Option) Add as a build dependency. */
    isBuild: boolean = false;
    /** (Section Option) Add as a dependency to the given target platform. */
    target?: string = undefined;

    /** (Dependency Option) Don’t actually write the manifest */
    isDryRun: boolean = false;
    /** (Dependency Option) Rename the dependency. */
    rename?: string = undefined;
    /** (Dependency Option) Mark the dependency as optional. */
    isOptional: boolean = false;
    /** (Dependency Option) Mark the dependency as required. */
    isRequired: boolean = false;
    /** (Dependency Option) Disable the default features. */
    disableDefault: boolean = false;
    /** (Dependency Option) Re-enable the default features. */
    enableDefault: boolean = false;
    /**
     *  (Dependency Option) Space or comma separated list of features to activate.
     *  When adding multiple crates, the features for a specific crate may be enabled with package-name/feature-name syntax.
     *  This flag may be specified multiple times, which enables all specified features.
     */
    features: string[] = [];

    /** Path to workspace containing Cargo.toml file. */
    workspacePath?: string = undefined;
    /** (Manifest Option) Path to the Cargo.toml file. By default, Cargo searches for the Cargo.toml file in the current directory or any parent directory. */
    manifestPath?: string = undefined;
    /** (Manifest Option) Add dependencies to only the specified package. */
    package?: string = undefined;
    /**
     * (Manifest Option) requires that the Cargo.lock file is up-to-date. If the lock file is missing, or it needs to be updated, Cargo will exit with an error.
     * The --frozen flag also prevents Cargo from attempting to access the network to determine if it is out-of-date.
     * These may be used in environments where you want to assert that the Cargo.lock file is up-to-date (such as a CI build) or want to avoid network access.
     */
    requireLock: boolean = false;
    /**
     * (Manifest Option) Prevents Cargo from accessing the network for any reason.
     * Without this flag, Cargo will stop with an error if it needs to access the network and the network is not available.
     * With this flag, Cargo will attempt to proceed without the network if possible. Beware that this may result in different dependency resolution than online mode.
     * Cargo will restrict itself to crates that are downloaded locally, even if there might be a newer version as indicated in the local copy of the index.
     * See the cargo-fetch(1) command to download dependencies before going offline.
     */
    isOffline: boolean = false;

    getCommand(): string{
        let cmd: string = `cargo add`;
        //Add Options
        if (this.registry) { cmd += ` --registry ${this.registry}`; }
        
        //Define Section Option
        if (this.isBuild){
            cmd += ` --build`;
        }else if (this.isDevelopment){
            cmd += ` --dev`;
        }else if (this.target){
            cmd += ` --target '${this.target}'`;
        }

        //Define Dependency Options
        if (this.isDryRun) { cmd += ` --dry-run`;}
        if (this.rename) { cmd += ` --rename '${this.rename}'`;}
        if (this.isOptional) { cmd += ` --optional`;}
        if (this.isRequired) { cmd += ` --no-optional`;}
        if (this.disableDefault) { cmd += ` --no-default-features`;}
        if (this.enableDefault) { cmd += ` --default-features`;}

        //Define Manifest Options
        if (this.manifestPath) { cmd += ` --manifest-path '${this.manifestPath}'`; }
        if (this.package) { cmd += ` --package ${this.package}`; }
        if (this.requireLock) { cmd += ` --locked`; }
        if (this.isOffline) { cmd += ` --offline`; }

        //Define Source Option
        if (this.crate){
            cmd += ` ${this.crate}`;
            if (this.version) { cmd += ` @ '${this.version}'`;}
        }else if (this.path){
            cmd += ` --path "${this.path}"`;
        }else if (this.git){
            cmd += ` --git ${this.git}`;
            if (this.gitBranch) { cmd += ` --branch ${this.gitBranch}`; }
            if (this.gitTag) { cmd += ` --tag ${this.gitTag}`; }
            if (this.gitRevision) { cmd += ` --rev ${this.gitRevision}`; }
        }
        if ((this.features?.length ?? 0) > 0) { cmd += this.features.map(f => `--features ${f}`).join(' '); }
        return cmd;
    }//end GetCommand(): string
    async execute(): Promise<AddCrateResults>{
        let stdout = await this.executeCommand(this.workspacePath);
        return new AddCrateResults();
    }//end Execute<T>(): Promise<T>
}//end export class CargoAdd extends CommandHandler

/**
 * Formatted Results of the executed Cargo Add Command
 */
export class AddCrateResults{

}//end export class CargoAddResults