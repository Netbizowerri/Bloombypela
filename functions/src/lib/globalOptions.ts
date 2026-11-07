/**
 * Applies the project-wide Cloud Functions region.
 *
 * This module MUST be imported before any module that defines a function.
 * ES modules evaluate their dependencies in import order, so calling
 * `setGlobalOptions` in the body of `src/index.ts` runs after the function
 * modules have already been evaluated and silently leaves every callable in
 * the SDK default region (us-central1).
 */
import { setGlobalOptions } from 'firebase-functions/v2';
import { REGION } from './config';

setGlobalOptions({ region: REGION });
