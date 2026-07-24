import { expectType, expectError, expectAssignable } from "tsd";
import {
  eleventy,
  type EleventyBuiltinData,
  type EleventyData,
  type EleventyUserData,
} from "../eleventy.js";

// Built-in fields resolve to precise types.
expectType<string>(eleventy.page.url);
expectType<Date>(eleventy.page.date);
expectType<string>(eleventy.eleventy.version);

// `content` is set by the layout render and is optional at type level.
expectAssignable<string | undefined>(eleventy.content);

// EleventyData is the intersection so `EleventyBuiltinData` fields are visible.
declare const data: EleventyData;
expectType<string>(data.page.url);

// Typo on a built-in field is caught.
expectError(eleventy.pagee);

// EleventyUserData is empty by default.
declare const userData: EleventyUserData;
expectAssignable<{}>(userData);

// EleventyBuiltinData is exported and usable as a standalone type.
declare const builtin: EleventyBuiltinData;
expectType<string>(builtin.page.url);
