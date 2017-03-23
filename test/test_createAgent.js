import craftai, { errors } from '../src';

import CONFIGURATION_1 from './data/configuration_1.json';
import INVALID_CONFIGURATION_1 from './data/invalid_configuration_1.json';

describe('client.createAgent(<configuration>, [id])', function() {
  let client;
  before(function() {
    client = craftai(CRAFT_CFG);
    expect(client).to.be.ok;
  });
  it('should succeed when using a valid configuration and generated id', function() {
    return client.createAgent(CONFIGURATION_1)
      .then(agent => {
        expect(agent).to.be.ok;
        expect(agent.id).to.be.a.string;
        return client.getAgent(agent.id)
          .then(retrieveAgent => {
            expect(retrieveAgent.configuration).to.be.deep.equal(CONFIGURATION_1);
            return client.deleteAgent(agent.id);
          });
      });
  });
  it('should succeed when using a valid configuration and specified id', function() {
    const agentId = 'unspeakable_dermatologist_' + RUN_ID;
    return client.deleteAgent(agentId) // Destroy any preexisting agent with this id.
      .then(() => client.createAgent(CONFIGURATION_1, agentId))
      .then(agent => {
        expect(agent).to.be.ok;
        expect(agent.id).to.be.equal(agentId);
        return client.deleteAgent(agent.id);
      })
      .catch(err => {
        return client.deleteAgent(agentId) // The test might fail due to duplicate id, let's make sure it doesn't fail twice.
          .then(() => {
            throw err;
          });
      });
  });
  it('should fail when trying to use the same id twice', function() {
    const agentId = 'aphasic_parrot_' + RUN_ID;
    return client.deleteAgent(agentId) // Delete any preexisting agent with this id.
      .then(() => client.createAgent(CONFIGURATION_1, agentId))
      .then(agent => {
        expect(agent).to.be.ok;
        expect(agent.id).to.be.equal(agentId);
        return client.createAgent(CONFIGURATION_1, agentId);
      })
      .catch(err => {
        expect(err).to.be.an.instanceof(errors.CraftAiError);
        expect(err).to.be.an.instanceof(errors.CraftAiBadRequestError);
      })
      .then(() => {
        return client.deleteAgent(agentId);
      });
  });
  it('should fail when using an undefined configuration', function() {
    return client.createAgent(undefined)
      .catch(err => {
        expect(err).to.be.an.instanceof(errors.CraftAiError);
        expect(err).to.be.an.instanceof(errors.CraftAiBadRequestError);
      });
  });
  it('should fail when using an invalid configuration', function() {
    return client.createAgent(INVALID_CONFIGURATION_1)
      .catch(err => {
        expect(err).to.be.an.instanceof(errors.CraftAiError);
        expect(err).to.be.an.instanceof(errors.CraftAiBadRequestError);
      });
  });
});
