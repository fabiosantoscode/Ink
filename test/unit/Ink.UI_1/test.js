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
        ok((new testFunc(document.createElement('div'))) instanceof UI.BaseUIComponent);
    });
    test('Doesn\'t hurt existing prototype', function () {
        testFunc.prototype.foobarbaz = 'foobarbaz'
        UI.createUIComponent(testFunc);
        equal(testFunc.prototype.foobarbaz, 'foobarbaz');
    });

    var testEl;
    var testOpts;

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

            testEl = document.createElement('div');
            testOpts = { foo: 'bar' };

            UI.createUIComponent(testFunc);
        }
    });

    test('its constructor: calls _init, populates _options and _element', sinon.test(function () {
        this.stub(testFunc.prototype, '_init');
        var instance = new testFunc(testEl, testOpts);
        equal(testFunc.prototype._init.calledOnce, true, '_init was called');
        ok(testFunc.prototype._init.calledOn(instance), '_init was called on the instance');

        deepEqual(instance._options, testOpts, 'options were created upon the instance');
        strictEqual(instance._element, testEl, 'element was passed');
    }));

    test('its constructor: calls BaseUIComponent._validateInstance', sinon.test(function () {
        this.stub(UI.BaseUIComponent, '_validateInstance');

        var instance = new testFunc(testEl, testOpts);

        ok(UI.BaseUIComponent._validateInstance.calledOnce);
        ok(UI.BaseUIComponent._validateInstance.calledWith(instance));
    }));

    test('its constructor: if BaseUIComponent._validateInstance returns false, stubs the instance by calling BaseUIComponent._stubInstance', sinon.test(function () {
        this.stub(UI.BaseUIComponent, '_stubInstance');
        var stub = this.stub(UI.BaseUIComponent, '_validateInstance');
        stub.returns(true);

        equal(UI.BaseUIComponent._validateInstance(), true, 'sanity check');

        new testFunc(testEl, testOpts);
        equal(UI.BaseUIComponent._stubInstance.callCount, 0);

        stub.returns(false);
        equal(UI.BaseUIComponent._validateInstance(), false, 'sanity check');

        var inst = new testFunc(testEl, testOpts);

        equal(UI.BaseUIComponent._stubInstance.callCount, 1, '_stubInstance was called once');
        equal(UI.BaseUIComponent._stubInstance.calledWith(inst), true, '... with the instance');
    }));

    test('_validateInstance calls the instance\'s _validate() method, returns false if it returnsor throws an error', function () {
        var _validateInstance = Ink.bindMethod(UI.BaseUIComponent, '_validateInstance');
        var mockInstance = {}

        mockInstance._validate = sinon.stub().returns(undefined) 
        equal(
            _validateInstance(mockInstance, testFunc, 'TestFunc_1'),
            true,
            'validate returned non-error');

        mockInstance._validate = sinon.stub().returns(new Error);
        equal(
            _validateInstance(mockInstance, testFunc, 'TestFunc_1'),
            false,
            '_validate() returned an error');

        mockInstance._validate = sinon.stub().throws(new Error('Oops! I threw it again!'));
        equal(
            _validateInstance(mockInstance, testFunc, 'TestFunc_1'),
            false,
            '_validate() threw an error');
    });

    test('_stubInstance Replaces instance\'s functions with stubs which do nothing other than call Ink.warn', sinon.test(function () {
        var _stubInstance = Ink.bindMethod(UI.BaseUIComponent, '_stubInstance');

        var fooMeth = sinon.stub();
        var mockInstance = { 'foo': fooMeth }

        sinon.stub(Ink, 'warn');
        _stubInstance(mockInstance, { prototype: { foo: function () {} } }, 'THE_NAME')
        ok(Ink.warn.calledWith(sinon.match('THE_NAME')))

        notStrictEqual(mockInstance.foo, fooMeth);

        mockInstance.foo();
        ok(Ink.warn.calledTwice);
    }));

    var baseUIProto = UI.BaseUIComponent.prototype;
    test('#getOption and #getElement', function() {
        var inst = new testFunc(testEl, { foo: 'qux' });

        strictEqual(inst.getOption('foo'), 'qux');
        strictEqual(inst.getElement(), testEl);
    });
});
