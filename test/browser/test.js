require('./helper');

// require('../test_interpreterSuite'); // Not suitable for browser
require('../test_addAgentContextOperations');
require('../test_computeAgentDecision');
require('../test_context');
require('../test_createAgent');
require('../test_createClient');
require('../test_errors');
require('../test_getAgent');
require('../test_getAgentDecisionTree');
require('../test_getSharedAgentInspectorUrl');
require('../test_time');

if (window.initMochaPhantomJS) {
  window.initMochaPhantomJS();
}
