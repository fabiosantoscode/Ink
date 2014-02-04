Ink.createModule('Ink.UI.AutoComplete', '1', ['Ink.UI.Common_1', 'Ink.Util.Array_1', 'Ink.Dom.Element_1', 'Ink.Dom.Css_1', 'Ink.Dom.Event_1', 'Ink.Util.Url_1', 'Ink.Net.Ajax_1'], function (Common, InkArray, InkElement, Css, InkEvent, Url, Ajax) {
'use strict';

function focus(elem) {
    if (elem) {
        try {
            elem.focus();
        } catch(e) { }
    }
}

/**
 * @module Ink.UI.AutoComplete_1
 */
function AutoComplete(elem, options) {
    this._init(elem, options);
}

AutoComplete.prototype = {
    /**
     * @class Ink.UI.AutoComplete_1
     * @constructor
     *
     * @param {String|DOMElement} elem String or DOMElement for the input field
     * @param {String}   [options.suggestionsURI] URI of the endpoint to query for suggestions
     * @param {Function} [options.getSuggestionsURI] Function taking `(input value, autocomplete instance)` and returning the URL with suggestions.
     * @param {String}   [options.suggestionsURIParam='input'] Choose the URL parameter where we put the user input when getting suggestions. If you choose "asd", the url will be `"suggestionsURI?asd=user-input"`.
     * @param {Function} [options.transformResponse] You can provide a function to digest a response from your endpoint into a format that AutoComplete understands. Takes `(Ink.Net.Ajax response)`, returns `{ suggestions: [], error: Error || null }`
     * @param {Function} [options.onAjaxError] A callback for when there are AJAX errors
     * @param {Array}    [options.suggestions] A list of suggestions, for when you have them around.
     * @param {Integer}  [options.resultLimit=10] How many suggestions to show on the dropdown.
     * @param {Integer}  [options.minText=3] How many characters the user needs to type before we list suggestions.
     * @param {String|DOMElement} [options.target] (Advanced) element where suggestions appear.
     */
    _init: function(elem, options) {
        this._element = Common.elOrSelector(elem);

        this._options = Common.options({
            suggestionsURI: ['String', null],
            getSuggestionsURI: ['Function', null],
            suggestionsURIParam: ['String', 'input'],
            transformResponse: ['Function', null],
            onAjaxError: ['Function', null],
            suggestions: ['Object', null],
            onSelect: ['Function', null],
            resultLimit: ['Integer', 10],
            minText: ['Integer', 3],
            target: ['String', null]
        }, options || {}, this._element);

        if (!(this._options.suggestionsURI || this._options.suggestions || this._options.getSuggestionsURI)) {
            Ink.error('Ink.UI.AutoComplete: You must specify the endpoint or array for autocomplete suggestions!');
            Ink.log('Use the suggestionsURI (URI string), suggestions (array), or getSuggestionsURI (function (typedCharacters) {}) options.');
            return;
        }

        if (!this._options.target) {
            this._target = InkElement.create('div');
            InkElement.insertAfter(this._target, this._element);
        } else {
            this._target = Common.elOrSelector(this._options.target);
        }

        Css.addClassName(this._target, 'ink-dropdown autocomplete hide-all');

        this._addEvents();

        this._getSuggestionsThroughAjax = InkEvent.throttle(this._getSuggestionsThroughAjax, 200);
    },

    _addEvents: function() {
        this._handlers = {
            keydown: InkEvent.observe(this._element, 'keydown', Ink.bindEvent(this._onKeyDown, this)),
            valueskeydown: InkEvent.observeDelegated(this._target, 'keydown', '[data-value]', Ink.bindEvent(this._onKeyDown, this)),
            keyup: InkEvent.observe(this._element, 'keyup', Ink.bindEvent(this._onKeyUp, this)),
            windowclick: InkEvent.observe(window, 'click', Ink.bindEvent(this._onClickWindow, this)),
            suggestionclick: InkEvent.observeDelegated(this._target, 'click', 'a', Ink.bindEvent(this._onSuggestionClick, this))
        };
    },

    _onKeyUp: function() {
        var value = this._getInputValue();

        if(value !== this._oldValue) {
            this._oldValue = value;

            if (value.length >= this._options.minText) {
                // get suggestions based on name
                this._clear();
                this._getSuggestions(value);
            } else {
                this.close();
            }
        }

        return;
    },

    _onKeyDown: function (event) {
        if (!this.isOpen()) { return; }

        var keyCode = event.keyCode || event.which;
        if (keyCode === InkEvent.KEY_DOWN || keyCode === InkEvent.KEY_UP) {
            if (InkEvent.element(event) === this._element && keyCode === InkEvent.KEY_DOWN) {
                this._focusFirst();
            } else {
                this._focusRelative(InkEvent.element(event), keyCode === InkEvent.KEY_DOWN ? 'down' : 'up');
            }
        }
    },

    _focusFirst: function () {
        focus(Ink.s('a', this._target));
    },

    _focusRelative: function (element, downUp) {
        var li = InkElement.findUpwardsBySelector(element, 'li');

        var siblingName = downUp === 'down' ? 'nextSibling' : 'previousSibling';

        // Advance until we're at a <li> with an <a> with the [data-value] attr
        do {
            li = li[siblingName];
        } while (li && !Ink.s('[data-value]', li));

        // Trying to go up the first, or down the last.
        if (!li) {
            if (!li && downUp === 'up') {
                // It's the top element. focus the input
                focus(this._element);
            }
            return;
        }

        focus(Ink.s('[data-value]', li));
    },

    _getFocusedValue: function () {
        if (InkElement.isAncestorOf(this._target, document.activeElement)) {
            return document.activeElement;
        }
    },

    _getInputValue: function() {
        if (''.trim) {
            return this._element.value.trim();
        } else {
            return this._element.value.replace(/^\s+/, '').replace(/\s+$/, '');
        }
    },

    _getSuggestions: function() {
        var input = this._getInputValue();

        if(this._options.suggestions){
            this._searchSuggestions(input, this._options.suggestions);
        } else {
            this._getSuggestionsThroughAjax(input);
        }
    },

    _getSuggestionsURI: function (input) {
        var suggestionsUri = this._options.suggestionsURI;
        if (this._options.getSuggestionsURI) {
            suggestionsUri = this._options.getSuggestionsURI(input, this);
        } else if (this._options.suggestionsURIParam) {
            var url = Url.parseUrl(suggestionsUri);
            url[this._options.suggestionsURIParam] = input;
            suggestionsUri = Url.format(url);
        }
        return suggestionsUri;
    },

    _getSuggestionsThroughAjax: function (input) {
        if (this.ajaxRequest) {
            // close connection
            try { this.ajaxRequest.transport.abort(); } catch (e) {}
            this.ajaxRequest = null;
        }

        this.ajaxRequest = new Ajax(this._getSuggestionsURI(input), {
            method: 'get',
            onSuccess: Ink.bindMethod(this, '_onAjaxSuccess'),
            onFailure: Ink.bindMethod(this, '_onAjaxFailure')
        });
    },

    _searchSuggestions: function(input, suggestions) {
        if (!input) {
            this.close();
            return;
        }

        var sanitized = input.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        var re = new RegExp("^" + sanitized + "", "i");

        suggestions = InkArray.filter(suggestions, function (suggestion) {
            return suggestion.match(re);
        });

        this._renderSuggestions(suggestions);
    },

    _digestAjaxResponse: function(response) {
        if (this._options.transformResponse) {
            return this._options.transformResponse(response, this);
        } else if (typeof response.responseJSON.suggestions === 'object') {
            return response.responseJSON;
        } else {
            var res = { suggestions: response.responseJSON, error: false };
            return res;
        }
    },

    _onAjaxSuccess: function(obj) {
        var res = this._digestAjaxResponse(obj);

        if (typeof res.error !== 'object') {
            this._renderSuggestions(res.suggestions);
        } else if (this._options.onAjaxError) {
            this._options.onAjaxError(res.error);
        }
    },

    _onAjaxFailure: function(err) {
        if (this._options.onAjaxError) {
            this._options.onAjaxError(err);
        }
        Ink.error('[Ink.UI.AutoComplete_1] Ajax failure: ', err);
    },

    _clear: function() {
        var aUl = this._target.getElementsByTagName('ul');
        if(aUl.length > 0) {
            aUl[0].parentNode.removeChild(aUl[0]);
        }
    },

    _onSuggestionClick: function(event) {
        var suggestion = InkEvent.element(event);
        var targetValue = InkElement.data(suggestion).value;

        if (targetValue !== undefined) {
            if (this._options.onSelect) { this._options.onSelect(targetValue, this); }
            this.setValue(targetValue);
            this.close();
            InkEvent.stopDefault(event);
        }
    },

    _renderSuggestions: function(aSuggestions) {
        this._clear();

        if (!aSuggestions.length) { return; }

        //var str = '';
        var ul = InkElement.create('ul', {
            className: 'dropdown-menu'
        });

        var li;

        var len = Math.min(aSuggestions.length, this._options.resultLimit);
        for (var i = 0; i < len; i++) {
            li = InkElement.create('li', {
                insertBottom: ul
            });

            InkElement.create('a', {
                href: '#',
                'data-value': aSuggestions[i],
                setTextContent: aSuggestions[i],
                insertBottom: li
            });
        }

        this._open();

        //this._target.innerHTML = str;
        this._target.appendChild(ul);
    },

    isOpen: function() {
        return !Css.hasClassName(this._target, 'hide-all');
    },

    /**
     * Hide the suggestion box.
     *
     * @method close
     **/
    close: function() {
        Css.addClassName(this._target, 'hide-all');
    },

    _open: function() {
        Css.removeClassName(this._target, 'hide-all');
    },

    _onClickWindow: function() {
        this.close();
    },

    setValue: function(value) {
        //value = value.replace(/([^@]+)@(.*)/, "$1");
        this._element.value = value;
    }
};

return AutoComplete;

});
