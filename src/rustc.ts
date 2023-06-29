import { CommandHandler } from "./commandHandler";

/** Acceptaed values by Print.output command. */
type PrintOutput = "crate-name"|"file-names"|"sysroot"|"target-libdir"|"cfg"|"calling-conventions"|"target-list"|"target-cpus"|"target-features"|"relocation-models"|"code-models"|"tls-models"|"target-spec-json"|"all-target-specs-json"|"native-static-libs"|"stack-protector-strategies"|"link-args";

/** Command Handler for rustc --print */
export class Print extends CommandHandler{
    /**Data to print out from command */
    output: PrintOutput = "target-list" ;
    getCommand(): string {
        let cmd = `rustc --print ${this.output}`;
        return cmd;
    }
    async execute(): Promise<PrintResults> {
        let result = await this.executeCommand();
        return new PrintResults(this.output, result);
    }
}//end export class Print extends CommandHandler

/**Results object containing output of Print Command */
export class PrintResults{
    /** Type of data that was generated */
    output: PrintOutput;
    /**Row Values that were parsed from output */
    values: string[] = [];
    constructor(output: PrintOutput, results: string){
        this.output = output;
        this.values = results.split('\n');
    }
}//end export class PrintResults

/** Tiers of Targets */
export enum TargetTiers{
    tier1Supported = 1,
    tier2Builds = 2,
    tier3Unsupported = 3,
}

/** Interface for known information about a target */
interface KnownTargetInformation{
    /** Support Tier for Target */
    tier?: TargetTiers,
    /** Description of Tier */
    description: string,
    /** File Format of output from Target */
    fileFormat?: string,
}

/** Known targets and their descriptions */
export const KNOWN_TARGETS: Map<string, KnownTargetInformation> = new Map<string, KnownTargetInformation>([
    ['system', {
        description: 'Resets the target to compile for current system',
    }],
    ['aarch64-apple-ios-sim', {
        tier: 2,
        description: 'Apple iOS Simulator for ARM64',
    }],
    ['arm64_32-apple-watchos', {
        tier: 3,
        description: 'Apple WatchOS on Arm 64_32',
    }],
    ['armv7k-apple-watchos', {
        tier: 3,
        description: 'Apple WatchOS on Arm v7k',
    }],
    ['aarch64-apple-watchos-sim', {
        tier: 3,
        description: 'Apple WatchOS Simulator on arm64',
    }],
    ['x86_64-apple-watchos-sim', {
        tier: 3,
        description: 'Apple WatchOS Simulator on x86_64',
    }],
    ['aarch64-nintendo-switch-freestanding', {
        tier: 3,
        description: 'Nintendo Switch with pure-Rust toolchain',
    }],
    ['armeb-unknown-linux-gnueabi', {
        tier: 3,
        description: 'Target for cross-compiling Linux user-mode applications targeting the ARM BE8 architecture',
    }],
    ['armv4t-none-eabi', {
        tier: 3,
        description: 'Bare-metal target for any cpu in the ARMv4T architecture family, supporting ARM/Thumb code interworking (aka a32/t32), with ARM code as the default code generation. Particularly Gameboy Advance (GBA)',
    }],
    ['armv5te-none-eabi', {
        tier: 3,
        description: 'Bare-metal target for any cpu in the ARMv5TE architecture family, supporting ARM/Thumb code interworking (aka a32/t32), with a32 code as the default code generation',
    }],
    ['armv6k-nintendo-3ds', {
        tier: 3,
        description: 'The Nintendo 3DS platform, which has an ARMv6K processor, and its associated operating system (horizon)',
    }],
    ['armv7-unknown-linux-uclibceabi', {
        tier: 3,
        description: 'This target supports ARMv7 softfloat CPUs and uses the uclibc-ng standard library. This is a common configuration on many consumer routers (e.g., Netgear R7000, Asus RT-AC68U)',
    }],
    ['armv7-unknown-linux-uclibceabihf', {
        tier: 3,
        description: 'This tier supports the ARMv7 processor running a Linux kernel and uClibc-ng standard library. It provides full support for rust and the rust standard library',
    }],
    ['armv7-unknown-linux-uclibceabihf', {
        tier: 3,
        description: 'This tier supports the ARMv7 processor running a Linux kernel and uClibc-ng standard library. It provides full support for rust and the rust standard library',
    }],
    ['aarch64-linux-android', {
        tier: 2,
        description: 'Android is a mobile operating system built on top of the Linux kernel',
        fileFormat: 'ELF'
    }],
    ['arm-linux-androideabi', {
        tier: 2,
        description: 'Android is a mobile operating system built on top of the Linux kernel',
        fileFormat: 'ELF'
    }],
    ['armv7-linux-androideabi', {
        tier: 2,
        description: 'Android is a mobile operating system built on top of the Linux kernel',
        fileFormat: 'ELF'
    }],
    ['i686-linux-android', {
        tier: 2,
        description: 'Android is a mobile operating system built on top of the Linux kernel',
        fileFormat: 'ELF'
    }],
    ['thumbv7neon-linux-androideabi', {
        tier: 2,
        description: 'Android is a mobile operating system built on top of the Linux kernel',
        fileFormat: 'ELF'
    }],
    ['x86_64-linux-android', {
        tier: 2,
        description: 'Android is a mobile operating system built on top of the Linux kernel',
        fileFormat: 'ELF'
    }],
    ['aarch64-unknown-linux-ohos', {
        tier: 3,
        description: 'Targets for the OpenHarmony operating system',
        fileFormat: 'ELF'
    }],
    ['armv7-unknown-linux-ohos', {
        tier: 3,
        description: 'Targets for the OpenHarmony operating system',
    }],
    ['aarch64-unknown-fuchsia and x86_64-unknown-fuchsia', {
        tier: 2,
        description: 'Fuchsia is a modern open source operating system that\'s simple, secure, updatable, and performant',
    }],
    ['aarch64-kmc-solid_asp3', {
        tier: 3,
        description: 'SOLID embedded development platform by Kyoto Microcomputer Co., Ltd',
    }],
    ['armv7a-kmc-solid_asp3-eabi', {
        tier: 3,
        description: 'SOLID embedded development platform by Kyoto Microcomputer Co., Ltd',
    }],
    ['armv7a-kmc-solid_asp3-eabihf', {
        tier: 3,
        description: 'SOLID embedded development platform by Kyoto Microcomputer Co., Ltd',
    }],
    ['loongarch64-unknown-linux-gnu', {
        tier: 3,
        description: 'LoongArch is a new RISC ISA developed by Loongson Technology Corporation Limited',
    }],
    ['m68k-unknown-linux-gnu', {
        tier: 3,
        description: 'Motorola 680x0 Linux',
    }],
    ['mips64-openwrt-linux-musl', {
        tier: 3,
        description: '',
        fileFormat: 'ELF',
    }],
    ['mipsel-sony-psx', {
        tier: 3,
        description: 'Sony PlayStation 1 (psx)',
    }],
    ['nvptx64-nvidia-cuda', {
        tier: 2,
        description: 'This is the target meant for deploying code for Nvidia® accelerators based on their CUDA platform',
    }],
    ['riscv32imac-unknown-xous-elf', {
        tier: 3,
        description: 'Xous microkernel, message-based operating system that powers devices such as Precursor and Betrusted',
    }],
    ['aarch64-pc-windows-gnullvm', {
        tier: 3,
        description: 'Windows targets similar to *-pc-windows-gnu but using UCRT as the runtime and various LLVM tools/libraries instead of GCC/Binutils',
        fileFormat: 'PE',
    }],
    ['x86_64-pc-windows-gnullvm', {
        tier: 3,
        description: 'Windows targets similar to *-pc-windows-gnu but using UCRT as the runtime and various LLVM tools/libraries instead of GCC/Binutils',
        fileFormat: 'PE',
    }],
    ['aarch64-unknown-nto-qnx710', {
        tier: 3,
        description: 'QNX® Neutrino (nto) Real-time operating system. The support has been implemented jointly by Elektrobit Automotive GmbH and Blackberry QNX',
    }],
    ['i586-pc-nto-qnx700', {
        tier: 3,
        description: 'QNX® Neutrino (nto) Real-time operating system. The support has been implemented jointly by Elektrobit Automotive GmbH and Blackberry QNX',
    }],
    ['x86_64-pc-nto-qnx710', {
        tier: 3,
        description: 'QNX® Neutrino (nto) Real-time operating system. The support has been implemented jointly by Elektrobit Automotive GmbH and Blackberry QNX',
    }],
    ['aarch64-unknown-openbsd', {
        tier: 3,
        description: 'OpenBSD multi-platform 4.4BSD-based UNIX-like operating system',
    }],
    ['i686-unknown-openbsd', {
        tier: 3,
        description: 'OpenBSD multi-platform 4.4BSD-based UNIX-like operating system',
    }],
    ['powerpc64-unknown-openbsd', {
        tier: 3,
        description: 'OpenBSD multi-platform 4.4BSD-based UNIX-like operating system',
    }],
    ['risc64gc-unknown-openbsd', {
        tier: 3,
        description: 'OpenBSD multi-platform 4.4BSD-based UNIX-like operating system',
    }],
    ['sparc64-unknown-openbsd', {
        tier: 3,
        description: 'OpenBSD multi-platform 4.4BSD-based UNIX-like operating system',
    }],
    ['x86_64-unknown-openbsd', {
        tier: 3,
        description: 'OpenBSD multi-platform 4.4BSD-based UNIX-like operating system',
    }],
    ['aarch64-unknown-uefi', {
        tier: 2,
        description: 'Unified Extensible Firmware Interface (UEFI) targets for application, driver, and core UEFI binaries',
    }],
    ['i686-unknown-uefi', {
        tier: 2,
        description: 'Unified Extensible Firmware Interface (UEFI) targets for application, driver, and core UEFI binaries',
    }],
    ['x86_64-unknown-uefi', {
        tier: 2,
        description: 'Unified Extensible Firmware Interface (UEFI) targets for application, driver, and core UEFI binaries',
    }],
    ['wasm64-unknown-unknown', {
        tier: 3,
        description: 'WebAssembly target which uses 64-bit memories, relying on the memory64 WebAssembly proposal',
    }],
    ['x86_64-fortanix-unknown-sgx', {
        tier: 2,
        description: 'Secure enclaves using Intel Software Guard Extensions (SGX) based on the ABI defined by Fortanix for the Enclave Development Platform (EDP)',
    }],
    ['x86_64-unknown-none', {
        tier: 2,
        description: 'Freestanding/bare-metal x86-64 binaries in ELF format: firmware, kernels, etc',
        fileFormat: 'ELF'
    }],
    ['thumbv6m-none-eabi', {
        description: 'Cortex M0 and M0+ devices',
        fileFormat: 'ELF'
    }],
    ['thumbv7m-none-eabi', {
        description: 'Cortex M3 devices',
        fileFormat: 'ELF'
    }],
    ['thumbv7em-none-eabi', {
        description: 'Cortex M4 and M7 devices. No FPU',
        fileFormat: 'ELF'
    }],
    ['thumbv7em-none-eabihf', {
        description: 'Cortex M4 and M7 devices. With FPU',
        fileFormat: 'ELF'
    }],
]);
