# rust-project-manager README

The rust-project-manager exists to reduce the amount of command lines that users need to know to get a project up and running.

## Features
All commands are accessible from the command prompt accessed by Ctrl+Shift+P.
Commands target one workspace at a time, and will prompt if multiple workspaces are open.

> Rust: Add Crate
Integrates with the search command to provide search functionality to find and add crates to your project.

> Rust: Set Target
Provides list of known targets and allows user to set the default target of their project.

> Rust: New Application Project
Creates a new application/binary project in one of the open workspaces.

> Rust: New Library Project
Creates a new library crate project in one of the open workspacess.

## Requirements

Users will need to install rust and cargo in order to benefit from commands.
The commands also need to be part of the $PATH environment variable so that they can be executed from anywhere.

It is also recommended that users install other extensions to handle syntax highlighting, and project build and debugging.

## Extension Settings

None at this time.

## Future Plans

* Implementing support for starting embedded projects
* Expanding on support for setting target and target build flags

## Known Issues

None at this time

## Release Notes

### 1.0.0

Initial release
