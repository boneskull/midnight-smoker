import {
  type RuleContext,
  type RuleIssue,
  type SomeRule,
  type SomeRuleConfig,
  type StaticRuleContext,
  type StaticRuleIssue,
} from '#rule';
import {assign, fromPromise, setup} from 'xstate';
import {type MachineOutputOk} from '../machine-util';

export interface LMInput {
  ctx: Readonly<RuleContext>;
  rule: SomeRule;
  config: SomeRuleConfig;
  index: number;
}

export interface LMContext extends LMInput {
  issues?: readonly RuleIssue[];
}

// this machine does not exit with an error
export type LMOutput = MachineOutputOk<{
  issues: StaticRuleIssue[];
  index: number;
  ctx: StaticRuleContext;
}>;

export const LintMachine = setup({
  types: {
    input: {} as LMInput,
    context: {} as LMContext,
    output: {} as LMOutput,
  },
  actions: {
    // XXX: should this be an assign action?
    addErrorToRuleContext: ({context: {ctx}}, {error}: {error: unknown}) => {
      ctx.addIssueFromError(error);
    },
    finalizeRuleContext: assign({issues: ({context: {ctx}}) => ctx.finalize()}),
  },
  actors: {
    check: fromPromise<
      void,
      {ctx: Readonly<RuleContext>; rule: SomeRule; config: SomeRuleConfig}
    >(
      async ({
        input: {
          ctx,
          rule,
          config: {opts},
        },
      }) => {
        await rule.check(ctx, opts);
      },
    ),
  },
}).createMachine({
  context: ({input}) => input,
  initial: 'linting',
  states: {
    linting: {
      invoke: {
        src: 'check',
        input: ({context: {ctx, rule, config}}) => ({ctx, rule, config}),
        onDone: {
          target: 'done',
          actions: [{type: 'finalizeRuleContext'}],
        },
        onError: {
          target: 'errored',
          actions: [
            {
              type: 'addErrorToRuleContext',
              params: ({event: {error}}) => ({error}),
            },
          ],
        },
      },
    },
    done: {
      type: 'final',
    },
    errored: {
      type: 'final',
    },
  },
  output: ({context: {issues = [], index, ctx}, self: {id}}): LMOutput => ({
    type: 'OK',
    issues: issues.map((issue) => issue.toJSON()),
    id,
    index,
    ctx: ctx.toJSON(),
  }),
});
