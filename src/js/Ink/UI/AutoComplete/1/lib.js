Ink.createModule('Ink.UI.AutoComplete', '1', ['Ink.UI.Common_1', 'Ink.Dom.Element_1', 'Ink.Dom.Css_1', 'Ink.Dom.Event_1', 'Ink.Util.Url_1', 'Ink.Net.Ajax_1'], function (Common, InkElement, Css, InkEvent, Url, Ajax) {
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
        } else {
            this._target = Common.elOrSelector(this._options.target);
        }

        Css.addClassName(this._target, 'ink-dropdown autocomplete hide-all');

        this._addEvents();
    },

    _setElmVars: function() {
    },

    _makeTarget: function () {
        return InkElement.create('div');
    },

    _addEvents: function() {
        this._handlers = {
            keyup: InkEvent.observe(this._element, 'keyup', Ink.bindEvent(this._onTypeInput, this)),
            focus: InkEvent.observe(this._element, 'focus', Ink.bindEvent(this._onFocusInput, this)),
            windowclick: InkEvent.observe(window, 'click', Ink.bindEvent(this._onClickWindow, this))
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
                this._target.innerHTML = '';
                this._submitData(value);
            } else {
                if (this._isSuggestActive()) {
                    this._closeSuggester();
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

    _isSuggestActive: function() {
        return !!this.suggestActive;
    },

    _submitData: function() {
        if(this.ajaxRequest) {
            // close connection
            try { this.ajaxRequest.transport.abort(); } catch (e) {}
            this.ajaxRequest = null;
        }

        var input = this._getInputValue();

        var suggestionsUri = this._options.suggestionsUri;
        if (this._options.getSuggestionsURI) {
            suggestionsUri = this._options.getSuggestionsUri(input, this);
        } else {
            var url = Url.parseUrl(suggestionsUri);
            suggestionsUri = Url.format(Ink.extendObj({ name: input}, url));
        }
        
        if(!this._options.suggestions){
            this.ajaxRequest = new Ajax(this._options.suggestionsURI, {
                method: 'get',
                onSuccess: Ink.bindMethod(this, '_onAjaxSuccess'),
                onFailure: Ink.bindMethod(this, '_onAjaxFailure')
            });
        } else {
           this._searchSuggestions(input);
        }
    },

    _searchSuggestions: function(str) {
        if(str !== '') {

            var re = new RegExp("^"+str+"", "i");

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
                this._writeResult(result);
            } else {
                this._closeSuggester();
            }
        } else {
            this._closeSuggester();
        }
    },

    _onAjaxSuccess: function(obj) {
        if(obj != null) {
            var res;

            if (this._options.transformResponse) {
                res = this._options.transformResponse(obj, this);
            } else {
                res = { suggestions: obj.responseJSON, error: false };
            }

            if(!res.error) {
                this._writeResult(res.suggestions);
            }
        }
    },

    _onAjaxFailure: function(err) {
        Ink.error('[Ink.UI.AutoComplete_1] Ajax failure: ', err);
    },

    _clearResults: function() {
        var aUl = this._target.getElementsByTagName('ul');
        if(aUl.length > 0) {
            aUl[0].parentNode.removeChild(aUl);
        }
    },

    _writeResult: function(aSuggestions) {
        this._clearResults();
        var i = 0;
        var limit = this._options.resultLimit;
        var total = aSuggestions.length;

        //var str = '';
        var ul = document.createElement('ul');
        Css.addClassName(ul, 'dropdown-menu');

        var li = false;
        var a = false;

        if(total > 0) {
            while(i < total) {
                li = document.createElement('li');

                a = document.createElement('a');
                a.href = '#'+aSuggestions[i];
                a.title = aSuggestions[i];

                a.onclick = Ink.bind(function(value) {
                    this.setChoosedValue(value);
                    this._closeSuggester();
                    return false;
                }, this, aSuggestions[i]);

                a.onmouseover = Ink.bind(function(value) {
                    this.setMouseSelected(value);
                }, this, aSuggestions[i]);

                a.innerHTML = aSuggestions[i];
                if(i === 0) {
                    a.className = this._options.classNameSelected;
                }

                li.appendChild(a);
                ul.appendChild(li);

                /*
                str += '<input name="checkbox2" type="radio" class="formRegistocheckbox" value="checkbox" />';
                str += '<label>'+aEmails[i]+'</label><br clear="all"/>';
                i++;
                */
                i++;
                if(i === limit) {
                    break;
                }
            }

            this._openSuggester();
        }

        //this._target.innerHTML = str;
        this._target.appendChild(ul);
    },

    _closeSuggester: function() {
        Css.addClassName(this._target, 'hide-all');
        this.suggestActive = false;
    },

    _openSuggester: function() {
        Css.removeClassName(this._target, 'hide-all');
        this.suggestActive = true;
    },

    _onSuggesterEnter: function() {
        if(this._isSuggestActive()) {
            var ul = this._target.getElementsByTagName('UL')[0] || false;
            if(ul) {
                var aLi = ul.getElementsByTagName('LI');
                var total = aLi.length;
                var i=0;
                while(i < total) {
                    if(aLi[i].childNodes[0].className == this._options.classNameSelected) {
                        aLi[i].childNodes[0].className = '';
                        var value = aLi[i].childNodes[0].innerHTML;
                        this.setChoosedValue(value);
                        break;
                    }
                    i++;
                }
            }
        }
    },

    _onClickWindow: function() {
        if(this._isSuggestActive()) {
            this._closeSuggester();
        }
    },

    setMouseSelected: function(value) {
        if(this._isSuggestActive()) {
            var ul = this._target.getElementsByTagName('UL')[0] || false;
            if(ul) {
                var aLi = ul.getElementsByTagName('LI');
                var total = aLi.length;
                var i = 0;
                while(i < total) {
                    if(aLi[i].childNodes[0].className == this._options.classNameSelected) {
                        aLi[i].childNodes[0].className = '';
                    }
                    if(aLi[i].childNodes[0].title == value) {
                        aLi[i].childNodes[0].className = this._options.classNameSelected;
                    }
                    i++;
                }
            }
        }
    },

    setChoosedValue: function(value) {
        //value = value.replace(/([^@]+)@(.*)/, "$1");
        this._element.value = value;
    },

    _goSuggesterDown: function() {
        if(this._isSuggestActive()) {
            var ul = this._target.getElementsByTagName('UL')[0] || false;
            if(ul) {
                var aLi = ul.getElementsByTagName('LI');
                var total = aLi.length;
                var i=0;
                var j=0;
                var selectedPosition = false;
                var nextSelected = 0;
                while(i < total) {
                    if(aLi[i].childNodes[0].className == this._options.classNameSelected) {
                        selectedPosition = i;
                        aLi[i].childNodes[0].className = '';
                        break;
                    }
                    i++;
                }
                if(selectedPosition == (total - 1)) {
                    nextSelected = 0;
                } else {
                    nextSelected = (selectedPosition + 1);
                }

                while(j < total) {
                    if(j == nextSelected) {
                        aLi[j].childNodes[0].className = this._options.classNameSelected;
                    }
                    j++;
                }
            }
        }
    },

    _goSuggesterUp: function() {
        if(this._isSuggestActive()) {
            var ul = this._target.getElementsByTagName('UL')[0] || false;
            if(ul) {
                var aLi = ul.getElementsByTagName('LI');
                var total = aLi.length;
                var i=0;
                var j=0;
                var selectedPosition = false;
                var nextSelected = 0;
                while(i < total) {
                    if(aLi[i].childNodes[0].className == this._options.classNameSelected) {
                        selectedPosition = i;
                        aLi[i].childNodes[0].className = '';
                        break;
                    }
                    i++;
                }
                if(selectedPosition === 0) {
                    nextSelected = (total - 1);
                } else {
                    nextSelected = (selectedPosition - 1);
                }

                while(j < total) {
                    if(j === nextSelected) {
                        aLi[j].childNodes[0].className = this._options.classNameSelected;
                    }
                    j++;
                }
            }
        }
    }
};

return AutoComplete;

});
