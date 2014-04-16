/**
 * Javascript implementation of the Bookie API used on the app front end and
 * sample implementation itself.
 *
 * @namespace bookie
 * @module api
 *
 */
YUI.add('bookie-api', function (Y) {
    var ns = Y.namespace('bookie'),
        _ = Y.substitute;

    /**
     * Event to watch for that the API has successfully loaded some data.
     *
     * @method
     * @param {}
     *
     */
    Y.publish('api:loaded', {
        emitFacade: true
    });

    ns.decode_response = function (resp_text) {
        var data;
        try  {
            data = Y.JSON.parse(resp_text);
        } catch (err) {
            // if we failed to parse the JSON then just get the
            // response text and send it along.
            data = {
                success: true,
                message: resp_text
            };
        }

        return data;
    };

    /**
     * We want to wrap our ajax calls through the IO module.
     *
     * This will apply the right callback function provided by the caller,
     * allow callers to use default callbacks, and make sure we parse json
     * back to provide to the caller's callback as data
     *
     */
    ns.request_handler = function (url, cfg, args) {
        // extend with the base handlers for each event we want to use
        // should have cases for complete, success, failure
        // Note: complete fires before both success and failure, not usually
        // the event you want
        var request,
            default_complete = function (id, response, args) {
                var data = ns.decode_response(response.responseText);

                if (args.callbacks.complete !== undefined) {
                    args.callbacks.complete(data, response, args);
                }
            },
            default_success = function (id, response, args) {
                var data = ns.decode_response(response.responseText);
                Y.fire('api:loaded', {
                    url: url,
                    response: response
                });

                // this is a 200 code and the response text should be json
                // data we need to decode and pass to the callback
                if (args.callbacks.success !== undefined) {
                    args.callbacks.success(data, response, args);
                }
            },
            default_failure = function (id, response, args) {
                var data = ns.decode_response(response.responseText),
                    status_str = response.statusText;

                // hand the callback the issue at hand
                if (args.callbacks.error !== undefined) {
                    args.callbacks.error(
                        data,
                        status_str,
                        response,
                        args
                    );
                }
            };

        // bind the callbacks the caller sent us to be used as the callbacks
        // but keep any other args we've already assigned
        cfg.on = {
            complete: default_complete,
            success: default_success,
            failure: default_failure
        };

        // if the request is a POST request, then we need to JSON the data
        // body
        if (cfg.method === "POST") {
            cfg.data = Y.JSON.stringify(cfg.data);
        }

        cfg.arguments = args;
        Y.io(url, cfg);
    };

    /**
     * Base Api object that sets headers and such for all other extending Api
     * requests.
     *
     * @class Api
     * @extends Y.Base
     *
     */
    Y.bookie.Api = Y.Base.create('bookie-api', Y.Base, [], {
        base_cfg: {
            method: "GET",
            data: {},
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            on: {
                start: function () {},
                complete: function () {},
                end: function () {}
            },
            args: {}
        },

        /**
         * General constructor
         * @method initializer
         * @constructor
         *
         */
        initializer : function (cfg) {},

        /**
         * Generate a full api url to call
         *
         * If user_username is true then perform a replace on the given url
         * with the api instance's username parameter
         *
         * @method build_url
         * @param {Object} [data] set of request data to be sent along with
         *     the api request
         * @return {String} url
         *
         *
         */
        build_url: function (data) {
            var resource = this.get('resource');

            // make sure the username is in the config as well
            if (Y.Lang.isObject(data)) {
                data.username = this.get('username');
                if (resource) {
                    data.resource = resource;
                }
            } else {
                data = {};
                data.username = this.get('username');
                if (resource) {
                    data.resource = resource;
                }
            }

            return this.get('url') +
                Y.substitute(this.get('url_element'), data);
        },

        /**
         * The cfg passed to the IO module needs to be combined with the
         * default data set and then any options passed in from the caller
         *
         * Order is passed in options -> base_cfg
         *
         * @method build_cfg
         * @return {Object} config
         *
         */
        build_cfg: function () {
            // first build the base config with the routes config
            // this updates things like GET vs POST and such
            var call_cfg = this.get('options'),
                base_cfg = this.base_cfg,
                base_data = this.data;

            // mix them over each other, not sure this works for nested bits
            // though, for instance base_cfg might have cfg.data.query_param
            // that needs to be kept as we overlay it with the other settings
            // same with the callbacks and such
            base_cfg = Y.merge(base_cfg, call_cfg);

            // next update with the routes info and other hard coded request
            // data
            base_cfg.data = Y.merge(base_cfg.data, base_data, call_cfg.data);

            // if we have an api key, then we need to pass that along as well
            if (this.get('api_key').length > 2) {
                if (base_cfg.data) {
                    base_cfg.data.api_key = this.get('api_key');
                } else {
                    base_cfg.data = {
                        api_key: this.get('api_key')
                    };
                }
            }

            return base_cfg;
        },

        /**
         * Actually make the ajax call with the given cfg we've setup for use.
         *
         * The callbacks passed are then sent through to be called upon the
         * ajax return.
         *
         * @method call
         * @param {Object} callbacks an object of success/error/complete callbacks
         *     we'll hand json decoded data of the response.
         *
         */
        call: function (callbacks) {
            // make sure we stick the callbacks on args in the base cfg
            // before we build the rest of it
            var args = this.base_cfg.args,
                cfg = this.build_cfg();

            args.callbacks = callbacks;
            ns.request_handler(this.build_url(cfg.data),
                            cfg,
                            args);
        }
    }, {
        ATTRS: {
            /**
             * @attribute api_key
             * @default ""
             * @type String
             *
             */
            api_key: {
                value: ""
            },

            /**
             * @attribute api_key
             * @default {}
             * @type Object
             *
             */
            options: {
                value: {}
            },

            /**
             *
             * @attribute url
             * @default ""
             * @type String
             * @writeOnce
             *
             */
            url: {
                value: "",
                writeOnce: true
            },

            /**
             * @attribute username
             * @default ""
             * @type String
             *
             */
            username: {
                value: ""
            }
        }
    });


    /**
     * A base class used for all future API calls to be based off of.
     *
     * @class Api.route
     * @extends Api
     *
     */
    Y.bookie.Api.route = Y.Base.create(
        'bookie-api-route',
        Y.bookie.Api,
        [],
        {
            data: {},

            /**
             * @method initializer
             * @constructor
             * @param {object} cfg
             *
             */
            initializer: function (cfg) {}
        },
        {
            ATTRS: {
                /**
                 * The specific part of the API url this call is for.
                 *
                 * @attribute url_element
                 * @default ""
                 * @type String
                 *
                 */
                url_element: {
                    value: ''
                }
            }
        }
    );

    /**
     * Perform an API request to the server and request the hash ids of all
     * the bookmarks a user has bookmarked.
     *
     * @class Api.route.Sync
     * @extends Api.route
     *
     */
    Y.bookie.Api.route.Sync = Y.Base.create(
        'bookie-api-route-sync',
        Y.bookie.Api.route,
        [],
        {

        }, {
            ATTRS: {
                url_element: {
                    value: '/{username}/extension/sync'
                }
            }
        }
    );

    /**
     * Fetch a list of suggested tags based on stub string.
     *
     * @class Api.route.TagComplete
     * @extends Api.route
     *
     */
    Y.bookie.Api.route.TagComplete = Y.Base.create(
        'bookie-api-route-tagcomplete',
        Y.bookie.Api.route,
        [], {
            /**
             * Perform the actual ajax request.
             *
             * @method call
             * @param {Object} callbacks
             * @param {String} tag_stub
             * @param {Array} current_tags a list of tags to help limit our
             *     completion options.
             *
             */
            call: function (callbacks, tag_stub, current_tags) {
                this.set('options', {
                    data: {
                        tag: tag_stub,
                        current: current_tags
                    }
                });
                Y.bookie.Api.route.TagComplete.superclass.call.apply(this, arguments);
            }
        }, {
            ATTRS: {
                url_element: {
                    value: '/{username}/tags/complete'
                }
            }
        }
    );

    /**
     * API call to fetch a bookmark object.
     *
     * Since it must have been bookmarked by someone, and the hash belongs to
     * them, you need the user and the hash_id of the bookmark to load it.
     *
     * This is NOT the username of a logged in/api user. It's the username of
     * the person that bookmarked the url
     *
     * @class Api.route.Bmark
     * @extends Api.route
     *
     */
    Y.bookie.Api.route.Bmark = Y.Base.create(
        'bookie-api-route-bmark',
        Y.bookie.Api.route,
        [], {
            initializer: function (cfg) {
                this.data = {
                    hash_id: this.get('hash_id'),
                    username: this.get('username'),
                    last_bmark: this.get('last_bmark'),
                    url: cfg.tab_url,
                    description: cfg.tab_title
                };
            }
        }, {
            ATTRS: {
                /**
                 * @attribute hash_id
                 * @default undefined
                 * @required
                 * @type String
                 *
                 */
                hash_id: {
                    required: true
                },

                /**
                 * @attribute url_element
                 * @default '/{username}/bmark/{hash_id}
                 * @type String
                 *
                 */
                url_element: {
                    value: '/{username}/bmark/{hash_id}'
                },

                /**
                 * @attribute username
                 * @default undefined
                 * @required
                 * @type String
                 *
                 */
                username: {
                    required: true
                },

                /**
                 * If we want, we can set this to true to get the tags from
                 * our last bookmark as something of a suggestion for the
                 * current.
                 *
                 * @attribute last_bmark
                 * @default true
                 * @type Boolean
                 *
                 */
                last_bmark: {
                    value: false
                },

                /**
                 * We suggest tags based on the title of the page
                 * If the page has no title , url will be sent in
                 * place of title.
                 *
                 * @attribute description
                 * @default undefined
                 * @required
                 * @type String
                 *
                 */
                description: {
                    required: true
                },

                /**
                 * We suggest tags based on the url of the page
                 *
                 * @attribute description
                 * @default undefined
                 * @required
                 * @type String
                 *
                 */
                url: {
                    required: true
                }
            }
        }
    );


    /**
     * Remove a specified Bookmark from the system.
     *
     * This call is only allowed to be called by the owner of the Bookmark.
     *
     * @class Api.route.UserBmarkDelete
     * @extends Api.route
     *
     */
    Y.bookie.Api.route.UserBmarkDelete = Y.Base.create(
        'bookie-api-route-user-bmark-delete',
        Y.bookie.Api.route,
        [], {
            initializer: function (cfg) {
                // force this to a DELETE request by overriding our base_cfg
                // we extend.
                this.base_cfg.method = 'DELETE';

                // we have to have a hash_id for our url to be built from
                this.data = {
                    hash_id: this.get('hash_id')
                };
            }
        }, {
            ATTRS: {
                url_element: {
                    value: '/{username}/bmark/{hash_id}'
                },

                /**
                 * @attribute hash_id
                 * @default undefined
                 * @type String
                 * @required
                 *
                 */
                hash_id: {
                    required: true
                }
            }
        }
    );

    /**
     * Store the specified bookmark.
     *
     * This call is only allowed to be called by the owner of the Bookmark.
     *
     * @class Api.route.UserBmarkSave
     * @extends Api.route
     *
     */
    Y.bookie.Api.route.UserBmarkSave = Y.Base.create(
        'bookie-api-route-user-bmark-save',
        Y.bookie.Api.route,
        [], {
            initializer: function (cfg) {
                // force this to a POST request by overriding our base_cfg
                // we extend.
                this.base_cfg.method = 'POST';
                this.data = this.get('model');
            }
        }, {
            ATTRS: {
                url_element: {
                    value: '/{username}/bmark'
                },

                /**
                 * The model is the object of data for the bookmark we want to
                 * store. This would be the things like url, decsription, etc.
                 * See the docs for the fields the model will accept. Other
                 * fields will be ignored.
                 *
                 * @attribute model
                 * @default undefined
                 * @type Object
                 * @required
                 *
                 */
                model: {
                    required: true
                }
            }
        }
    );

    /**
     * Hook into the ping event and make sure we can hit the server.
     *
     * @class Api.route.Ping
     * @extends Api.route
     *
     */
    Y.bookie.Api.route.Ping = Y.Base.create(
        'bookie-api-route-ping',
        Y.bookie.Api.route,
        [], {
            initializer: function (cfg) {
            }
        }, {
            ATTRS: {
                url_element: {
                    value: '/{username}/ping'
                }
            }
        }
    );

}, '0.1.0', {
    requires: [
        'base',
        'io',
        'io-xdr',
        'json',
        'querystring-stringify-simple',
        'substitute'
    ]
});
