/*globals equal,test,asyncTest,stop,start,ok,expect*/
QUnit.config.testTimeout = 2000

Ink.requireModules(['Ink.UI_1'], function(UI) {
    var testFunc;
    module('createUIComponent', {
        setup: function () {
            testFunc = function () {}
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
        throwsWithArgument(testFunc);
        testFunc.moduleName = 'TestModule_1';
        testFunc._optionDefinition = {};
        UI.createUIComponent(testFunc);
        ok(true);
    });
    test('Makes the module inherit BaseUIComponent', function () {
        UI.createUIComponent(testFunc)
        ok(testFunc instanceof UI.BaseUIComponent);
    })

});
