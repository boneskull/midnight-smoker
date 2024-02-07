import {instanceofSchema} from '#util/schema-util.js';
import {RuleIssue} from '../rule/issue';

/**
 * Schema for a {@link RuleIssue}
 */

export const RuleIssueSchema = instanceofSchema(RuleIssue);
