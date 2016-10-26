import _ from 'lodash';
import semver from 'semver';

export default function parse( input ) {
  const json = _.isObject(input) ? input : JSON.parse(input);
  if ( !_.isArray( json ) ) {
    throw new Error('Invalid decision tree format, the given json is not an array.');
  }
  if ( _.isUndefined( json[0] ) || _.isUndefined( json[0].version )) {
    throw new Error('Invalid decision tree format, unable to find the version informations.');
  }

  const version = json[0].version;
  if (!semver.valid(version)) {
    throw new Error(`Invalid decision tree format, "${version}" is not a valid version.`);
  }
  else if (semver.satisfies(version, '0.0.1')) {
    if (_.isUndefined( json[1] )) {
      throw new Error('Invalid decision tree format, no tree found.');
    }
    return {
      tree: json[1]
    };
  }
  else if (semver.satisfies(version, '0.0.2')) {
    if (_.isUndefined( json[1] ) || _.isUndefined( json[1].model )) {
      throw new Error('Invalid decision tree format, no model found.');
    }
    if (_.isUndefined( json[2] )) {
      throw new Error('Invalid decision tree format, no tree found.');
    }
    return {
      configuration: json[1].model,
      tree: json[2]
    };
  }
  else if (semver.satisfies(version, '0.0.3')) {
    if (_.isUndefined( json[1] )) {
      throw new Error('Invalid decision tree format, no configuration found.');
    }
    if (_.isUndefined( json[2] )) {
      throw new Error('Invalid decision tree format, no tree found.');
    }
    return {
      configuration: json[1],
      tree: json[2]
    };
  }
  else {
    throw new Error(`Invalid decision tree format, "${version}" is not a supported version.`);
  }
}
