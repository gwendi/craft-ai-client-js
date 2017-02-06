import _ from 'lodash';
import * as errors from './errors';
import Debug from 'debug';
import decide from './decide';
import DEFAULTS from './defaults';
import request from './request';
import Time from './time';

let debug = Debug('craft-ai:client');

export default function createClient(cfg) {
  cfg = _.defaults(_.clone(cfg), DEFAULTS);

  // Initialization check
  if (!_.has(cfg, 'token') || !_.isString(cfg.token)) {
    return Promise.reject(new errors.CraftAiBadRequestError('Bad Request, unable to create a client with no or invalid token provided.'));
  }
  if (!_.has(cfg, 'url') || !_.isString(cfg.url)) {
    return Promise.reject(new errors.CraftAiBadRequestError('Bad Request, unable to create a client with no or invalid url provided.'));
  }
  if (!_.has(cfg, 'owner') || !_.isString(cfg.owner)) {
    return Promise.reject(new errors.CraftAiBadRequestError('Bad Request, unable to create a client with no or invalid owner provided.'));
  }

  // The cache of operations to send.
  let agentsOperations = {};

  // The promise that actually flush the context operations for one agent.
  let flushAgentContextOperationsPromise = agentId => {
    // Extract the operations to flush
    const operationsToFlush = agentsOperations[agentId] || [];
    agentsOperations[agentId] = [];

    if (operationsToFlush.length === 0) {
      // Nothing to flush
      return new Promise(resolve => resolve());
    }
    else {
      // Something to flush, in chunks !
      return _(operationsToFlush)
      .orderBy('timestamp')
      .chunk(cfg.operationsChunksSize)
      .reduce((p, chunk) => p.then(
          () => request({
            method: 'POST',
            path: '/agents/' + agentId + '/context',
            body: chunk
          }, cfg)
        ),
        new Promise(resolve => resolve())
      )
      .then(() => {
        debug(`Successfully added ${operationsToFlush.length} operations to the agent ${cfg.owner}/${agentId} context.`);
      });
    }
  };

  // This is the only flush operation that will occur in this client, ever.
  let currentFlushOperation = new Promise(resolve => resolve());

  // To execute when an immediate flush is needed.
  let flushAgentContextOperations = agentId => {
    currentFlushOperation = currentFlushOperation
      .then(() => flushAgentContextOperationsPromise(agentId));
    return currentFlushOperation
      .catch(err => {
        // If an error is caught during this immediate flush, we break the
        // Promise chain to avoid 'contaminating' future flush operations.
        currentFlushOperation = new Promise(resolve => resolve());
        return Promise.reject(err);
      });
  };

  // To execute when an eventual flush is needed.
  let throttledFlushAgentContextOperations = _.throttle(
    agentId => {
      currentFlushOperation = currentFlushOperation
        .then(() => flushAgentContextOperationsPromise(agentId));
      return currentFlushOperation;
    },
    cfg.operationsAdditionWait * 1000,
    {
      leading: true
    }
  );

  // 'Public' attributes & methods
  let instance = _.defaults(_.clone(cfg), DEFAULTS, {
    cfg: cfg,
    createAgent: function(configuration, id = undefined) {
      if (_.isUndefined(configuration) || !_.isObject(configuration)) {
        return Promise.reject(new errors.CraftAiBadRequestError('Bad Request, unable to create an agent with no or invalid configuration provided.'));
      }

      return request({
        method: 'POST',
        path: '/agents',
        body: {
          id: id,
          configuration: configuration
        }
      }, this)
      .then(agent => {
        debug(`Agent '${agent.id}' created.`);
        return agent;
      });
    },
    getAgent: function(agentId) {
      if (_.isUndefined(agentId)) {
        return Promise.reject(new errors.CraftAiBadRequestError('Bad Request, unable to get the agent with no agentId provided.'));
      }

      return flushAgentContextOperations(agentId)
      .then(() => request({
        method: 'GET',
        path: '/agents/' + agentId
      }, this));
    },
    listAgents: function(agentId) {
      return request({
        method: 'GET',
        path: '/agents'
      }, this)
      .then(result => result.agentsList);
    },
    deleteAgent: function(agentId) {
      if (_.isUndefined(agentId)) {
        return Promise.reject(new errors.CraftAiBadRequestError('Bad Request, unable to delete an agent with no agentId provided.'));
      }

      agentsOperations[agentId] = [];

      return request({
        method: 'DELETE',
        path: '/agents/' + agentId
      }, this)
      .then(agent => {
        debug(`Agent '${agentId}' deleted`);
        return agent;
      });
    },
    destroyAgent: function(agentId) {
      if (_.isUndefined(agentId)) {
        return Promise.reject(new errors.CraftAiBadRequestError('Bad Request, unable to delete an agent with no agentId provided.'));
      }

      agentsOperations[agentId] = [];

      return request({
        method: 'DELETE',
        path: '/agents/' + agentId
      }, this)
      .then(agent => {
        debug('This function is deprecated. It will be removed in the future, use \'deleteAgent\' instead.');
        debug(`Agent '${agentId}' deleted`);
        return agent;
      });
    },
    getAgentContext: function(agentId, t = undefined) {
      if (_.isUndefined(agentId)) {
        return Promise.reject(new errors.CraftAiBadRequestError('Bad Request, unable to get the agent context with no agentId provided.'));
      }
      let posixTimestamp = Time(t).timestamp;
      if (_.isUndefined(posixTimestamp)) {
        return Promise.reject(new errors.CraftAiBadRequestError('Bad Request, unable to get the agent context with an invalid timestamp provided.'));
      }

      return flushAgentContextOperations(agentId)
      .then(() => request({
        method: 'GET',
        path: '/agents/' + agentId + '/context/state',
        query: {
          t: posixTimestamp
        }
      }, this));
    },
    addAgentContextOperations: function(agentId, operations, flush = false) {
      if (_.isUndefined(agentId)) {
        return Promise.reject(new errors.CraftAiBadRequestError('Bad Request, unable to add agent context operations with no agentId provided.'));
      }
      if (!_.isArray(operations)) {
        // Only one given operation
        operations = [operations];
      }
      _.remove(operations, _.isUndefined);
      if (_.size(operations) == 0) {
        return Promise.reject(new errors.CraftAiBadRequestError('Bad Request, unable to add agent context operations with no or invalid operations provided.'));
      }

      agentsOperations[agentId] = (agentsOperations[agentId] || []).concat(
        _.map(operations, o => _.extend(o, {
          timestamp: Time(o.timestamp).timestamp
        }))
      );
      if (flush) {
        return flushAgentContextOperations(agentId);
      }
      else {
        throttledFlushAgentContextOperations(agentId);
        return new Promise(resolve => resolve());
      }
    },
    getAgentContextOperations: function(agentId) {
      if (_.isUndefined(agentId)) {
        return Promise.reject(new errors.CraftAiBadRequestError('Bad Request, unable to get agent context operations with no agentId provided.'));
      }

      return flushAgentContextOperations(agentId)
      .then(() => request({
        method: 'GET',
        path: '/agents/' + agentId + '/context'
      }, this));
    },
    getAgentInspectorUrl: function(agentId, t = undefined) {
      if (_.isUndefined(agentId)) {
        return Promise.reject(new errors.CraftAiBadRequestError('Bad Request, unable to get the agent public inspector url beause agentId isn\'t provided.'));
      }
      if (_.isUndefined(t)) {
        return Promise.resolve(`${cfg.url}/public/inspector?token=${cfg.token}&owner=${cfg.owner}&agent=${agentId}`);
      }
      else {
        let posixTimestamp = Time(t).timestamp;
        if (_.isUndefined(posixTimestamp)) {
          return Promise.reject(new errors.CraftAiBadRequestError('Bad Request, unable to get the agent public inspector url with no or invalid timestamp provided.'));
        }
        return Promise.resolve(`${cfg.url}/public/inspector?token=${cfg.token}&owner=${cfg.owner}&agent=${agentId}&timestamp=${posixTimestamp}`);
      }
    },
    getAgentDecisionTree: function(agentId, t = undefined) {
      if (_.isUndefined(agentId)) {
        return Promise.reject(new errors.CraftAiBadRequestError('Bad Request, unable to retrieve an agent decision tree with no agentId provided.'));
      }
      let posixTimestamp = Time(t).timestamp;
      if (_.isUndefined(posixTimestamp)) {
        return Promise.reject(new errors.CraftAiBadRequestError('Bad Request, unable to retrieve an agent decision tree with an invalid timestamp provided.'));
      }

      return flushAgentContextOperations(agentId)
      .then(() => request({
        method: 'GET',
        path: '/agents/' + agentId + '/decision/tree',
        query: {
          t: posixTimestamp
        }
      }, this));
    },
    computeAgentDecision: function(agentId, t, ...contexts) {
      if (_.isUndefined(agentId)) {
        return Promise.reject(new errors.CraftAiBadRequestError('Bad Request, unable to compute an agent decision with no agentId provided.'));
      }
      let posixTimestamp = Time(t).timestamp;
      if (_.isUndefined(posixTimestamp)) {
        return Promise.reject(new errors.CraftAiBadRequestError('Bad Request, unable to compute an agent decision with no or invalid timestamp provided.'));
      }
      if (_.isUndefined(contexts) || _.size(contexts) === 0) {
        return Promise.reject(new errors.CraftAiBadRequestError('Bad Request, unable to compute an agent decision with no context provided.'));
      }

      return flushAgentContextOperations(agentId)
      .then(() => request({
        method: 'GET',
        path: '/agents/' + agentId + '/decision/tree',
        query: {
          t: posixTimestamp
        }
      }, this))
      .then(tree => {
        let decision = decide(tree, ...contexts);
        decision.timestamp = posixTimestamp;
        return decision;
      });
    }
  });

  return instance;
}
