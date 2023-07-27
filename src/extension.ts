// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as crate from './cargo';
import * as rustc from './rustc';
import * as toml from '@iarna/toml';
import * as fs from 'fs';
import * as process from 'process';
import * as path from 'path';
import { Repository, RepositoryFile, Search, SearchResults, SearchType } from './gitHub';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let cargoAddDisposable = vscode.commands.registerCommand('rust-project-manager.cargoAdd', cargoAdd);
	let setTargetDisposable = vscode.commands.registerCommand('rust-project-manager.setTarget', setTarget);
	let newBinDisposable = vscode.commands.registerCommand('rust-project-manager.newBin', newBin);
	let newLibDisposable = vscode.commands.registerCommand('rust-project-manager.newLib', newLib);
	let newBinTemplateDisposable = vscode.commands.registerCommand('rust-project-manager.newBinTemplate', newBinTemplate);
	let newLibTemplateDisposable = vscode.commands.registerCommand('rust-project-manager.newLibTemplate', newLibTemplate);

	context.subscriptions.push(cargoAddDisposable);
	context.subscriptions.push(setTargetDisposable);
	context.subscriptions.push(newBinDisposable);
	context.subscriptions.push(newLibDisposable);
	context.subscriptions.push(newBinTemplateDisposable);
	context.subscriptions.push(newLibTemplateDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}

/**
 * Handler for the cargoAdd command. Prompts user to enter a crate name, providing options that match that name, and adds entry/selection to active Cargo.toml
 */
async function cargoAdd(): Promise<void>{
	//Get Target Workspace
	let workspace = await getTargetWorkspace();
	//Implement QuickPick for search
	let stableValueDelay: NodeJS.Timeout | null = null;
	let quickPick = vscode.window.createQuickPick();
	quickPick.onDidChangeValue(value => {
		if (stableValueDelay) {clearTimeout(stableValueDelay);}
		stableValueDelay = setTimeout(() => getCrateSearchResults(quickPick), 500);
	});
	quickPick.onDidAccept(async () => {
		//Execute Add Command
		vscode.window.showInformationMessage(`Adding ${quickPick.selectedItems[0].label}`);
		let cmd = new crate.AddCrate();
		cmd.crate = quickPick.selectedItems[0].label;
		cmd.workspacePath = workspace?.uri.fsPath;
		quickPick.dispose();
		try{
			let result = await cmd.execute();
		}catch(err){
			vscode.window.showInformationMessage(((err as Error)?.message as string) || (err as string));
		}
	});
	//Show QuickPick for Search
	quickPick.show();
}//end function cargoAdd()

/**
 * Handler for setTarget command. Prompts user to enter target name, providing options that match that name.
 */
async function setTarget(): Promise<void>{
	//Get Target Workspace
	console.log('Setting Target');
	let workspace = await getTargetWorkspace();
	if (!workspace) {return;}
	//Get Values
	let cmd = new rustc.Print();
	cmd.output = 'target-list';
	let targets = await cmd.execute();
	let systemTarget = 'system';
	targets.values.push(systemTarget);
	//Implement QuickPick for search
	let quickPick = vscode.window.createQuickPick();
	quickPick.items = targets.values.map(v => {
		let info = rustc.KNOWN_TARGETS.get(v);
		return {
			label: v,
			detail: info !== undefined && info.tier !== undefined ? rustc.TargetTiers[info.tier] : undefined,
			description: info?.description ?? undefined,
		};
	});
	quickPick.onDidAccept(async () => {
		//Execute Add Command
		let selection = quickPick.selectedItems[0].label;
		vscode.window.showInformationMessage(`Setting Target to ${selection}`);
		quickPick.dispose();
		try{
			if (!workspace) {return;}
			//Find and Open config.toml
			let config = await getRustConfig(workspace.uri.fsPath);
			if (!config) { throw new Error(`Missing config.toml in .cargo folder.`); }
			console.log(config);
			//Edit [build].target
			if (!config.config) { config.config = {}; }
			if (!config.config.build) { config.config.build = {}; }
			if (selection === systemTarget) { config.config.build.target = undefined; }
			else { config.config.build.target = selection; }
			//Save changes to config.toml
			saveTOMLFile(config.path, config.config);
			vscode.window.showInformationMessage('Updated Config File Target');
		}catch(err){
			vscode.window.showInformationMessage(((err as Error)?.message as string) || (err as string));
		}
	});
	//Show QuickPick for Search
	quickPick.show();
}//end function setTarget()

/**
 * Handler for newBin command. Prompts user for version control and generates a new empty application project in the target workspace
 * @returns 
 */
async function newBin(): Promise<void>{
	//Prompt for Folder
	let workspace = await getTargetWorkspace();
	if (!workspace) { 
		vscode.window.showInformationMessage(`Create a new workspace where crate will be created.`);
		return; 
	}
	try{
		let cmd = new crate.NewCrate(workspace.uri.fsPath);
		cmd.createDirectory = false;
		cmd.crateType = crate.CrateType.bin;
		cmd.versionControl = await getVersionControl();
		await cmd.execute();
		vscode.window.showInformationMessage('Generated new Rust Crate Application');
	}catch(err)
	{
		vscode.window.showInformationMessage(((err as Error)?.message as string) || (err as string));
	}
}//end async function newBin(): Promise<void>

/**
 * Handler for newLib command. Prompts user for version control and generates a new empty library project in the target workspace.
 * @returns 
 */
async function newLib(): Promise<void>{
	//Prompt for Folder
	let workspace = await getTargetWorkspace();
	if (!workspace) { 
		vscode.window.showInformationMessage(`Create a new workspace where crate will be created.`);
		return; 
	}
	try{
		let cmd = new crate.NewCrate(workspace.uri.fsPath);
		cmd.createDirectory = false;
		cmd.crateType = crate.CrateType.lib;
		cmd.versionControl = await getVersionControl();
		await cmd.execute();
		vscode.window.showInformationMessage('Generated new Rust Crate Library');
	}catch(err)
	{
		vscode.window.showInformationMessage(((err as Error)?.message as string) || (err as string));
	}
}//end async function newLib(): Promise<void>

/**
 * Handler for newBinTemplate command. Prompts user for path to template and template variables.
 */
async function newBinTemplate(): Promise<void>{
	//Prompt for Folder
	let workspace: vscode.WorkspaceFolder = await getTargetWorkspace() as vscode.WorkspaceFolder;
	if (!workspace) { 
		vscode.window.showInformationMessage(`Create a new workspace where crate will be created.`);
		return; 
	}
	//Prompt for Template
	let templateRepo = await promptGitHubTemplate();
	if (!templateRepo) { return; }
	vscode.window.showInformationMessage(`Adding ${templateRepo.name}`);
	//Evaluate Project Name and Folder
	let targetFolder = workspace.uri.fsPath;
	let crateName = path.parse(targetFolder).name;
	targetFolder = path.dirname(targetFolder);
	//Build Command
	let cmd = new crate.Generate(crateName);
	cmd.crateType = crate.CrateType.bin;
	cmd.gitRepoPath = templateRepo.clone_url;
	//Configure responder to placeholder prompts
	cmd.getValueHandler = async (spawn, prompt) => 
	{
		try{
			console.log(prompt);
			let value = await promptForString('Rust Bin From Template Prompt', prompt);
			if (value){
				return value;
			}else{
				console.log(`Killing Command Spawn after undefined response`);
				throw new Error(`User Cancelled`);
			}
		}catch(err){
			console.log(`Error in prompting user`);
			console.log(err);
			vscode.window.showErrorMessage(`Template Project Cancelled`);
			spawn.kill();
			throw err;
		}
	};
	//Execute Command
	let currentDir = process.cwd();
	try{
		process.chdir(targetFolder);
		let result = await cmd.execute();
	}catch(err){
		console.log(err);
		vscode.window.showInformationMessage(((err as Error)?.message as string) || (err as string));
	}finally{
		process.chdir(currentDir);
	}
}//end async function newBinTemplate(): Promise<void>

/**
 * Handler for newLibTemplate command. Prompts user for path to template and template variables.
 */
async function newLibTemplate(): Promise<void>{
	//Prompt for Folder
	let workspace: vscode.WorkspaceFolder = await getTargetWorkspace() as vscode.WorkspaceFolder;
	if (!workspace) { 
		vscode.window.showInformationMessage(`Create a new workspace where crate will be created.`);
		return; 
	}
	//Prompt for Template
	let templateRepo = await promptGitHubTemplate();
	if (!templateRepo) { return; }
	vscode.window.showInformationMessage(`Adding ${templateRepo.name}`);
	//Evaluate Project Name and Folder
	let targetFolder = workspace.uri.fsPath;
	let crateName = path.parse(targetFolder).name;
	targetFolder = path.dirname(targetFolder);
	//Build Command
	let cmd = new crate.Generate(crateName);
	cmd.crateType = crate.CrateType.lib;
	cmd.gitRepoPath = templateRepo.clone_url;
	//Configure responder to placeholder prompts
	cmd.getValueHandler = async (spawn, prompt) => 
	{
		try{
			console.log(prompt);
			let value = await promptForString('Rust Bin From Template Prompt', prompt);
			if (value){
				return value;
			}else{
				console.log(`Killing Command Spawn after undefined response`);
				throw new Error(`User Cancelled`);
			}
		}catch(err){
			console.log(`Error in prompting user`);
			console.log(err);
			vscode.window.showErrorMessage(`Template Project Cancelled`);
			spawn.kill();
			throw err;
		}
	};
	//Execute Command
	let currentDir = process.cwd();
	try{
		process.chdir(targetFolder);
		console.log(`Executing from ${process.cwd()}`);
		let result = await cmd.execute();
	}catch(err){
		console.log(err);
		vscode.window.showInformationMessage(((err as Error)?.message as string) || (err as string));
	}finally{
		process.chdir(currentDir);
	}
}//end async function newLibTemplate(): Promise<void>

/**
 * Prompts user to select a Version Control
 * @returns 
 */
async function getVersionControl(): Promise<crate.CrateVersionControl | undefined>{
	return new Promise<crate.CrateVersionControl | undefined>((resolve, reject) => {
		let quickPick = vscode.window.createQuickPick();
		quickPick.title = 'Select Version Control';
		let values: vscode.QuickPickItem[] = [];
		for(const value in crate.CrateVersionControl){
			if (typeof crate.CrateVersionControl[value] !== "string") {
				continue;
			}
			let item: vscode.QuickPickItem = {
				label: crate.CrateVersionControl[value],
				detail: `${value}`,
			};
			values.push(item);
			if (Number(value) === crate.CrateVersionControl.git)
			{
				quickPick.selectedItems = [item];
			}
		}
		quickPick.items = values;
		quickPick.onDidAccept(async () => {
			try{
				//Execute Add Command
				let selection = quickPick.selectedItems[0].detail;
				quickPick.dispose();
				if (!selection) { reject(); return; }
				resolve(parseInt(selection as string) as crate.CrateVersionControl);
			}catch(err){
				reject(err);
			}
		});
		//Show QuickPick for Search
		quickPick.show();
	});
}//end async function getVersionControl(): Promise<crate.CrateVersionControl | undefined>

/**
 * Gets the target workspace for the current operation
 * @returns 
 */
async function getTargetWorkspace(): Promise<vscode.WorkspaceFolder | undefined>{
	return new Promise<vscode.WorkspaceFolder | undefined>((resolve, reject) => {
		//Evaluate if there are any workspaces
		if (vscode.workspace.workspaceFolders === undefined || vscode.workspace.workspaceFolders?.length <= 0){
			resolve(undefined);
			return;
		}
		//Return only workspace
		if (vscode.workspace.workspaceFolders.length === 1){
			resolve(vscode.workspace.workspaceFolders[0]);
			return;
		}
		//Prompt for target workspace
		vscode.window.showWorkspaceFolderPick().then((value) => resolve(value), (reason) => reject(reason));
	});
}//end function getTargetWorkspace(): vscode.WorkspaceFolder | null

/**
 * Populates the Quick Pick with Crate Search results based on the given value
 * @param quickPick 
 * @param value 
 */
async function getCrateSearchResults(quickPick: vscode.QuickPick<vscode.QuickPickItem>): Promise<void>{
	let value = quickPick.value;
	if (!value) {
		quickPick.items = [];
		return;
	}
	let cmd = new crate.SearchCrates(value);
	cmd.limit = 25;
	let results = await cmd.execute();
	quickPick.items = results.lineItems.map(i => {
		return {
			label: i.crate,
			detail: i.version,
			description: i.description,
		};
	});
}//end async function getCrateSearchResults(quickPick: vscode.QuickPick<vscode.QuickPickItem>): Promise<void>

/**
 * Returns config.toml file that is in folder under .cargo.
 * @param workspacePath 
 * @returns 
 */
async function getRustConfig(workspacePath: string): Promise<{config: any, path: string} | null>
{
	console.log(`Finding/Creating Config in ${workspacePath}`);
	return new Promise<{config: any, path: string} | null>(async (resolve, reject) => {
		try{
			//Identify target file and folders
			let folder = vscode.Uri.from({
				scheme: 'file',
				path: `${workspacePath}\\.cargo`,
			});
			let file = vscode.Uri.from({
				scheme: 'file',
				path: `${workspacePath}\\.cargo\\config.toml`,
			});
			//Create necessary files/folders as we go
			if (!fs.existsSync(`${folder.fsPath}`)){
				console.log(`Creating missing Path ${folder.fsPath}`);
				fs.mkdirSync(folder.fsPath);
			}
			if (!fs.existsSync(`${file.fsPath}`)){
				console.log(`Creating missing File ${file.fsPath}`);
				fs.appendFileSync(`${file.fsPath}`, '');
			}
			console.log(`Creating missing File ${file.fsPath}`);
			let contents = await vscode.workspace.openTextDocument(file);
			resolve({
				config: toml.parse(contents.getText()),
				path: file.path,
			});
		}catch(err){
			reject(err);
		}
	});
}//end async function getRustConfig(entryPath: string): Promise<any>

/**
 * Saves the given config object to the specified file path as a TOML file.
 * @param path 
 * @param config 
 */
async function saveTOMLFile(path: string, config: any): Promise<void>{
	let content = toml.stringify(config);
	let encoder = new TextEncoder();
	await vscode.workspace.fs.writeFile(vscode.Uri.from({
		scheme: 'file',
		path: path,
	}), encoder.encode(content));
}//end async function writeTOMLFile(path: string, config: any): Promise<void>

/**
 * Queries GitHub for all Repo's that are Cargo-Generate Templates
 * @returns Array of repositories, paged 100 at a time.
 */
async function getGitHubTemplates(): Promise<Repository[]>{
	let cmd = new  Search(SearchType.repositories);
	cmd.topics = 'cargo-generate';
	cmd.languages = 'rust';
	cmd.perPage = 100;
	cmd.page = 0;
	console.log(`Searching for Git Repo's with tag ${cmd.topics} and language ${cmd.languages}`);
	let results = await cmd.search<Repository>();
	let totalResults = results.items;
	console.log(`Found ${results.total_count} Repos. Received ${totalResults.length}`);
	while(results.incomplete_results && totalResults.length < results.total_count){
		cmd.page++;
		results = await cmd.search();
		totalResults.push(...results.items);
		console.log(`Found ${results.total_count} Repos. Received ${totalResults.length}`);
	}
	return totalResults;
}//end async function getGitHubTemplates(): Promise<SearchResults>

/** Prompts user to select from available git hub templates */
async function promptGitHubTemplate(): Promise<Repository | undefined>{
	return new Promise<Repository | undefined>((resolve, reject) => {
		//Implement QuickPick for search
		let quickPick = vscode.window.createQuickPick();
		//Populate Quickpick from Github
		let templates: Repository[] = [];
		vscode.window.showInformationMessage(`Getting Templates from GitHub`);
		getGitHubTemplates().then(t => {
			console.log(`Retrieved ${t.length} Templates from Github`);
			templates = t;
			quickPick.items = t.map(i => {
				return {
					label: i.name,
					detail: i.clone_url,
					description: i.description,
				};
			});
		}).catch(err => {
			console.log(err);
			vscode.window.showInformationMessage(((err as Error)?.message as string) || (err as string));
		});
		//Get 
		quickPick.onDidAccept(async () => {
			//Execute Add Command
			let result = quickPick.selectedItems[0].detail;
			resolve(templates.find(t => t.clone_url === result));
			//Finalize QuickPick
			quickPick.dispose();
		});
		//Show QuickPick for Search
		quickPick.show();
	});
}//end async function selectGitHubTemplate(): Promise<Repository | undefined>

/** Prompts the user for a string entry. */
async function promptForString(title: string, prompt: string): Promise<string | undefined> {
	return new Promise<string | undefined>((resolve, reject) => {
		//Implement QuickPick for prompt
		let quickPick = vscode.window.createQuickPick();
		quickPick.title = title;
		quickPick.placeholder = prompt;
		//Get 
		quickPick.onDidAccept(async () => {
			//Respond with entry
			let result = quickPick.selectedItems.length > 0 ? quickPick.selectedItems[0].label : undefined;
			resolve(result);
			//Finalize QuickPick
			quickPick.dispose();
		});
		quickPick.onDidChangeValue(async (value) => {
			//Set value as sole item in quickpick
			quickPick.items = value ? [{
				label: value
			}] : [];
		});
		quickPick.onDidHide(() => reject());
		//Show QuickPick for Search
		quickPick.show();
	});
}//end async function promptForString(): string