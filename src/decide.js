import _ from 'lodash';
import parse from './parse';
import context from './context';

let operators = {
  'is'    : (context, value) => context === value,
  '='     : (context, value) => context * 1 === value,
  '>'     : (context, value) => context * 1 > value,
  '>='    : (context, value) => context * 1 >= value,
  '<'     : (context, value) => context * 1 < value,
  '<='    : (context, value) => context * 1 <= value,
  '[in['  : (context, value) => {
    let context_val = context * 1;
    let from = value[0];
    let to = value[1];
    //the interval is not looping
    if (from < to) {
      return (context_val >= from && context_val < to);
    }
    //the interval IS looping
    else {
      return (context_val >= from || context_val < to);
    }
  }
};

function decideRecursion(node, context) {
  // Leaf
  if (node.predicted_value) {
    let leafNode = {
      predicted_value: node.predicted_value,
      confidence: node.confidence || 0,
      decision_rules: []
    };

    if (node.standard_deviation) {
      leafNode.standard_deviation = node.standard_deviation;
    }

    return leafNode;
  }

  // Regular node
  const matchingChild = _.find(
    node.children,
    (child) => {
      const decision_rule = child.decision_rule;
      const property = decision_rule.property;
      if (_.isUndefined(context[property])) {
        throw new Error( `Unable to take decision, property "${property}" is not defined in the given context.` );
      }

      return operators[decision_rule.operator](context[property], decision_rule.operand);
    }
  );

  if (_.isUndefined(matchingChild)) {
    throw new Error( 'Unable to take decision, no matching child found.' );
  }

  // matching child found: recurse !
  const result = decideRecursion(matchingChild, context);

  let finalResult = {
    predicted_value: result.predicted_value,
    confidence: result.confidence,
    decision_rules: [matchingChild.decision_rule].concat(result.decision_rules)
  };

  if (result.standard_deviation) {
    finalResult.standard_deviation = result.standard_deviation;
  }

  return finalResult;
}

export default function decide( json, ...args ) {
  const { _version, trees, configuration } = parse(json);
  const ctx = configuration ? context(configuration, ...args) : _.extend({}, ...args);
  return {
    _version: _version,
    context: ctx,
    output: _.assign(..._.map(configuration.output, (output) => ({
      [output]: decideRecursion(trees[output], ctx)
    })))
  };
}
