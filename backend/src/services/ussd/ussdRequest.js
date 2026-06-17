/**
 * Parse USSD HTTP request body (JSON or form-encoded).
 */
export const parseUSSDRequest = (req) => {
  const body = req.body || {};

  return {
    sessionId: body.sessionId || body.session_id || '',
    serviceCode: body.serviceCode || body.service_code || '',
    phoneNumber: body.phoneNumber || body.phone_number || '',
    text: body.text ?? '',
  };
};

export default { parseUSSDRequest };
