QUnit.config.testTimeout = 2000

Ink.requireModules(['Ink.UI_1'], function(UI) {
    var testFunc;
    module('createUIComponent', {
        setup: function () {
            testFunc = function testFunc () {
            }

            testFunc._name = 'TestModule_1';
            testFunc._optionDefinition = {};
        }
    })

    function throwsWithArgument(argument) {
        throws(function () { UI.createUIComponent(argument) })
    }

    test('Fails on null/undefined constructors', function () {
        throwsWithArgument(null);
        throwsWithArgument(undefined);
        throwsWithArgument('');
    });
    test('Fails on constructors without required properties', function () {
        UI.createUIComponent(testFunc);
        delete testFunc._name;
        delete testFunc._optionDefinition;
        throwsWithArgument(testFunc);
    });
    test('Makes the module inherit BaseUIComponent', function () {
        UI.createUIComponent(testFunc)
        console.log(testFunc.prototype)
        ok((new testFunc()) instanceof UI.BaseUIComponent);
    });
    test('Doesn\'t hurt existing prototype', function () {
        testFunc.prototype.foobarbaz = 'foobarbaz'
        UI.createUIComponent(testFunc);
        equal(testFunc.prototype.foobarbaz, 'foobarbaz');
    });
});
