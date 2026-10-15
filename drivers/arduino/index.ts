// Company: Arduino
// The entry point tools use to create this company's simulated driver, found by its folder name.

import type { CreateDriver } from "../shared/plain-driver.js";
import { ArduinoDriver } from "./arduino-driver.js";

export const createDriver: CreateDriver = (options) => new ArduinoDriver(options);
