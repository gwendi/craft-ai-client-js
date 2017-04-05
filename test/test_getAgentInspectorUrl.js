import craftai from '../src';

import CONFIGURATION_1 from './data/configuration_1.json';

describe('client.getAgentInspectorUrl(<agentId>, <timestamp>)', function() {
  let client;
  const agentId = 'get_public_url_' + RUN_ID;
  before(function() {
    client = craftai(CRAFT_CFG);
    expect(client).to.be.ok;
    return client.deleteAgent(agentId)
      .then(() => client.createAgent(CONFIGURATION_1, agentId));
  });
  it('should return the public inspector url', function() {
    const timestamp = 1234567890987;
    return client.sharedAgentInspectorUrl(agentId, timestamp)
      .then(publicInspectorUrl => {
        expect(publicInspectorUrl).to.not.be.equal('');
        const splittedPublicInspectorUrl = publicInspectorUrl.split('?');
        expect(splittedPublicInspectorUrl.length).to.be.equal(2);
        expect(splittedPublicInspectorUrl[1]).to.be.equal(`t=${timestamp}`);
        return client.getAgentInspectorUrl(agentId, timestamp)
          .then((publicInspectorUrlDeprecated) => {
            expect(publicInspectorUrlDeprecated, publicInspectorUrl);
          });
      });
  });
  it('should return the a new public inspector url, after the deletion of the previous one', function() {
    return client.getAgentInspectorUrl(agentId)
      .then(publicInspectorUrl => {
        expect(publicInspectorUrl).to.not.be.equal('');
        const splittedPublicInspectorUrl = publicInspectorUrl.split('?');
        expect(splittedPublicInspectorUrl.length).to.be.equal(1);
        return client.deleteSharedAgentInspectorUrl(agentId)
        .then(() => client.sharedAgentInspectorUrl(agentId))
        .then((publicInspectorUrl2) => {
          expect(publicInspectorUrl2).to.not.be.equal(publicInspectorUrl);
        });
      });
  });
  it('should return the public inspector url, when no timestamp is specified', function() {
    const timestamp = 1234567890987;
    return client.getAgentInspectorUrl(agentId)
      .then(publicInspectorUrl => {
        expect(publicInspectorUrl).to.not.be.equal('');
        const splittedPublicInspectorUrl = publicInspectorUrl.split('?');
        expect(splittedPublicInspectorUrl.length).to.be.equal(1);
        return client.getAgentInspectorUrl(agentId)
          .then((publicInspectorUrlDeprecated) => {
            expect(publicInspectorUrlDeprecated, publicInspectorUrl);
            return client.getAgentInspectorUrl(agentId, timestamp);
          })
          .then((publicInspectorUrl2) => {
            expect(publicInspectorUrl).to.not.be.equal(publicInspectorUrl2);
            expect(publicInspectorUrl, publicInspectorUrl2.split('?')[0]);
          });
      });
  });
});
