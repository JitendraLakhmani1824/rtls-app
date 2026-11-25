import { concert } from './concert';
import { marathon } from './marathon';
import { trip } from './trip';
import type { Scenario, ScenarioName } from './world';

export const SCENARIOS: Record<ScenarioName, Scenario> = { concert, marathon, trip };
export type { Scenario, ScenarioName, World } from './world';
