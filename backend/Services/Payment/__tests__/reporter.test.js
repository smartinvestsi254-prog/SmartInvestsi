jest.mock('nodemailer');
const nodemailer = require('nodemailer');
const { sendAlert } = require('../reporter');

let sendMailMock;

beforeEach(() => {
  sendMailMock = jest.fn();
  nodemailer.createTransport.mockReturnValue({
    sendMail: sendMailMock,
    verify: () => Promise.resolve()
  });
});

describe('reporter', () => {
  it('sends mail and retries on failure', async () => {
    sendMailMock.mockRejectedValueOnce(new Error('fail')).mockResolvedValue({});
    const result = await sendAlert([{ type: 'TEST' }]);
    expect(sendMailMock).toHaveBeenCalledTimes(2);
    expect(result).toBe(true);
  });
});