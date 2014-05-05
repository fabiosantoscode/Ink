QUnit.config.testTimeout = 2000

Ink.requireModules(['Ink.UI_1'], function(UI) {
    var testFunc;
    module('createUIComponent', {
        setup: function () {
            testFunc = function testFunc () {
                UI.BaseUIComponent.apply(this, arguments);
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
        ok((new testFunc(document.createElement('div'))) instanceof UI.BaseUIComponent);
    });
    test('Doesn\'t hurt existing prototype', function () {
        testFunc.prototype.foobarbaz = 'foobarbaz'
        UI.createUIComponent(testFunc);
        equal(testFunc.prototype.foobarbaz, 'foobarbaz');
    });

    module('BaseUIComponent', {
        setup: function () {
            testFunc = function TestFunc () {
                UI.BaseUIComponent.apply(this, arguments);
            };

            testFunc.prototype._init = function () {};
            testFunc._name = 'TestModule_1';
            testFunc._optionDefinition = {
                foo: ['String', null]
            };

            UI.createUIComponent(testFunc);
        }
    });

    test('its constructor calls _init, populates _options and _element', sinon.test(function () {
        this.stub(testFunc.prototype, '_init');
        var el, opt;
        var instance = new testFunc((el = document.createElement('div')), (opt = { foo: 'bar' }));
        equal(testFunc.prototype._init.calledOnce, true, '_init was called');
        ok(testFunc.prototype._init.calledOn(instance), '_init was called on the instance');

        deepEqual(instance._options, opt, 'options were created upon the instance');
        strictEqual(instance._element, el, 'element was passed');
    }));

    test('its constructor calls BaseUIComponent._validateInstance');
    test('its constructor if BaseUIComponent._validateInstance returns false, stubs the instance by calling BaseUIComponent._stubInstance');

    test('_validateInstance calls the instance\'s _validate() method, returns false if it fails');

    test('_stubInstance Replaces instance\'s functions with stubs which do nothing other than call Ink.warn');
});
