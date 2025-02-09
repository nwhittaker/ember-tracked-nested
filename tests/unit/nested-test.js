import Component from '@glimmer/component';
import { get, set } from '@ember/object';
import { module, test } from 'qunit';
import { nested, trackedNested } from 'ember-tracked-nested';
import { setupRenderingTest } from 'ember-qunit';
import { reactivityTest } from '../helpers/reactivity';
import { render, settled } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

module('nested()', function () {
  module('Object', () => {
    test('proxied properties can be accessed like an object', function (assert) {
      const originalObject = { a: 10 };
      const nestedObject = nested(originalObject).data;
      assert.strictEqual(nestedObject.a, originalObject.a, 'Same property name will have the same value');
      assert.deepEqual(Object.keys(nestedObject), ['a'], `nested will behave like it's wrapped object native methods`);
    });

    test('original data is cloned inside nested', function (assert) {
      const originalData = { a: 1, b: { c: 1 } };
      const nestedData = nested(originalData).data;
      originalData.b.d = 1;
      assert.strictEqual(originalData.b.d, 1, 'Original data is changed');
      assert.strictEqual(nestedData.b.d, undefined, 'Proxied data is not changed');
    });

    test('preserves getters even nested ones', function (assert) {
      let instance = nested({
        foo: 123,
        get bar() {
          return this.foo;
        },
        foobar: {
          foo: 789,
          get bar() {
            return this.foo;
          },
        },
      });
      let obj = instance.data;
      assert.strictEqual(obj.foo, 123, 'initial value correct');
      assert.strictEqual(obj.bar, 123, 'intital getter correct');
      obj.foo = 456;
      assert.strictEqual(instance.data.foo, 456, 'value updated correctly');
      assert.strictEqual(instance.data.bar, 456, 'getter updated correctly');

      assert.strictEqual(obj.foobar.foo, 789, 'initial nested value correct');
      assert.strictEqual(obj.foobar.bar, 789, 'initial nested getter correct');
      obj.foobar.foo = 101112;
      assert.strictEqual(instance.data.foobar.foo, 101112, 'nested value updated correctly');
      assert.strictEqual(instance.data.foobar.bar, 101112, 'nested getter updated correctly');
    });

    test('JSON.stringify indentically as pure objects', function (assert) {
      const obj = {
        foo: 123,
        get bar() {
          return this.foo;
        },
        foobar: {
          foo: 789,
          get bar() {
            return this.foo;
          },
        },
      };
      const nestedObj = nested(obj).data;

      assert.strictEqual(JSON.stringify(obj), JSON.stringify(nestedObj));
    });
  });

  module('Array', () => {
    test('proxied array can still use array methods', function (assert) {
      const originalArray = ['a'];
      const nestedArray = nested(originalArray).data;
      assert.strictEqual(nestedArray[0], originalArray[0], 'Array in same index looks identical');
      assert.strictEqual(
        nestedArray.slice(0, 1).length,
        originalArray.slice(0, 1).length,
        'Sliced array have the same length'
      );
      assert.strictEqual(nestedArray.length, originalArray.length, 'Array and deep tracked array has the same length');
    });

    test('JSON.stringify indentically as pure array', function (assert) {
      const arr = [
        {
          foo: 123,
          get bar() {
            return this.foo;
          },
          foobar: {
            foo: 789,
            get bar() {
              return this.foo;
            },
          },
        },
      ];
      const nestedArr = nested(arr).data;

      assert.strictEqual(JSON.stringify(arr), JSON.stringify(nestedArr));
    });
  });

  module('Reactivity in template', (hooks) => {
    setupRenderingTest(hooks);

    reactivityTest(
      'works with nested object property',
      class extends Component {
        initialValue = 1;
        finalValue = 3;

        @trackedNested obj = { foo: { bar: 1 } };

        get value() {
          return this.obj.foo.bar;
        }

        update() {
          this.obj.foo.bar = this.finalValue;
        }
      }
    );

    reactivityTest(
      'works with nested getters',
      class extends Component {
        initialValue = 1;
        finalValue = 3;
        @trackedNested obj = {
          foo: {
            bar: 1,
            get baz() {
              return this.bar;
            },
          },
        };

        get value() {
          return this.obj.foo.baz;
        }

        update() {
          this.obj.foo.bar = this.finalValue;
        }
      }
    );

    reactivityTest(
      'works with nested object inside array',
      class extends Component {
        initialValue = 1;
        finalValue = 3;
        @trackedNested obj = [
          {
            foo: {
              bar: 1,
            },
          },
        ];

        get value() {
          debugger;
          return this.obj[0].foo.bar;
        }

        update() {
          this.obj[0].foo.bar = this.finalValue;
        }
      }
    );

    reactivityTest(
      'works with array push modifier',
      class extends Component {
        initialValue = 1;
        finalValue = 2;
        @trackedNested obj = [
          {
            foo: {
              bar: 1,
            },
          },
        ];

        get value() {
          return this.obj.length;
        }

        update() {
          this.obj.push({
            foo: {
              bar: 1,
            },
          });
        }
      }
    );

    reactivityTest(
      'works with array unshift modifier',
      class extends Component {
        initialValue = 1;
        finalValue = 2;
        @trackedNested obj = [
          {
            foo: {
              bar: 1,
            },
          },
        ];

        get value() {
          return this.obj.length;
        }

        update() {
          this.obj.unshift({
            foo: {
              bar: 2,
            },
          });
        }
      }
    );

    reactivityTest(
      'works with array inside array',
      class extends Component {
        initialValue = 1;
        finalValue = 3;
        @trackedNested obj = [['a']];

        get value() {
          return this.obj[0].length;
        }

        update() {
          this.obj[0].push('b');
          this.obj[0].push('c');
        }
      }
    );

    reactivityTest(
      'works when array modified without array methods',
      class extends Component {
        initialValue = 1;
        finalValue = 3;
        @trackedNested obj = [['a']];

        get value() {
          return this.obj[0].length;
        }

        update() {
          this.obj[0][1] = 'b';
          this.obj[0][2] = 'c';
        }
      }
    );

    reactivityTest(
      'works with ember set and get',
      class extends Component {
        initialValue = 1;
        finalValue = 3;
        @trackedNested obj = [['a']];

        get value() {
          // eslint-disable-next-line ember/no-get
          return get(this, 'obj.0.length');
        }

        update() {
          set(this, 'obj.0.1', 'b');
          set(this, 'obj.0.2', 'c');
        }
      }
    );
  });
});
