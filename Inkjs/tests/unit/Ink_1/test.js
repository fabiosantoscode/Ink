/*globals equal,test,asyncTest,stop,start,ok,expect*/
test('bindMethod', function () {
    var obj = {
        test0: function () {
            return [].slice.call(arguments);
        },
        test1: function () {
            return [].slice.call(arguments);
        },
        test2: function () {
            return this;
        }
    };
    var test0 = Ink.bindMethod(obj, 'test0');
    var test1 = Ink.bindMethod(obj, 'test1', 1, 2, 3, 4);
    var test2 = Ink.bindMethod(obj, 'test2');

    deepEqual(test0(1, 2, 3, 4), [1, 2, 3, 4], 'returns same arguments as called with');
    deepEqual(test1(), [1, 2, 3, 4], 'returns arguments given at bind time');
    deepEqual(test2(), obj, 'returns the object owning the method');
});

asyncTest('createModule waits a tick before creating the module', function () {
    Ink.createModule('Ink.foo', '1', [], function () {
        ok(true, 'module created');
        start();
        return {};
    });
    equal(Ink.foo_1, undefined, 'Ink.foo will not exist until next tick');
});

asyncTest('requireModules waits a tick before requiring the module', function () {
    var required = 'not yet'
    Ink.requireModules(['Ink.foo_1'], function () {
        required = true;
        ok(true, 'module required');
        start();
    });
    equal(required, 'not yet', 'requireModules callback function not called yet');
});
