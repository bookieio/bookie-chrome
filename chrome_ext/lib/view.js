/**
 * Bookie's View objects used to represent pages or parts of page content.
 *
 * @namespace bookie
 * @module view
 *
 */
YUI.add('bookie-view', function (Y) {
    var _ = Y.substitute,
        ns = Y.namespace('bookie');

    /**
     * View control for the options html pane in the extension.
     *
     * @class jptionsView
     * @extends Y.View
     *
     */
    ns.OptionsView = Y.Base.create('bookie-options-view', Y.View, [], {
        /**
         * Setup the options form with data from our model to start out with.
         *
         * @method _init_form
         * @private
         *
         */
        _init_form: function () {
            var opts = this.get('model');

            Y.one('#api_url').set('value', opts.get('api_url'));
            Y.one('#api_username').set('value', opts.get('api_username'));
            Y.one('#api_key').set('value', opts.get('api_key'));

            if (opts.get('cache_content') === 'true') {
                Y.one('#cache_content').set('checked', true);
            } else {
                Y.one('#cache_content').set('checked', false);
            }
        },

        /**
         * Use the API ping to check the settings the user wants to set.
         *
         * @method _ping_server
         * @param {Object} api_cfg For the settings to test our Ping agsinst
         *
         */
        _ping_server: function (opts, callbacks) {
            var api = new Y.bookie.Api.route.Ping({
                url: opts.api_url,
                username: opts.api_username,
                api_key: opts.api_key
            });
            api.call(callbacks);
        },

        /**
         * Display any message based on if the request to change is successful
         * or ended in error.
         *
         * @method _show_message
         * @param {String} msg
         * @param {Boolean} success
         * @private
         *
         */
        _show_message: function (msg, success) {
            var msg_div = Y.one('#options_msg');
            msg_div.setContent(msg);

            if (success) {
                msg_div.replaceClass('error', 'success');
            } else {
                msg_div.replaceClass('success', 'error');
            }

            msg_div.show(true);
        },

        /**
         * Perform a sync of the bookmarks they user has stored by requesting
         * the list of hashes from the API on the server.
         *
         * @method _sync_bookmarks
         * @param {Event} e
         * @private
         *
         */
        _sync_bookmarks: function (e) {
            var opts = this.get('model'),
                api,
                ind = new Y.bookie.Indicator({
                    target: Y.one('#sync')
                });
            ind.render();
            ind.show();

            api = new Y.bookie.Api.route.Sync({
                url: opts.get('api_url'),
                username: opts.get('api_username'),
                api_key: opts.get('api_key')
            });

            // make the api calls
            api.call({
                'success': function (data, request) {
                    Y.Array.each(data.hash_list, function (h) {
                        // write out each hash to localStorage
                        localStorage.setItem(h, 'true');
                    });

                    // finally stop the indicator from spinny spinny
                    ind.hide();
                }
            });
        },

        /**
         * Handle dispatching events for the UI.
         *
         * @attribute events
         * @type Object
         *
         *
         */
        events: {
            // @event #form:submit
            'form#form': {
                'submit': 'update_options'
            },
            '#sync_button': {
                'click': '_sync_bookmarks'
            }
        },

        template: '',

        /**
         * General initializer method.
         *
         * @method initializer
         * @param {Object} cfg
         *
         */
        initializer: function (cfg) {
            this._init_form();
        },

        render: function () {
            // We need to make sure we hit the container so our events get
            // paste the lazy loading stage.
            this.get('container');
        },

        /**
         * Handle updating the options model with our selected information
         * whenthe form is submitted.
         *
         * @method update_options
         * @param {Event} e
         *
         */
        update_options: function (e) {
            var that = this;
            e.preventDefault();
            var msg_div = Y.one('#options_msg'),
                opts = this.get('model'),
                new_opts = {};

            msg_div.hide();

            // fetch the new values from the form and then update our model
            // with them.
            new_opts.api_url = Y.one('#api_url').get('value');
            new_opts.api_username = Y.one('#api_username').get('value');
            new_opts.api_key = Y.one('#api_key').get('value');

            callbacks = {
                success: function (data, response) {
                    // make sure we were successful
                    if (data.success) {
                        opts.set('api_url', Y.one('#api_url').get('value'));
                        opts.set('api_username', Y.one('#api_username').get('value'));
                        opts.set('api_key', Y.one('#api_key').get('value'));

                        if (Y.one('#cache_content').get('checked')) {
                            opts.set('cache_content', 'true');
                        } else {
                            opts.set('cache_content', 'false');
                        }

                        // Set the flag so that it doesn't bug the user
                        // for the configuration every single time.
                        chrome.storage.local.set({
                            "optionsConfigured": true
                        });
                        
                        // Now that we have updated the settings in memory, 
                        // do the same with offline chrome.storage
                        opts.save();
                        that._show_message('Saved your settings...', true);
                    } else {
                        that._show_message('I could not Ping the server with your settings. Server said: ' +
                            data.message, false);
                    }
                },
                error: function (data, status_str, response, args) {
                    that._show_message('I could not Ping the server with your settings. Server said: ' +
                        data.message, false);
                }
            };

            // Let's do all this based on the status of the ping attempt;
            this._ping_server(new_opts, callbacks);
        }
    }, {
        ATTRS: {
            /**
             * @attribute container
             * @default Y.Node the body of the document
             * @type Y.Node
             *
             */
            container: {
                valueFn: function () {
                    return Y.one('body');
                }
            },

            /**
             * @attribute model
             * @default Y.bookie.OptionModel
             * @type Y.bookie.OptionModel
             *
             */
            model: {
                valueFn: function () {
                    return new Y.bookie.OptionsModel();
                }
            }
        }
    });

}, '0.1.0', {
    requires: [
        'base',
        'bookie-api',
        'bookie-indicator',
        'bookie-model',
        'bookie-tagcontrol',
        'substitute',
        'transition',
        'view'
    ]
});
