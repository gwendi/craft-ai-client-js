import _ from 'lodash';
import parse from './parse';
import context from './context';
import { CraftAiDecisionError, CraftAiUnknownError } from './errors';

const OPERATORS = {
  'is'    : (context, value) => context === value,
  '>='    : (context, value) => context * 1 >= value,
  '<'     : (context, value) => context * 1 < value,
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

const TIMEZONE_REGEX = /[+-]\d\d:\d\d/gi; // +00:00 -00:00

const VALUE_VALIDATOR = {
  continuous: value => _.isFinite(value),
  enum: value => _.isString(value),
  timezone: value => _.isString(value) && value.match(TIMEZONE_REGEX),
  time_of_day: value => _.isFinite(value) && value >= 0 && value < 24,
  day_of_week: value => _.isInteger(value)  && value >= 1 && value <= 7,
  day_of_month: value => _.isInteger(value)  && value >= 1 && value <= 31,
  month_of_year: value => _.isInteger(value)  && value >= 1 && value <= 12
};

function decideRecursion(node, context) {
  // Leaf
  if (!(node.children && node.children.length)) {
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
      if ( _.isUndefined(context[property]) ) {
        // Should not happen
        throw new CraftAiUnknownError({
          message: `Unable to take decision, property '${property}' is missing from the given context.`
        });
      }

      return OPERATORS[decision_rule.operator](context[property], decision_rule.operand);
    }
  );

  if (_.isUndefined(matchingChild)) {
    // Should only happens when an unexpected value for an enum is encountered
    const operandList = _.uniq(_.map(_.values(node.children), child => child.decision_rule.operand));
    const property = _.head(node.children).decision_rule.property;
    throw new CraftAiDecisionError({
      message: `Unable to take decision: '${context[property]}' not found amongst values for the '${property}' property.`,
      metadata: {
        property: property,
        value: context[property],
        expectedValues: operandList
      }
    });
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

function checkContext(configuration) {
  // Extract the required properties (i.e. those that are not the output)
  const expectedProperties = _.difference(
    _.keys(configuration.context),
    configuration.output
  );

  // Build a context validator
  const validators = _.map(expectedProperties, property => ({
    property,
    type: configuration.context[property].type,
    validator: VALUE_VALIDATOR[configuration.context[property].type]
  }));

  return context => {
    const { badProperties, missingProperties } = _.reduce(
      validators,
      ({ badProperties, missingProperties }, { property, type, validator }) => {
        const value = context[property];
        if (value === undefined) {
          missingProperties.push(property);
        }
        else if (!validator(value)) {
          badProperties.push({ property, type, value });
        }
        return { badProperties, missingProperties };
      },
      { badProperties: [], missingProperties:[] }
    );

    if (missingProperties.length || badProperties.length) {
      const messages = _.concat(
        _.map(missingProperties, property => `expected property '${property}' is not defined`),
        _.map(badProperties, ({ property, type, value }) => `'${value}' is not a valid value for property '${property}' of type '${type}'`)
      );
      throw new CraftAiDecisionError({
        message: `Unable to take decision, the given context is not valid: ${messages.join(', ')}.`,
        metadata: { missingProperties, badProperties }
      });
    }
  };
}

export default function decide( json, ...args ) {
  const { _version, trees, configuration } = parse(json);
  const ctx = configuration ? context(configuration, ...args) : _.extend({}, ...args);
  checkContext(configuration)(ctx);
  return {
    _version: _version,
    context: ctx,
    output: _.assign(..._.map(configuration.output, (output) => ({
      [output]: decideRecursion(trees[output], ctx)
    })))
  };
}
