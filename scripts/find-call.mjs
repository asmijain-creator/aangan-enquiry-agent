// Checks whether a Vaani call has reached HubSpot, and prints the deal if so.
// Run: node scripts/find-call.mjs <vaani call id>
import { findDealByCallId } from "../lib/hubspot.js";

const callId = process.argv[2];
const deal = await findDealByCallId(callId);
console.log(deal ? `Found deal ${deal.id}: ${deal.properties.dealname}` : `No deal yet for ${callId}`);
