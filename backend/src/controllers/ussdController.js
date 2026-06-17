/**
 * USSD Controller — thin HTTP adapter for plain-text CON/END responses.
 */

import { parseUSSDRequest } from '../services/ussd/ussdRequest.js';
import { routeUssdRequest } from '../services/ussd/ussdService.js';

export const handleUSSD = async (req, res) => {
  try {
    const { sessionId, serviceCode, phoneNumber, text } = parseUSSDRequest(req);

    if (!sessionId || !serviceCode || !phoneNumber) {
      return res
        .status(400)
        .type('text/plain')
        .send('END Invalid request. Missing sessionId, serviceCode, or phoneNumber.');
    }

    const response = await routeUssdRequest(text, phoneNumber);

    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.status(200).send(response);
  } catch (error) {
    console.error('[USSD Error]', error);
    res.status(500).type('text/plain').send('END An error occurred. Please try again later.');
  }
};

export default { handleUSSD };
