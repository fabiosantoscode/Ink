Ink.createModule('Ink.UI.AutoComplete', '1', ['Ink.UI.Common_1', 'Ink.Util.Array_1', 'Ink.Dom.Element_1', 'Ink.Dom.Css_1', 'Ink.Dom.Event_1', 'Ink.Util.Url_1', 'Ink.Net.Ajax_1'], function (Common, InkArray, InkElement, Css, InkEvent, Url, Ajax) {
'use strict';

function focus(elem) {
    if (elem) {
        try {
            elem.focus();
        } catch(e) { }
    }
}

function callBack(func, thisValue/* args...*/) {
    if (typeof func === 'function') {
        return func.apply(thisValue, [].slice.call(arguments, 2));
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
     * @param {Object}   [options] Hash containing the following options:
     * @param {Boolean}  [options.middleOfString=false] turn on to find matches in the middle of strings.
     * @param {String}   [options.suggestionsURI] URI of the endpoint to query for suggestions
     * @param {Function} [options.getSuggestionsURI] Function taking `(input value, autocomplete instance)` and returning the URL with suggestions.
     * @param {String}   [options.suggestionsURIParam='input'] Choose the URL parameter where we put the user input when getting suggestions. If you choose "asd", the url will be `"suggestionsURI?asd=user-input"`.
     * @param {String}   [options.targetClassName='autocomplete-target'] className of the suggestions list container (it contains the suggestions list UL).
     * @param {String}   [options.suggestionUlClassName='autocomplete-suggestions'] The className to be added to the suggestions UL.
     * @param {Function} [options.transformResponse] You can provide a function to digest a response from your endpoint into a format that AutoComplete understands. Takes `(Ink.Net.Ajax response)`, returns `{ suggestions: [], error: Error || null }`
     * @param {Function} [options.transformResponseRow=function(row){return{id:row,value:row,display:row};}] A function which takes the row from the Ajax response or your object, and returns an object `{ id, value, [optional] display }`. The "id" will be the second argument to onSelect when done, and the "display" is what gets displayed to the user. use "displayHTML" if you don't want HTML to be escaped.
     * @param {Function} [options.onAjaxError] A callback for when there are AJAX errors
     * @param {Function} [options.onSelect] A callback for when a value is selected. Takes `(selectedValue, selectedId, selectedDisplayText)`.
     * @param {Array}    [options.suggestions] A list of suggestions, for when you have them around.
     * @param {Integer}  [options.resultLimit=10] How many suggestions to show on the dropdown.
     * @param {Integer}  [options.minText=3] How many characters the user needs to type before we list suggestions.
     * @param {String|DOMElement} [options.target] (Advanced) element where suggestions appear.
     */
    _init: function(elem, options) {
        this._element = Common.elOrSelector(elem);

        this._options = Common.options({
            middleOfString: ['Boolean', false],
            suggestionsURI: ['String', null],
            getSuggestionsURI: ['Function', null],
            suggestionsURIParam: ['String', 'input'],
            transformResponse: ['Function', null],
            transformResponseRow: ['Function', function (row) { return { id: row, value: row, display: row }; }],
            targetClassName: ['String', 'autocomplete-target'],
            suggestionUlClassName: ['String', 'autocomplete-suggestions'],
            onAjaxError: ['Function', null],
            suggestions: ['Object', null],
            onSelect: ['Function', null],
            resultLimit: ['Integer', 10],
            outputElement: ['Element', null],
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

        if (this._options.outputElement) {
            this._outputElement = Common.elOrSelector(this._options.target);
        }

        Css.addClassName(this._target, 'hide-all');
        Css.addClassName(this._target, this._options.targetClassName);

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

        var target = InkEvent.element(event);

        var keyCode = event.keyCode || event.which;
        if (keyCode === InkEvent.KEY_DOWN || keyCode === InkEvent.KEY_UP) {
            var downUp = keyCode === InkEvent.KEY_DOWN ? 'down' : 'up';
            this._cycleFocus(target, downUp);
            InkEvent.stopDefault(event);
        }

        if (keyCode === InkEvent.KEY_ESC) {
            this.close();
            focus(this._element);
        }

        if (keyCode === InkEvent.KEY_TAB && target !== this._element) {
            this._select(target);
            this.close();
            focus(this._element);
        }
    },

    _cycleFocus: function (target, downUp) {
        if (target === this._element) {
            if (downUp === 'down') {
                focus(Ink.s('a', this._target));
            } else {
                var links = this._target.getElementsByTagName('a');
                focus(links[links.length - 1]);
            }
            return;
        } else {
            this._focusRelative(target, downUp);
        }
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
            focus(this._element);
            return;
        }

        focus(Ink.s('[data-value]', li));
    },

    _select: function (data) {
        if (Common.isDOMElement(data)) {
            var display = data.innerHTML;
            data = InkElement.data(data);
            data.display = display;
        }

        var id = data.id || data.value;

        if (!id) { return false; }

        if (this._outputElement) {
            this._outputElement.value = id;  // This could be an ugly GUID
        }

        this._element.value = data.value;  // This is what the user was typing against.

        callBack(this._options.onSelect, this, data);

        return true;
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
            var query = Url.getQueryString(suggestionsUri);
            query[this._options.suggestionsURIParam] = input;
            suggestionsUri = Url.genQueryString(Url.format(url), query);
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
            onSuccess: Ink.bindMethod(this, '_onAjaxSuccess', input),
            onFailure: Ink.bindMethod(this, '_onAjaxFailure')
        });
    },

    _searchSuggestions: function(input, suggestions) {
        if (!input) {
            this.close();
            return;
        }

        // https://github.com/isaacs/minimatch/blob/master/minimatch.js
        var sanitized = input.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

        var start = this._options.middleOfString ? '' : '^';
        var re = new RegExp(start + sanitized, "i");

        suggestions = InkArray.map(suggestions, Ink.bind(function (suggestion) {
            return this._options.transformResponseRow.call(this, suggestion);
        }, this));

        suggestions = InkArray.filter(suggestions, function (suggestion) {
            return suggestion.value.match(re);
        });

        if (typeof this._options.resultLimit === 'number') {
            suggestions = suggestions.slice(0, this._options.resultLimit)
        }

        this._renderSuggestions(suggestions);

        return suggestions;
    },

    _digestAjaxResponse: function(response) {
        if (typeof this._options.transformResponse === 'function') {
            return this._options.transformResponse.call(this, response);
        } else if (typeof response.responseJSON.suggestions === 'object') {
            return response.responseJSON;
        } else {
            return { suggestions: response.responseJSON, error: false };
        }
    },

    _onAjaxSuccess: function(input, obj) {
        var res = this._digestAjaxResponse(obj);

        if (!res.error && typeof res.error !== 'object') {
            this._searchSuggestions(input, res.suggestions);
        } else {
            callBack(this._options.onAjaxError, this, res.error);
        }
    },

    _onAjaxFailure: function(err) {
        callBack(this._options.onAjaxError, this, err);
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

        if (this._select(suggestion)) {
            this.close();
            InkEvent.stopDefault(event);
        }
    },

    _renderSuggestions: function(aSuggestions) {
        this._clear();

        if (!aSuggestions.length) { return; }

        //var str = '';
        var ul = InkElement.create('ul', {
            className: this._options.suggestionUlClassName
        });

        ul.innerHTML = InkArray.map(aSuggestions, function (suggestion) {
            var li = InkElement.create('li', {
                insertBottom: ul
            });

            var a = InkElement.create('a', {
                href: '#',
                'data-value': suggestion.value,
                'data-id': suggestion.id || suggestion.value
            });
            
            if (suggestion.displayHTML !== undefined) {
                a.innerHTML = suggestion.displayHTML;
            } else {
                InkElement.setTextContent(a, suggestion.display || suggestion.value);
            }

            li.appendChild(a);

            return li.outerHTML;
        }).join('');

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
    }
};

return AutoComplete;

});
