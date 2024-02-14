import {instanceofSchema} from '#util/schema-util';
import {RuleIssue} from '../rule/issue';

/**
 * Schema for a {@link RuleIssue}
 */

export const RuleIssueSchema = instanceofSchema(RuleIssue);
