Ink.requireModules(['Ink.UI.AutoComplete_1', 'Ink.Dom.Element_1', 'Ink.Dom.Css_1', 'Ink.Dom.Selector_1'], function (AutoComplete, InkElement, Css, Selector) {
    function makeContainer() {
        return InkElement.create('div', {
            className: 'ink-autocomplete',
            setHTML: Ink.i('test_html').innerHTML,
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
                suggestions: ['audi', 'aud2', 'mitsubishi', 'umm']
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
    }, { targetClassName: 'ink-dropdown autocomplete' });

    function typeSomethingAndTest(name, cb, options) {
        options = options || {};
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
        suggestionsURI: './autocomplete-suggestions.json'
    });

    typeSomethingAndTest('type a few characters, suggestions field pops up', function (component, __, input, target) {
        ok(component._open.called, '_open called when enough characters typed');
        ok(!Css.hasClassName(target, 'hide-all'), 'hide-all class removed');
        ok(target.getElementsByTagName('li').length, 'target has new <li> elements');
        start();
    }, { before: function (comp, _, __, target) {
        ok(Css.hasClassName(target, 'hide-all'));
        sinon.spy(comp, '_open');
    }});

    typeSomethingAndTest('type a few characters, click a suggestion, input element changes value', function (_, __, input, target) {
        var a = Selector.select('a[data-value="audi"]', target);
        ok(a.length, 'sanity check');
        Syn.click(a[0], function () {
            equal(input.value, 'audi');
            start();
        });
    });

    typeSomethingAndTest('type a few characters, focus + press enter on a suggestion, input element changes value', function (_, __, input, target) {
        var a = Selector.select('a[data-value="audi"]', target);
        ok(a.length, 'sanity check');
        Syn.type(a[0], '[enter]', function () {
            equal(input.value, 'audi');
            start();
        });
    });

    test('transformResponseRow is called for each row when searchSuggestions is called.', function() {
        var container = makeContainer();
        var autocomplete = new AutoComplete(Ink.s('input', container), { target: null, suggestions: ['sugg1', 'sugg2'] });
        var transformResponseRow = sinon.spy(autocomplete._options, 'transformResponseRow');
        autocomplete._searchSuggestions('something', autocomplete._options.suggestions);
        equal(transformResponseRow.callCount, 2);
        equal(transformResponseRow.firstCall.args.length, 1);
        equal(transformResponseRow.firstCall.args[0], 'sugg1');
        equal(transformResponseRow.lastCall.args[0], 'sugg2');
    });

    testAutoComplete('resultLimit affects how many results are returned by _searchSuggestions', function (comp) {
        var suggestions = ['aa', 'ab', 'ac']
        equal(comp._searchSuggestions('a', suggestions).length, 2);
        delete comp._options.resultLimit;
        equal(comp._searchSuggestions('a', suggestions).length, 3);
    }, { resultLimit: 2 });

    testAutoComplete('When options.middleofstring is on, don\'t match the beginning of the string', function (comp) {
        var fakeRe = sinon.spy(window, 'RegExp');
        var suggestions = ['aMATCH', 'MATCHa']
        comp._searchSuggestions('MATCH', suggestions);
        notEqual(fakeRe.lastCall.args[0].charAt(0), '^')

        comp._options.middleOfString = false;
        comp._searchSuggestions('MATCH', suggestions);
        equal(fakeRe.lastCall.args[0].charAt(0), '^');

        fakeRe.restore();
    }, { middleOfString: true });

    (function () {
        var spy = sinon.spy();
        typeSomethingAndTest('When clicking a suggestion, options.onSelect is called', function (instance, __, input, target) {
            var a = Selector.select('a[data-value="audi"]', target);
            Syn.click(a[0], function () {
                ok(spy.calledOnce, 'onSelect called');
                deepEqual(spy.lastCall.args[0].display, 'audi', 'onSelect called with suggestion, instance');
                strictEqual(spy.lastCall.thisValue, instance, 'onSelect called with this=instance');
                start();
            });
        }, {onSelect: spy});
    }());

    test('AutoComplete calls user functions for creating the request URI', function () {
        var container = makeContainer();
        container.getElementsByTagName('input')[0].value = 'the value';
        var uri;
        var spy = sinon.spy(sinon.stub().returns('http://example.com/'));
        var autocomplete = new AutoComplete(Ink.s('input', container), { getSuggestionsURI: spy });
        autocomplete._getSuggestions();
        ok(spy.called, 'getSuggestionsURI called');
        ok(spy.calledWith('the value', autocomplete), 'getSuggestionsURI called with the value and the autocomplete instance');
    });

    testAutoComplete('options.suggestionsURIParam', function (comp) {
        equal(comp._getSuggestionsURI('THE_TEXT'), '/?param=THE_TEXT');
        equal(comp._getSuggestionsURI('THE TEXT'), '/?param=THE%20TEXT');
    }, {suggestionsURIParam: 'param', suggestionsURI: '/' });

    testAutoComplete('options.outputElement gets filled in with the new value', function (comp, _, input) {
        comp._select({ id: 'urmom', value: 'i' });
        equal(comp._outputElement.value, 'urmom', 'outputElement gets the selected value');
        notEqual(input.value, 'urmom', 'NOT the input');
    }, { outputElement: InkElement.create('input') });

    module('keyboard navigation');

    testAutoComplete('_focusRelative', function (autocomp, __, input, target) {
        autocomp._searchSuggestions('a', ['aa', 'ab', 'ac', 'ad']);
        var aa = Selector.select('a[data-value="aa"]', target)[0];
        var ab = Selector.select('a[data-value="ab"]', target)[0];
        autocomp._focusRelative(ab, 'up');
        strictEqual(document.activeElement, aa);
        autocomp._focusRelative(aa, 'down');
        strictEqual(document.activeElement, ab);
    });

    testAutoComplete('_focusRelative past first and last', function (autocomp, __, input, target) {
        autocomp._searchSuggestions('a', ['aa', 'ab', 'ac', 'ad']);
        var aa = Selector.select('a[data-value="aa"]', target)[0];
        var ad = Selector.select('a[data-value="ad"]', target)[0];


        equal(Selector.select('a', target).length, 4, 'sanity check');

        aa.focus();
        autocomp._focusRelative(aa, 'up');
        strictEqual(document.activeElement, input, 'going up from first goes back to the <input>');

        ad.focus();
        autocomp._focusRelative(ad, 'down');
        strictEqual(document.activeElement, input, 'going down from the last goes back to the <input>');
    });

    testAutoComplete('press [down] to focus the first <a>', function (_, __, input, target) {
        stop();
        Syn.type('aud[down]', input, function () {
            var firstOne = Selector.select('a', target)[0];
            equal(firstOne, document.activeElement, 'When [down] was pressed, the first suggestion was focused');
            start();
        });
    });

    testAutoComplete('navigate up and down', function (_, __, input, target) {
        stop();
        Syn.type('aud[down]', input, function () {
            equal(Ink.ss('a', target).length, 2, 'sanity check.');
            var firstOne = Selector.select('a', target)[0];
            var secondOne = Selector.select('a', target)[1];
            Syn.type('[down]', firstOne, function () {
                strictEqual(secondOne, document.activeElement, 'pressed down from the first one to select the second one');
                Syn.type('[down]', secondOne, function () {
                    equal(input, document.activeElement, 'pressing down again goes back to the input');
                    Syn.type('[up]', input, function () {
                        equal(secondOne, document.activeElement, 'pressing up from the input selects the last one');
                        start();
                    });
                });
            });
        });
    });

    testAutoComplete('press escape to leave', function (_, __, input, target) {
        stop();
        Syn.type('aud[down]', input, function () {
            equal(Ink.ss('a', target).length, 2, 'sanity check.');
            var firstOne = Selector.select('a', target)[0];
            Syn.type('[escape]', firstOne, function () {
                ok(Css.hasClassName(target, 'hide-all'), 'when [escape] typed, target gets .hide-all');
                strictEqual(input, document.activeElement, 'And the input gets focused');
                start();
            });
        });
    });

    testAutoComplete('press [tab] to select and move focus to next thing, if we\'re in a form', function (_, __, input, target) {
        stop();
        var form = InkElement.create('form');
        InkElement.wrap(input, form);
        var linkAfter = InkElement.create('input', {
            insertAfter: input,
            type: 'text'
        });
        Syn.type('aud[down]', input, function () {
            equal(Ink.ss('a', target).length, 2, 'sanity check.');
            var firstOne = Selector.select('a', target)[0];
            strictEqual(firstOne, document.activeElement, 'sanity check 2');
            Syn.type('[tab]', firstOne, function () {
                strictEqual(linkAfter, document.activeElement, 'the next thing is focused');
                equal(input.value, InkElement.textContent(firstOne));
                ok(Css.hasClassName(target, 'hide-all'), 'target gets .hide-all');
                start();
            });
        });
    });
});
