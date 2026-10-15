// Company: Universal Robots
// The entry point tools use to create this company's simulated driver, found by its folder name.

import type { CreateDriver } from "../shared/plain-driver.js";
import { UniversalRobotsDriver } from "./ur-driver.js";

export const createDriver: CreateDriver = (options) => new UniversalRobotsDriver(options);
