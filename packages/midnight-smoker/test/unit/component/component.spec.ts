import unexpected from 'unexpected';
import type {Owner} from '../../../src/component/component';
import {
  component,
  ComponentId,
  kComponentId,
} from '../../../src/component/component';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('component', function () {
    describe('component()', function () {
      let name: string;
      let value: Record<string, any>;
      let owner: Owner;

      beforeEach(function () {
        name = 'example-component';
        value = {foo: 'bar'};
        owner = {id: 'example-plugin'};
      });

      it('should return a proxy for the value', function () {
        const result = component({name, value, owner, kind: 'Reporter'});
        expect(result, 'to equal', value).and('not to be', value);
      });

      it('should return a proxy with string property id', function () {
        const result = component({name, value, owner, kind: 'Reporter'});
        const id = ComponentId.create(owner.id, name);
        expect(result.id, 'to equal', id.id);
      });

      it('should return a proxy with ComponentId property Symbol(kComponentId)', function () {
        const result = component({name, value, owner, kind: 'Reporter'});
        const id = ComponentId.create(owner.id, name);
        expect(result[kComponentId], 'to equal', id);
      });

      it('should return a proxy with isBlessed boolean property', function () {
        expect(
          component({name, value, owner, kind: 'Reporter'}),
          'to have property',
          'isBlessed',
        );
      });

      describe('when the owner is not blessed', function () {
        it('the property should be false', function () {
          const result = component({name, value, owner, kind: 'Reporter'});
          expect(result.isBlessed, 'to be false');
        });
      });

      describe('when the owner is blessed', function () {
        beforeEach(function () {
          owner = {id: '@midnight-smoker/plugin-default'};
        });

        it('the property should be true', function () {
          const result = component({name, value, owner, kind: 'Reporter'});
          expect(result.isBlessed, 'to be true');
        });
      });

      describe('when the owner is invalid', function () {
        it('should throw', function () {
          expect(
            () => component({name, value, owner: {} as any, kind: 'Reporter'}),
            'to throw',
            {
              code: 'ESMOKER_INVALIDARG',
            },
          );
        });
      });

      it('should return a proxy that forwards other properties to the value', function () {
        const result = component({name, value, owner, kind: 'Reporter'});
        expect(result.foo, 'to equal', 'bar');
      });

      describe('when the object is not componentizable', function () {
        it('should throw an error due to "id"', function () {
          const value = {foo: 'bar', id: 'baz'};
          expect(
            () =>
              component({name, value: value as any, owner, kind: 'Reporter'}),
            'to throw',
            {
              code: 'ESMOKER_INVALIDARG',
            },
          );
        });

        it('should throw an error due to kComponentId', function () {
          const value = {foo: 'bar', [kComponentId]: 'baz'};
          expect(
            () =>
              component({name, value: value as any, owner, kind: 'Reporter'}),
            'to throw',
            {
              code: 'ESMOKER_INVALIDARG',
            },
          );
        });

        it('should throw an error due to "isBlessed"', function () {
          const value = {foo: 'bar', isBlessed: 'baz'};
          expect(
            () =>
              component({name, value: value as any, owner, kind: 'Reporter'}),
            'to throw',
            {
              code: 'ESMOKER_INVALIDARG',
            },
          );
        });

        it('should throw an error due to "kind"', function () {
          const value = {foo: 'bar', kind: 'baz'};
          expect(
            () =>
              component({name, value: value as any, owner, kind: 'Reporter'}),
            'to throw',
            {
              code: 'ESMOKER_INVALIDARG',
            },
          );
        });
      });
    });

    describe('ComponentId', function () {
      let pluginName: string;
      let name: string;

      beforeEach(function () {
        pluginName = 'example-plugin';
        name = 'example-component';
      });

      describe('constructor', function () {
        it('should correctly initialize properties', function () {
          const id = new ComponentId(pluginName, name);
          expect(id, 'to satisfy', {
            pluginName,
            name,
            id: ComponentId.toString(pluginName, name),
          });
        });
      });

      describe('instance method', function () {
        describe('toString()', function () {
          describe('when the plugin is not blessed', function () {
            it('should contain a scoped id', function () {
              const id = new ComponentId(pluginName, name);
              expect(id.toString(), 'to equal', `${pluginName}/${name}`);
            });
          });

          describe('when the plugin is blessed', function () {
            it('should contain a bare id', function () {
              const id = new ComponentId(
                '@midnight-smoker/plugin-default',
                name,
              );
              expect(id.toString(), 'to equal', name);
            });
          });
        });
      });

      describe('computed property', function () {
        describe('isBlessed', function () {
          describe('when the plugin is blessed', function () {
            it('should be true', function () {
              pluginName = '@midnight-smoker/plugin-default';
              const id = new ComponentId(pluginName, name);
              expect(id.isBlessed, 'to be true');
            });
          });

          describe('when the plugin is not blessed', function () {
            it('should be false', function () {
              const id = new ComponentId(pluginName, name);
              expect(id.isBlessed, 'to be false');
            });
          });
        });
      });

      describe('parse()', function () {
        describe('when the id is valid', function () {
          describe('when the plugin is not blessed', function () {
            it('should return a proper ComponentId', function () {
              const id = ComponentId.create(pluginName, name).id;
              const parsed = ComponentId.parse(id);
              expect(parsed, 'to satisfy', {
                pluginName,
                name,
                id: `${pluginName}/${name}`,
              });
            });
          });
        });

        it('should return undefined if the id is invalid', function () {
          const parsed = ComponentId.parse('default');
          expect(parsed, 'to be undefined');
        });

        it('should never create a blessed ComponentId', function () {
          const id = ComponentId.create(
            '@midnight-smoker/plugin-default',
            name,
          ).id;
          expect(ComponentId.parse(id), 'to be undefined');
        });
      });

      describe('static method', function () {
        describe('create()', function () {
          it('should return a frozen instance of ComponentId', function () {
            const id = ComponentId.create(pluginName, name);
            expect(id, 'to be a', ComponentId);
            expect(Object.isFrozen(id), 'to be true');
          });
        });
      });
    });
  });
});
