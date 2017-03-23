import craftai from '../src';

describe('client.getAgentInspectorUrl(<agentId>, <timestamp>)', function() {
  let client;
  const agentId = 'get_public_url_' + RUN_ID;
  before(function() {
    client = craftai(CRAFT_CFG);
    expect(client).to.be.ok;
  });
  it('should return the public inspector url', function() {
    const timestamp=1234567890987;
    return client.getAgentInspectorUrl(agentId, timestamp)
      .then(publicInspectorUrl => {
        expect(publicInspectorUrl, `${client.cfg.url}/public/inspector?owner=${client.cfg.owner}&agent=${agentId}&timestamp=${timestamp}&token=${client.cfg.token}`);
        return;
      });
  });
  it('should return the public inspector url, when no timestamp is specified', function() {
    return client.getAgentInspectorUrl(agentId)
      .then(publicInspectorUrl => {
        expect(publicInspectorUrl, `${client.cfg.url}/public/inspector?owner=${client.cfg.owner}&agent=${agentId}&token=${client.cfg.token}`);
        return;
      });
  });
});
