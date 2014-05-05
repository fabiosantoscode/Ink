Ink.createModule('Ink.UI', '1', ['Ink.UI.Common_1'], function (Common) {
    /* jshint maxcomplexity: 4 */
    'use strict';

    function warnStub() {
        /* jshint validthis: true */
        if (typeof this.constructor !== 'function') { return; }
        Ink.warn('You called a method on an incorrectly instantiated ' + this.constructor._name + ' component. Check the warnings above to see what went wrong.');
    }

    function stub(prototype, obj) {
        for (var k in prototype) if (prototype.hasOwnProperty(k)) {
            if (typeof obj[k] === 'function') {
                obj[k] = warnStub;
            }
        }
    }

    function BaseUIComponent(element, options) {
        var constructor = this.constructor;
        var _name = constructor._name;

        if (constructor === BaseUIComponent) {
            // The caller was "someModule.prototype = new BaseUIComponent" (below, on this file)
            // so it doesn't make sense to construct anything.
            return;
        }

        if (!element) {
            Ink.error(new Error(_name + ': You need to pass an element or a selector as the first argument to "new ' + _name + '()"'));
            return;
        }

        this._element = Common.elsOrSelector(element,
            _name + ': An element with this selector (' + element + ') was not found!');

        // Change Common.options's signature? the below looks better, is more manageable
        // var options = Common.options({
        //     element: this._element,
        //     modName: constructor._name,
        //     options: constructor._optionDefinition,
        //     defaults: constructor._globalDefaults
        // });

        this._options = Common.options(_name, constructor._optionDefinition, this._element);

        if (typeof this._validate === 'function') {
            var err;
            if ((err = this._validate(element, selector))) {
                stub(constructor.prototype, this);
                stub(BaseUIComponent.prototype, this);
                Ink.error('Error creating ' + _name + (err || ''));
                return;
            }
        }

        this._init.apply(this, arguments);
    }

    // TODO BaseUIComponent.setGlobalOptions = function () {}
    // TODO BaseUIComponent.createMany = function (selector) {}

    Ink.extendObj(BaseUIComponent.prototype, {
        
    });

    return {
        BaseUIComponent: BaseUIComponent,
        createUIComponent: function (theConstructor, options) {
            options = options || {};

            function assert(test, msg) {
                if (!test) {
                    throw new Error('Ink.UI_1.createUIComponent: ' + msg);
                }
            }

            function assertProp(prop, propType, message) {
                var propVal = theConstructor[prop] || options[prop];
                // Check that the property was passed
                assert(typeof propVal !== 'undefined',
                    theConstructor + ' doesn\'t have a "' + prop + '" property. ' + message);
                // Check that its type is correct
                assert(propType && typeof propVal === propType,
                    'typeof ' + theConstructor + '.' + prop + ' is not "' + propType + '". ' + message);
            }

            assert(typeof theConstructor === 'function',
                'constructor argument is not a function!');

            assertProp('_name', 'string', 'This property is used for error ' +
                'messages. Set it to the full module path and version (Ink.My.Module_1).');
            assertProp('_optionDefinition', 'object', 'This property contains the ' +
                'option names, types and defaults. See Ink.UI.Common.options() for reference.');

            // Extend the instance methods and props
            var _oldProto = theConstructor.prototype;
            theConstructor.prototype = new BaseUIComponent();
            for (var k in _oldProto) if (k !== 'constructor' && _oldProto.hasOwnProperty(k)) {
                theConstructor.prototype[k] = _oldProto[k];
            }
            // Extend static methods
            Ink.extendObj(theConstructor, BaseUIComponent);
        }
    };
});

