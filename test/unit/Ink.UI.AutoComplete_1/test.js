Ink.requireModules(['Ink.UI.AutoComplete_1', 'Ink.Dom.Element_1'], function (AutoComplete, InkElement) {
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
            var autocomplete = Ink.ss('.autocomplete-nav li', container);
            var tabComponent = new AutoComplete(container, options || {});
            testBack(tabComponent, container, autocomplete);
        });
    }

    testAutoComplete('_findLinkByHref', function (tabComponent, container, autocomplete) {
        var link = autocomplete[0].children[0];
        var linkWithFullUrl = autocomplete[1].children[0];
        linkWithFullUrl.setAttribute('href', pathHere + '#someth');

        ok(link && linkWithFullUrl);
        strictEqual(tabComponent._findLinkByHref('someth'), linkWithFullUrl);
        strictEqual(tabComponent._findLinkByHref('home'), link);
    });
});
