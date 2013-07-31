var _ = require('../../../lib/alloy/underscore')._,
	U = require('../../../utils'),
	tiapp = require('../../../tiapp'),
	CU = require('../compilerUtils'),
	styler = require('../styler');

// does the current TiSDK for the platform properly support the "tabs" property
var platform = CU.getCompilerConfig().alloyConfig.platform;
var SUPPORTS_TABS = platform === 'ios' ||
	(platform !== 'blackberry' && tiapp.version.gte('3.1.0'));

exports.parse = function(node, state) {
	return require('./base').parse(node, state, parse);
};

function parse(node, state, args) {
	var code = '',
		tabArray, groupState;

	if (!SUPPORTS_TABS) {
		groupState = require('./default').parse(node, state);
		code += groupState.code;
	}

	_.each(U.XML.getElementsFromNodes(node.childNodes), function(child) {
		var theNode = CU.validateNodeName(child, ['Ti.UI.Tab','Ti.Android.Menu']);
		if (theNode) {
			var ext = { parent: {} };
			if (theNode === 'Ti.UI.Tab') {
				// create the tab array
				if (SUPPORTS_TABS && !tabArray) {
					tabArray = CU.generateUniqueId();
					code += 'var ' + tabArray + '=[];';
				}

				// render the code for adding the tab to the array
				ext.post = function(node, state, args) {
					if (SUPPORTS_TABS) {
						return tabArray + '.push(' + state.parent.symbol + ');';
					} else {
						return groupState.parent.symbol + '.addTab(' + state.parent.symbol + ');';
					}
				};
			} else if (theNode === 'Ti.Android.Menu') {
				ext.parent.symbol = args.symbol;
			}
			code += CU.generateNodeExtended(child, state, ext);
		} else {
			U.die([
				'Invalid <TabGroup> child type: ' + CU.getNodeFullname(child),
				'All <TabGroup> children must be <Tab> or <Menu>'
			]);
		}
	});

	if (SUPPORTS_TABS) {
		// attach all created tabs in one shot as the "tabs" property
		var extras = [];
		if (tabArray) { extras.push(['tabs', tabArray]); }
		if (extras.length) { state.extraStyle = styler.createVariableStyle(extras); }

		// Create the TabGroup itself
		groupState = require('./default').parse(node, state);
		code += groupState.code;
	}

	// Update the parsing state
	return {
		parent: {},
		styles: state.styles,
		code: code
	};
}