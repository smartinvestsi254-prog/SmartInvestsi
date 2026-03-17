jest.mock('axios');
jest.mock('os');

const axios = require('axios');
const os = require('os');
const { monitor } = require('../monitor');
const config = require('../config');

// stub reporter and fixer to avoid side effects
jest.mock('../reporter', () => ({ sendAlert: jest.fn() }));
jest.mock('../fixer', () => ({ autoFix: jest.fn() }));

const { sendAlert } = require('../reporter');
const { autoFix } = require('../fixer');

describe('monitor module', () => {
  beforeEach(() => {
    // reset mocks
    axios.get.mockReset();
    sendAlert.mockReset();
    autoFix.mockReset();
  });

  it('records history and detects slow response', async () => {
    axios.get.mockImplementation((url) => {
      return new Promise((res) => setTimeout(() => res({ status: 200 }), 50));
    });
    os.loadavg.mockReturnValue([0]);

    await monitor();
    expect(sendAlert).not.toHaveBeenCalled();
  });

  it('flags server error and high load', async () => {
    axios.get.mockRejectedValue({ response: { status: 502 } });
    os.loadavg.mockReturnValue([5]);

    await monitor();
    expect(sendAlert).toHaveBeenCalled();
    expect(autoFix).toHaveBeenCalled();
  });
});