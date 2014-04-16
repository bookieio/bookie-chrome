# Makefile for building the YUI css, js and preparing tests
WD := $(shell pwd)
PY := bin/python
YUI := yui_3.11.0.zip
JSTESTURL = http://127.0.0.1:9000/tests

CHROME = /usr/bin/google-chrome
CHROME_EXT_PATH = $(WD)/chrome_ext
CHROME_LIB = $(CHROME_EXT_PATH)/lib
CHROME_KEY = /home/rharding/.ssh/chrome_ext.pem
CHROME_FILESERVE = /home/bmark.us/www/bookie_chrome.crx
CHROME_DEV_FILE = $(WD)/chrome_ext.zip
S3 := s3cp.py --bucket files.bmark.us --public

chrome_css:  $(CHROME_LIB)
	wget "https://bmark.us/combo?y/cssreset/reset-min.css&y/cssfonts/cssfonts-min.css&y/cssgrids/cssgrids-min.css&y/cssbase/cssbase-min.css&y/widget-base/assets/skins/sam/widget-base.css&y/autocomplete-list/assets/skins/sam/autocomplete-list.css" -O $(CHROME_LIB)/combo.css
clean_css:
	rm $(CHROME_LIB)/*.css || true

.PHONY: clean
clean: clean_css

.PHONY: clean_all
clean_all: clean_css clean_chrome

# CHROME
#
# Helpers for dealing with the Chrome extension such as building the
# extension, copying it up to files.bmark.us, and such.

.PHONY: chrome_ext
chrome: clean_chrome chrome_css chrome_combo
	$(CHROME) --pack-extension=$(CHROME_EXT_PATH) --pack-extension-key=$(CHROME_KEY)
	cd $(CHROME_EXT_PATH) && zip -r $(CHROME_DEV_FILE) .

chrome_combo:
	wget "https://bmark.us/4006/combo?y/yui/yui-min.js&y/loader/loader-min.js&y/substitute/substitute-min.js&b/meta.js&y/attribute-core/attribute-core-min.js&y/base-core/base-core-min.js&y/oop/oop-min.js&y/event-custom-base/event-custom-base-min.js&y/event-custom-complex/event-custom-complex-min.js&y/attribute-events/attribute-events-min.js&y/attribute-extras/attribute-extras-min.js&y/attribute-base/attribute-base-min.js&y/attribute-complex/attribute-complex-min.js&y/base-base/base-base-min.js&y/pluginhost-base/pluginhost-base-min.js&y/pluginhost-config/pluginhost-config-min.js&y/base-pluginhost/base-pluginhost-min.js&y/base-build/base-build-min.js&y/querystring-stringify-simple/querystring-stringify-simple-min.js&y/io-base/io-base-min.js&y/datatype-xml-parse/datatype-xml-parse-min.js&y/io-xdr/io-xdr-min.js&y/dom-core/dom-core-min.js&y/dom-base/dom-base-min.js&y/selector-native/selector-native-min.js&y/selector/selector-min.js&y/node-core/node-core-min.js&y/node-base/node-base-min.js&y/event-base/event-base-min.js&y/io-form/io-form-min.js&y/io-upload-iframe/io-upload-iframe-min.js&y/queue-promote/queue-promote-min.js&y/io-queue/io-queue-min.js&y/json-parse/json-parse-min.js&y/json-stringify/json-stringify-min.js&y/history-base/history-base-min.js&y/event-synthetic/event-synthetic-min.js&y/history-html5/history-html5-min.js&y/history-hash/history-hash-min.js&y/history-hash-ie/history-hash-ie-min.js&y/array-extras/array-extras-min.js&y/querystring-parse/querystring-parse-min.js&y/querystring-stringify/querystring-stringify-min.js" -O $(CHROME_LIB)/combo1.js
	wget "https://bmark.us/4006/combo?y/handlebars-compiler/handlebars-compiler-min.js&y/transition/transition-min.js&y/escape/escape-min.js&y/model/model-min.js&y/array-invoke/array-invoke-min.js&y/arraylist/arraylist-min.js&y/model-list/model-list-min.js&y/intl/intl-min.js&y/event-focus/event-focus-min.js&y/event-valuechange/event-valuechange-min.js&y/autocomplete-base/autocomplete-base-min.js&y/autocomplete-sources/autocomplete-sources-min.js&y/autocomplete-list/lang/autocomplete-list_en.js&y/event-resize/event-resize-min.js&y/dom-style/dom-style-min.js&y/dom-screen/dom-screen-min.js&y/node-screen/node-screen-min.js&y/selector-css2/selector-css2-min.js&y/selector-css3/selector-css3-min.js&y/node-style/node-style-min.js&y/node-pluginhost/node-pluginhost-min.js&y/shim-plugin/shim-plugin-min.js&y/classnamemanager/classnamemanager-min.js&y/widget-base/widget-base-min.js&y/widget-htmlparser/widget-htmlparser-min.js&y/event-delegate/event-delegate-min.js&y/node-event-delegate/node-event-delegate-min.js&y/widget-uievents/widget-uievents-min.js&y/widget-skin/widget-skin-min.js&y/widget-position/widget-position-min.js&y/widget-position-align/widget-position-align-min.js&y/autocomplete-list/autocomplete-list-min.js&y/autocomplete-list-keys/autocomplete-list-keys-min.js&y/autocomplete-plugin/autocomplete-plugin-min.js&y/text-data-wordbreak/text-data-wordbreak-min.js&y/text-wordbreak/text-wordbreak-min.js&y/highlight-base/highlight-base-min.js&y/autocomplete-highlighters/autocomplete-highlighters-min.js&y/handlebars-base/handlebars-base-min.js&y/view/view-min.js" -O $(CHROME_LIB)/combo2.js

chrome_upload: chrome
	cd $(EXTENSION) && $(S3) chrome_ext.crx

.PHONY: clean_chrome
clean_chrome:
	if [ -f $(CHROME_DEV_FILE) ]; then \
		rm $(CHROME_DEV_FILE); \
	fi

# TESTS
#
# Tools for running javascript tests

# .PHONY: jstestserver
# jstestserver:
# 	cd lib/ && "$(WD)/$(PY)" -m SimpleHTTPServer 9000
# .PHONY: jstest
# jstest: test_api test_history test_model test_view test_indicator test_tagcontrol
# .PHONY: jstest_index
# jstest_index:
# 	xdg-open http://127.0.0.1:6543/tests/index
# .PHONY: test_api
# test_api:
# 	xdg-open $(JSTESTURL)/test_api.html
# .PHONY: test_history
# test_history:
# 	xdg-open $(JSTESTURL)/test_history.html
# .PHONY: test_indicator
# test_indicator:
# 	xdg-open $(JSTESTURL)/test_indicator.html
# .PHONY: test_model
# test_model:
# 	xdg-open $(JSTESTURL)/test_model.html
# .PHONY: test_readable
# test_readable:
# 	xdg-open $(JSTESTURL)/test_readable.html
# .PHONY: test_tagcontrol
# test_tagcontrol:
# 	xdg-open $(JSTESTURL)/test_tagcontrol.html
# .PHONY: test_view
# test_view:
# 	xdg-open $(JSTESTURL)/test_view.html

# bookie/static/js/tests/jstpl.html: bookie/templates/jstpl.mako
# 	cp bookie/templates/jstpl.mako bookie/static/js/tests/jstpl.html
