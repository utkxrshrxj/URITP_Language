// Reads the command line: uritp check|compile|run <file> --robot [name=]<manifest> [options].
// Returns what to do, or a plain reason the command line could not be understood.

export type Command = "check" | "compile" | "run" | "help";

export interface RobotOption {
  /** The robot's name in the program, or null to take the next robot in the order they connect. */
  readonly name: string | null;
  readonly manifest: string;
}

export interface CliOptions {
  readonly command: Command;
  readonly file: string;
  readonly robots: readonly RobotOption[];
  readonly sites: readonly string[];
  readonly lang: "en" | "hi";
  /** How much faster than real time the simulated robots run. */
  readonly speed: number;
  /** Also print the lines each driver would send, in its robot's own language. */
  readonly protocol: boolean;
}

export const USAGE = `URITP 0.1: check and run robot programs

Usage:
  uritp check   <file.uritp> --robot [name=]<manifest.uritp> [options]
  uritp compile <file.uritp> --robot [name=]<manifest.uritp> [options]
  uritp run     <file.uritp> --robot [name=]<manifest.uritp> [options]

Commands:
  check     Check the program against each robot's manifest and the site map.
  compile   Check, then list the instructions each robot would receive (in SI units).
  run       Check, then run the program on simulated robots.

Options:
  --robot [name=]<file>   A robot's manifest. Without a name, manifests go to the
                          program's robots in the order they are connected.
  --site <file>           A site map. site.uritp next to the program is used if
                          no --site is given.
  --lang en|hi            Language for messages (default en).
  --speed <n>             Run simulated robots n times faster than real time (default 1).
  --protocol              With run: also print the lines each driver would send.
  --help                  Show this help.`;

export function parseArgs(argv: readonly string[]): CliOptions | { error: string } {
  const [command, ...rest] = argv;
  if (command === undefined || command === "help" || command === "--help" || command === "-h") {
    return { command: "help", file: "", robots: [], sites: [], lang: "en", speed: 1, protocol: false };
  }
  if (command !== "check" && command !== "compile" && command !== "run") return { error: `unknown command '${command}'` };

  let file: string | null = null;
  const robots: RobotOption[] = [];
  const sites: string[] = [];
  let lang: "en" | "hi" = "en";
  let speed = 1;
  let protocol = false;

  for (let i = 0; i < rest.length; i++) {
    const item = rest[i] as string;
    const value = (): string | null => {
      const next = rest[i + 1];
      if (next === undefined || next.startsWith("--")) return null;
      i++;
      return next;
    };
    switch (item) {
      case "--robot": {
        const v = value();
        if (v === null) return { error: "--robot needs a manifest file" };
        const eq = v.indexOf("=");
        robots.push(eq > 0 ? { name: v.slice(0, eq), manifest: v.slice(eq + 1) } : { name: null, manifest: v });
        break;
      }
      case "--site": {
        const v = value();
        if (v === null) return { error: "--site needs a site map file" };
        sites.push(v);
        break;
      }
      case "--lang": {
        const v = value();
        if (v !== "en" && v !== "hi") return { error: "--lang must be en or hi" };
        lang = v;
        break;
      }
      case "--speed": {
        const v = Number(value());
        if (!Number.isFinite(v) || v <= 0) return { error: "--speed must be a number above 0" };
        speed = v;
        break;
      }
      case "--protocol":
        protocol = true;
        break;
      case "--help":
      case "-h":
        return { command: "help", file: "", robots: [], sites: [], lang, speed, protocol };
      default:
        if (item.startsWith("--")) return { error: `unknown option '${item}'` };
        if (file !== null) return { error: `only one program file can be given, but '${item}' is a second one` };
        file = item;
    }
  }
  if (file === null) return { error: `${command} needs a program file` };
  return { command, file, robots, sites, lang, speed, protocol };
}
