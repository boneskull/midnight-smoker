import {RuleIssue} from '#rule/issue';
import {instanceofSchema} from '#util/schema-util';

/**
 * Schema for a {@link RuleIssue}
 */

export const RuleIssueSchema = instanceofSchema(RuleIssue);
