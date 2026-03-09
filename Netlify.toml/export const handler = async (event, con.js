export const handler = async (event, context) => {
  const body = JSON.parse(event.body);

  // Access environment variables
  const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
  const PAYPAL_SECRET = process.env.PAYPAL_CLIENT_SECRET;

  // TODO: handle payment verification
  console.log('Webhook received', body);

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Webhook received successfully' })
  };
};