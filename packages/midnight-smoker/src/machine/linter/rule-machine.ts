import {type RuleContext, type SomeRule, type SomeRuleConfig} from '#rule';
import {assign, fromPromise, log, sendTo, setup} from 'xstate';
import {type LinterMachineRuleBeginEvent} from './linter-machine-events';
import {
  type RuleMachineContext,
  type RuleMachineInput,
  type RuleMachineOutput,
} from './rule-machine-types';

export const RuleMachine = setup({
  types: {
    input: {} as RuleMachineInput,
    context: {} as RuleMachineContext,
    output: {} as RuleMachineOutput,
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
  id: 'RuleMachine',
  context: ({input}) => input,
  initial: 'linting',
  states: {
    linting: {
      entry: [
        sendTo(
          ({context: {parentRef}}) => parentRef,
          ({context, self}): LinterMachineRuleBeginEvent => ({
            type: 'RULE_BEGIN',
            index: context.index,
            sender: self.id,
            ctx: context.ctx.toJSON(),
          }),
        ),
      ],
      invoke: {
        src: 'check',
        input: ({context: {ctx, rule, config}}) => ({ctx, rule, config}),
        onDone: {
          target: 'done',
          actions: [
            {type: 'finalizeRuleContext'},
            log(
              ({
                context: {
                  rule,
                  ctx: {pkgName},
                },
              }) => `${pkgName}: rule "${rule.name}" ok`,
            ),
          ],
        },
        onError: {
          target: 'errored',
          actions: [
            {
              type: 'addErrorToRuleContext',
              params: ({event: {error}}) => ({error}),
            },
            log(
              ({
                context: {
                  rule,
                  ctx: {pkgName},
                },
              }) => `${pkgName}: rule "${rule.name}" failed`,
            ),
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
  output: ({
    context: {rule, issues = [], index, ctx},
    self: {id},
  }): RuleMachineOutput => ({
    type: 'OK',
    issues: issues.map((issue) => issue.toJSON()),
    id,
    index,
    rule,
    ctx: ctx.toJSON(),
  }),
});
