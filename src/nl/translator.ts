// The voice and text layer's common shape: a Translator turns a person's request, in their own
// words and language, into a URITP program. It never moves a robot; the checker decides that.

import type { RobotModel } from "../checker/robot-model.js";

/** A connected robot, as the translator needs to know it. */
export interface RobotDescription {
  /** The robot's name in the program, like rover. */
  readonly name: string;
  /** Its address for connect("..."). */
  readonly address: string;
  /** What it can do, from its manifest. */
  readonly model: RobotModel;
}

export interface TranslationRequest {
  /** What the person said or typed, in any language. */
  readonly text: string;
  readonly robots: readonly RobotDescription[];
  /** Names defined in the site map, so the translator only uses places that exist. */
  readonly places?: readonly string[];
  readonly zones?: readonly string[];
  readonly routes?: readonly string[];
}

export type TranslationResult =
  | {
      readonly ok: true;
      /** The URITP program, starting with a robot line for each connected robot. */
      readonly program: string;
      /** What the translator understood, in plain words, to show the person before running. */
      readonly explanation: string;
      /** The language of the request: en, hi, or hinglish (Hindi in Latin letters). */
      readonly language: string;
    }
  | { readonly ok: false; readonly reason: string; readonly language: string };

export interface Translator {
  /** A short name for logs, like "offline rules" or "AI (claude-opus-5-5)". */
  readonly name: string;
  translate(request: TranslationRequest): Promise<TranslationResult>;
}

/** The robot lines every translated program starts with. */
export function robotHeader(robots: readonly RobotDescription[]): string[] {
  return robots.map((robot) => `robot ${robot.name} = connect("${robot.address}")`);
}
