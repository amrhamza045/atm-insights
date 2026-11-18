import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { executiveContext } from '../../shared/executiveAccess.js';
import { peopleLabor } from '../../shared/executivePeopleLabor.js';
import { peopleAttendance } from '../../shared/executivePeopleAttendance.js';
import { peopleWorkforce } from '../../shared/executivePeopleWorkforce.js';

// Executive Dashboard People figures, totalled on the server per action.
const REPORTS = { labor: peopleLabor, attendance: peopleAttendance, workforce: peopleWorkforce };

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const ctx = await executiveContext(base44);
    const input = (await req.json().catch(() => null)) || {};
    if (!Object.hasOwn(REPORTS, input.action)) return Response.json({ error: 'Unknown people report.' }, { status: 400 });
    return Response.json(await REPORTS[input.action](ctx, input));
  } catch (error) {
    const status = error.status || 500;
    if (status >= 500) console.error('Executive people figures failed:', error.message);
    return Response.json({ error: error.message }, { status });
  }
}