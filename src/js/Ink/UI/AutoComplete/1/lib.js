Ink.createModule('Ink.UI.AutoComplete', '1', ['Ink.UI.Common_1', 'Ink.Dom.Element_1', 'Ink.Dom.Css_1', 'Ink.Dom.Event_1', 'Ink.Util.Url_1', 'Ink.Net.Ajax_1'], function (Common, InkElement, Css, InkEvent, Url, Ajax) {
/*jshint maxcomplexity: 4*/
'use strict';

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
     */
    _init: function(elem, options) {
        this._options = Ink.extendObj({
            target: null,
            suggestionsURI: null,
            getSuggestionsUri: null,
            transformResponse: null,
            classNameSelected: 'selected',
            suggestions: null,
            resultLimit: 10,
            minLength: 1
        }, options || {});

        if (!(this._options.suggestionsURI || this._options.suggestions || this._options.getSuggestionsURI)) {
            Ink.error('Ink.UI.AutoComplete: You must specify the endpoint or array for autocomplete suggestions!');
            Ink.log('Use the suggestionsURI (URI string), suggestions (array), or getSuggestionsURI (function (typedCharacters) {}) options.');
            return;
        }

        this._element = Common.elOrSelector(elem);

        if (!this._options.target) {
            this._target = this._makeTarget();
            InkElement.insertAfter(this._target, this._element);
        } else {
            this._target = Common.elOrSelector(this._options.target);
        }

        Css.addClassName(this._target, 'ink-dropdown autocomplete hide-all');

        this._addEvents();
    },

    _makeTarget: function () {
        return InkElement.create('div');
    },

    _addEvents: function() {
        this._handlers = {
            keyup: InkEvent.observe(this._element, 'keyup', Ink.bindEvent(this._onTypeInput, this)),
            focus: InkEvent.observe(this._element, 'focus', Ink.bindEvent(this._onFocusInput, this)),
            windowclick: InkEvent.observe(window, 'click', Ink.bindEvent(this._onClickWindow, this)),
            suggestionclick: InkEvent.observeDelegated(this._target, 'click', 'a', Ink.bindEvent(this._onSuggestionClick, this))
        };
    },

    _onTypeInput: function(e) {
        var keycode = e.keyCode;

        if(
                keycode !== InkEvent.KEY_DOWN &&
                keycode !== InkEvent.KEY_UP &&
                keycode !== InkEvent.KEY_ESC &&
                keycode !== InkEvent.KEY_TAB &&
                keycode !== InkEvent.KEY_LEFT &&
                keycode !== InkEvent.KEY_RIGHT
                ) {
            var value = this._getInputValue();

            if (value.length >= this._options.minLength) {
                // get suggestions based on name
                this._clearResults();
                this._getSuggestions(value);
            } else {
                if (this.isOpen()) {
                    this._closeSuggestions();
                }
            }
            InkEvent.stop(e);
        }

        return;
    },

    _onFocusInput: function() {
        // for now... do nothing
        return;
    },


    _getInputValue: function() {
        return this._element.value.trim();
    },

    isOpen: function() {
        return !!this.open;
    },

    _getSuggestions: function() {
        var input = this._getInputValue();

        if(this._options.suggestions){
            this._searchSuggestions(input);
        } else {
            this._getSuggestionsThroughAjax(input);
        }
    },


    _getSuggestionsThroughAjax: function (input) {
        var suggestionsUri = this._options.suggestionsUri;
        if (this._options.getSuggestionsURI) {
            suggestionsUri = this._options.getSuggestionsUri(input, this);
        } else {
            var url = Url.parseUrl(suggestionsUri);
            suggestionsUri = Url.format(Ink.extendObj({ name: input}, url));
        }
        if(this.ajaxRequest) {
            // close connection
            try { this.ajaxRequest.transport.abort(); } catch (e) {}
            this.ajaxRequest = null;
        }

        this.ajaxRequest = new Ajax(this._options.suggestionsURI, {
            method: 'get',
            onSuccess: Ink.bindMethod(this, '_onAjaxSuccess'),
            onFailure: Ink.bindMethod(this, '_onAjaxFailure')
        });
    },

    _searchSuggestions: function(input) {
        if (!input) {
            this._closeSuggestions();
            return;
        }

        var re = new RegExp("^"+input+"", "i");
        var curSuggest;
        var obj = this._options.suggestions;
        var result = [];

        var totalSuggestions = obj.length;
        for(var i=0; i < totalSuggestions; i++) {
            curSuggest = obj[i];

            //if(re.test(curPath)) {
            if(curSuggest.match(re)) {
                result.push(curSuggest);
            }
        }

        if(result.length>0) {
            this._renderSuggestions(result);
        } else {
            this._closeSuggestions();
        }
    },

    _onAjaxSuccess: function(obj) {
        if(obj != null) {
            var res;

            if (this._options.transformResponse) {
                res = this._options.transformResponse(obj, this);
            } else {
                res = { suggestions: obj.responseJSON, error: false };
                if (res.suggestions.suggestions) { res = res.suggestions; }
            }

            if(!res.error) {
                this._renderSuggestions(res.suggestions);
            }
        }
    },

    _onAjaxFailure: function(err) {
        Ink.error('[Ink.UI.AutoComplete_1] Ajax failure: ', err);
    },

    _clearResults: function() {
        var aUl = this._target.getElementsByTagName('ul');
        if(aUl.length > 0) {
            aUl[0].parentNode.removeChild(aUl[0]);
        }
    },

    _onSuggestionClick: function(event) {
        var suggestion = InkEvent.element(event);
        var targetValue = InkElement.data(suggestion).value;

        if (targetValue !== undefined) {
            this.setValue(targetValue);
            this._closeSuggestions();
            InkEvent.stopDefault(event);
        }
    },

    _renderSuggestions: function(aSuggestions) {
        this._clearResults();

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
                title: aSuggestions[i],
                'data-value': aSuggestions[i],
                setTextContent: aSuggestions[i],
                insertBottom: li
            });
        }

        this._openSuggestions();

        //this._target.innerHTML = str;
        this._target.appendChild(ul);
    },

    _closeSuggestions: function() {
        Css.addClassName(this._target, 'hide-all');
        this.open = false;
    },

    _openSuggestions: function() {
        Css.removeClassName(this._target, 'hide-all');
        this.open = true;
    },

    _onClickWindow: function() {
        if(this.isOpen()) {
            this._closeSuggestions();
        }
    },

    setValue: function(value) {
        //value = value.replace(/([^@]+)@(.*)/, "$1");
        this._element.value = value;
    }
};

return AutoComplete;

});
