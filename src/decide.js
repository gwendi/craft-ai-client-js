import _ from 'lodash';
import parse from './parse';
import context from './context';

let operators = {
  'continuous.equal'              : (context, value) => context  * 1 === value,
  'enum.equal'                    : (context, value) => context === value,
  'continuous.greaterthan'        : (context, value) => context * 1 > value,
  'continuous.greaterthanorequal' : (context, value) => context * 1 >= value,
  'continuous.lessthan'           : (context, value) => context * 1 < value,
  'continuous.lessthanorequal'    : (context, value) => context * 1 <= value
};

function decideRecursion( node, context ) {
  // Leaf
  if ( _.isUndefined( node.predicate_property )) {
    return {
      value: node.value,
      confidence: node.confidence || 0,
      predicates: []
    };
  }

  // Regular node
  const property = node.predicate_property;
  if ( _.isUndefined(context[property]) ) {
    throw new Error( `Unable to take decision, property "${property}" is not defined in the given context.` );
  }

  const propertyValue = context[property];

  const matchingChild = _.find(
    node.children,
    child => operators[child.predicate.op](propertyValue, child.predicate.value));

  if (_.isUndefined(matchingChild)) {
    throw new Error( 'Unable to take decision, no matching child found.' );
  }

  // matching child found: recurse !
  const result = decideRecursion( matchingChild, context );
  return {
    value: result.value,
    confidence: result.confidence,
    predicates: [{
      property: property,
      op: matchingChild.predicate.op,
      value: matchingChild.predicate.value
    }].concat(result.predicates)
  };
}

export default function decide( json, ...args ) {
  const { tree, configuration } = parse(json);
  const ctx = configuration ? context(configuration, ...args) : _.extend({}, ...args);
  const rawDecision = decideRecursion(tree, ctx);
  const outputName = (configuration && configuration.output) ? configuration.output[0] : 'value';
  let decision = {};
  decision.decision = {};
  decision.decision[outputName] = rawDecision.value;
  decision.confidence = rawDecision.confidence;
  decision.predicates = rawDecision.predicates;
  decision.context = ctx;
  return decision;
}
