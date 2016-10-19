import craftai from '../src';

import CONFIGURATION_1 from './data/configuration_1.json';

describe('client.listAgents()', function() {
  let client;
  const agentsId = ['list_agents_agent1', 'list_agents_agent2', 'list_agents_agent3'];
  before(function() {
    client = craftai(CRAFT_CFG);
    expect(client).to.be.ok;
  });
  beforeEach(function() {
    return Promise.all(_.map(agentsId, agentId => client.deleteAgent(agentId))) // Delete any preexisting agent with this id.
      .then(() => Promise.all(_.map(agentsId, agentId => client.createAgent(CONFIGURATION_1, agentId))));
  });
  afterEach(function() {
    return Promise.all(_.map(agentsId, agentId => client.deleteAgent(agentId)));
  });
  it('should retrieve the created agents', function() {
    return client.listAgents()
      .then(retrievedAgentIds => {
        expect(retrievedAgentIds).to.include(agentsId[0]);
        expect(retrievedAgentIds).to.include(agentsId[1]);
        expect(retrievedAgentIds).to.include(agentsId[2]);
      });
  });
});
