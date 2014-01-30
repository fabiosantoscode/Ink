Ink.requireModules(['Ink.UI.AutoComplete_1', 'Ink.Dom.Element_1', 'Ink.Dom.Css_1'], function (AutoComplete, InkElement, Css) {
    function makeContainer() {
        return InkElement.create('div', {
            className: 'ink-autocomplete',
            setHTML: Ink.i('test_html').innerHTML,
            style: 'display: none',
            insertBottom: document.body
        });
    }

    function testAutoComplete(name, testBack, options) {
        test(name, function ()  {
            var container = makeContainer();
            var input = Ink.s('input', container);
            var target = Ink.s('.target', container);
            var tabComponent = new AutoComplete(input, Ink.extendObj({
                target: target,
                suggestions: ['audi', 'mitsubishi', 'umm']
            }, options || {}));
            testBack(
                tabComponent,
                container,
                tabComponent._element,
                tabComponent._target);
        });
    }

    test('choosing a target: options.target when available', function () {
        var container = makeContainer();
        var target = Ink.s('.target', container);
        var autocomplete = new AutoComplete(Ink.s('input', container), { target: target, suggestions: [] });
        strictEqual(autocomplete._target, target);
    });

    test('choosing a target: element created if unavailable', function () {
        var container = makeContainer();
        var autocomplete = new AutoComplete(Ink.s('input', container), { target: null, suggestions: [] });
        ok(autocomplete._target);
    });

    testAutoComplete('target element gets class names added', function (_, __, ___, target) {
        ok(Css.hasClassName(target, 'ink-dropdown'), 'target gets ink-dropdown class');
        ok(Css.hasClassName(target, 'autocomplete'), 'target gets autocomplete class');
        ok(Css.hasClassName(target, 'hide-all'), 'target gets hide-all class');
    });

    function typeSomethingAndTest(name, cb, options) {
        testAutoComplete(name, function (component, container, input, target) {
            var args = [].slice.call(arguments);
            if (options.before) options.before.apply(null, args);

            stop();

            Syn.type('aud', input, function () {
                cb.apply(null, args);
            });
        }, options);
    }

    typeSomethingAndTest('type a few characters, AJAX request happens, if suggestionsURI is given', function(component, container, input, target) {
        var spy = Ink.Net.Ajax_1.prototype.init;
        ok(spy.called);
        spy.restore();
        start();
    }, {
        before: function (comp) {
            sinon.spy(Ink.Net.Ajax_1.prototype, 'init');
        },
        suggestions: null,
        suggestionsURI: 'autocomplete-suggestions.json'
    });

    typeSomethingAndTest('type a few characters, suggestions field pops up', function (component, __, input, target) {
        ok(component._openSuggester.called, '_openSuggester called when enough characters typed');
        ok(!Css.hasClassName(target, 'hide-all'), 'hide-all class removed');
        ok(target.getElementsByTagName('li').length, 'target has new <li> elements');
        start();
    }, { before: function (comp, _, __, target) {
        ok(Css.hasClassName(target, 'hide-all'));
        sinon.spy(comp, '_openSuggester');
    }});
});
