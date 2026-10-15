// Company: Raspberry Pi
// The entry point tools use to create this company's simulated driver, found by its folder name.

import type { CreateDriver } from "../shared/plain-driver.js";
import { RaspberryPiDriver } from "./pi-driver.js";

export const createDriver: CreateDriver = (options) => new RaspberryPiDriver(options);
