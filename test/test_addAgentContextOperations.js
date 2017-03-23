import craftai, { errors, Time } from '../src';

import CONFIGURATION_1 from './data/configuration_1.json';
import CONFIGURATION_1_OPERATIONS_1 from './data/configuration_1_operations_1.json';

const CONFIGURATION_1_OPERATIONS_1_FROM = _.head(CONFIGURATION_1_OPERATIONS_1).timestamp;
const CONFIGURATION_1_OPERATIONS_1_TO = _.last(CONFIGURATION_1_OPERATIONS_1).timestamp;
const CONFIGURATION_1_OPERATIONS_1_LAST = _.reduce(
  CONFIGURATION_1_OPERATIONS_1,
  (context, operation) => _.assign(context, operation),
  {});

import CONFIGURATION_1_OPERATIONS_2 from './data/configuration_1_operations_2.json';

describe('client.addAgentContextOperations(<agentId>, <operations>)', function() {
  let client;
  let agents;
  const agentsId = ['add_agent_context_operations_' + RUN_ID + '_1', 'add_agent_context_operations_' + RUN_ID + '_2'];
  before(function() {
    client = craftai(CRAFT_CFG);
    expect(client).to.be.ok;
  });
  beforeEach(function() {
    return Promise.all(_.map(agentsId, agentId => client.deleteAgent(agentId) // Delete any preexisting agent with this id.
      .then(() => client.createAgent(CONFIGURATION_1, agentId))
      .then(createdAgent => {
        expect(createdAgent).to.be.ok;
        return createdAgent;
      })
    ))
      .then(createdAgents => {
        agents = createdAgents;
        return;
      });
  });
  afterEach(function() {
    return Promise.all(_.map(agents, agent => client.deleteAgent(agent.id)));
  });
  it('should succeed when using valid operations', function() {
    return client.addAgentContextOperations(agents[0].id, CONFIGURATION_1_OPERATIONS_1)
      .then(() => {
        return client.getAgentContext(agents[0].id, CONFIGURATION_1_OPERATIONS_1_TO + 100);
      })
      .then(context => {
        expect(context.context).to.be.deep.equal(CONFIGURATION_1_OPERATIONS_1_LAST.context);
        expect(context.timestamp).to.equal(CONFIGURATION_1_OPERATIONS_1_TO + 100);
        return;
      })
      .then(() => {
        return client.getAgentContextOperations(agents[0].id);
      })
      .then(retrievedOperations => {
        expect(retrievedOperations).to.be.deep.equal(CONFIGURATION_1_OPERATIONS_1);
        return client.getAgent(agents[0].id);
      })
      .then(retrievedAgent => {
        expect(retrievedAgent.firstTimestamp).to.be.equal(CONFIGURATION_1_OPERATIONS_1_FROM);
        expect(retrievedAgent.lastTimestamp).to.be.equal(CONFIGURATION_1_OPERATIONS_1_TO);
        return;
      });
  });
  it('should succeed when passing unordered contexts', function() {
    return client.addAgentContextOperations(agents[0].id,
      [
        {
          'timestamp': 1464600000,
          'context': {
            'presence': 'robert',
            'lightIntensity': 0.4,
            'lightbulbColor': 'green'
          }
        },
        {
          'timestamp': 1464601500,
          'context': {
            'presence': 'robert',
            'lightIntensity': 0.6,
            'lightbulbColor': 'green'
          }
        },
        {
          'timestamp': 1464601000,
          'context': {
            'presence': 'gisele',
            'lightIntensity': 0.4,
            'lightbulbColor': 'blue'
          }
        },
        {
          'timestamp': 1464600500,
          'context': {
            'presence': 'none',
            'lightIntensity': 0,
            'lightbulbColor': 'black'
          }
        }
      ]
    )
      .then(() => {
        return client.getAgentContextOperations(agents[0].id);
      })
      .then(retrievedOperations => {
        expect(retrievedOperations).to.be.deep.equal(CONFIGURATION_1_OPERATIONS_1);
        return client.getAgent(agents[0].id);
      })
      .then(retrievedAgent => {
        expect(retrievedAgent.firstTimestamp).to.be.equal(CONFIGURATION_1_OPERATIONS_1_FROM);
        expect(retrievedAgent.lastTimestamp).to.be.equal(CONFIGURATION_1_OPERATIONS_1_TO);
        return;
      });
  });
  it('should succeed when using operations with ISO 8601 timestamps', function() {
    return client.addAgentContextOperations(agents[0].id, [
      {
        timestamp: '1998-04-23T04:30:00-05:00',
        context: {
          presence: 'robert',
          lightIntensity: 0.4,
          lightbulbColor: 'green'
        }
      },
      {
        timestamp: '1998-04-23T04:32:25-05:00',
        context: {
          presence: 'none'
        }
      }
    ])
      .then(() => {
        return client.getAgentContextOperations(agents[0].id);
      })
      .then(operations => {
        expect(operations).to.be.deep.equal([
          {
            timestamp: 893323800,
            context: {
              presence: 'robert',
              lightIntensity: 0.4,
              lightbulbColor: 'green'
            }
          },
          {
            timestamp: 893323945,
            context: {
              presence: 'none'
            }
          }
        ]);
        return;
      });
  });
  it('should succeed when using operations with Time timestamps', function() {
    return client.addAgentContextOperations(agents[0].id, [
      {
        timestamp: new Time('1998-04-23T04:30:00-05:00'),
        context: {
          presence: 'robert',
          lightIntensity: 0.4,
          lightbulbColor: 'green'
        }
      },
      {
        timestamp: Time('1998-04-23T04:32:25-05:00'),
        context: {
          presence: 'none'
        }
      }
    ])
      .then(() => {
        return client.getAgentContextOperations(agents[0].id);
      })
      .then(operations => {
        expect(operations).to.be.deep.equal([
          {
            timestamp: 893323800,
            context: {
              presence: 'robert',
              lightIntensity: 0.4,
              lightbulbColor: 'green'
            }
          },
          {
            timestamp: 893323945,
            context: {
              presence: 'none'
            }
          }
        ]);
        return;
      });
  });
  it('should fail when using out of order operations with immediate flush', function() {
    return client.addAgentContextOperations(agents[0].id, CONFIGURATION_1_OPERATIONS_1, true)
      .then(() => {
        return client.addAgentContextOperations(agents[0].id, CONFIGURATION_1_OPERATIONS_1[0], true);
      })
      .catch(err => {
        expect(err).to.be.an.instanceof(errors.CraftAiError);
        expect(err).to.be.an.instanceof(errors.CraftAiBadRequestError);
      })
      .then(() => {
        return client.getAgentContextOperations(agents[0].id);
      })
      .then(retrievedOperations => {
        expect(retrievedOperations).to.be.deep.equal(CONFIGURATION_1_OPERATIONS_1);
        return;
      });
  });
  it('should fail when sending invalid operations or no operation at all', function() {
    return client.addAgentContextOperations(agents[0].id, CONFIGURATION_1_OPERATIONS_1, true)
      .then(() => client.addAgentContextOperations(agents[0].id, [], true))
      .catch(err => {
        expect(err).to.be.an.instanceof(errors.CraftAiError);
        expect(err).to.be.an.instanceof(errors.CraftAiBadRequestError);
      })
      .then(() => client.addAgentContextOperations(agents[0].id, undefined, true))
      .catch(err => {
        expect(err).to.be.an.instanceof(errors.CraftAiError);
        expect(err).to.be.an.instanceof(errors.CraftAiBadRequestError);
      })
      .then(() => client.addAgentContextOperations(agents[0].id, [undefined, undefined], true))
      .catch(err => {
        expect(err).to.be.an.instanceof(errors.CraftAiError);
        expect(err).to.be.an.instanceof(errors.CraftAiBadRequestError);
      })
      .then(() => {
        return client.getAgentContextOperations(agents[0].id);
      })
      .then(retrievedOperations => {
        expect(retrievedOperations).to.be.deep.equal(CONFIGURATION_1_OPERATIONS_1);
        return;
      });
  });
  it('should fail later when using out of order operations', function() {
    return client.addAgentContextOperations(agents[0].id, CONFIGURATION_1_OPERATIONS_1)
      .then(() => {
        return client.getAgentContextOperations(agents[0].id);
      })
      .then(retrievedOperations => {
        expect(retrievedOperations).to.be.deep.equal(CONFIGURATION_1_OPERATIONS_1);
        return;
      })
      .then(() => {
        return client.addAgentContextOperations(agents[0].id, CONFIGURATION_1_OPERATIONS_1[0]);
      })
      .then(() => {
        return client.getAgentContextOperations(agents[0].id);
      })
      .catch(err => {
        expect(err).to.be.an.instanceof(errors.CraftAiError);
        expect(err).to.be.an.instanceof(errors.CraftAiBadRequestError);
      })
      .then(() => {
        return client.getAgentContextOperations(agents[0].id);
      })
      .then(retrievedOperations => {
        expect(retrievedOperations).to.be.deep.equal(CONFIGURATION_1_OPERATIONS_1);
        return;
      });
  });
  it('should succeed with a very large number of simultaneous calls', function() {
    this.timeout(10000);
    return Promise.all(
      _(CONFIGURATION_1_OPERATIONS_2)
        .chunk(5)
        .map(operationsChunk => client.addAgentContextOperations(agents[0].id, operationsChunk))
        .value()
      )
      .then(() => {
        return client.getAgentContextOperations(agents[0].id);
      })
      .then(retrievedOperations => {
        expect(retrievedOperations).to.be.deep.equal(CONFIGURATION_1_OPERATIONS_2);
        return;
      });
  });
  it('should succeed with a very large payload', function() {
    this.timeout(10000);
    return client.addAgentContextOperations(agents[0].id, CONFIGURATION_1_OPERATIONS_2)
      .then(() => {
        return client.getAgentContextOperations(agents[0].id);
      })
      .then(retrievedOperations => {
        expect(retrievedOperations).to.be.deep.equal(CONFIGURATION_1_OPERATIONS_2);
        return;
      });
  });
  it('should not fail when deleting the agent to which operations where added', function() {
    return client.addAgentContextOperations(agents[1].id, CONFIGURATION_1_OPERATIONS_1)
      .then(() => client.deleteAgent(agents[1].id))
      .then(() => client.getAgentContextOperations(agents[0].id))
      .then(retrievedOperations => {
        expect(retrievedOperations).to.be.deep.empty;
        return;
      });
  });
  it('should work properly when sending operations to more than one agent', function() {
    return Promise.all([
      client.addAgentContextOperations(agents[0].id, CONFIGURATION_1_OPERATIONS_2),
      client.addAgentContextOperations(agents[1].id, CONFIGURATION_1_OPERATIONS_1)
    ])
      .then(() => client.getAgentContextOperations(agents[0].id))
      .then(retrievedOperations => {
        expect(retrievedOperations).to.be.deep.equal(CONFIGURATION_1_OPERATIONS_2);
        return;
      })
      .then(() => client.getAgentContextOperations(agents[1].id))
      .then(retrievedOperations => {
        expect(retrievedOperations).to.be.deep.equal(CONFIGURATION_1_OPERATIONS_1);
        return;
      });
  });
});
