# Test scripts for the Vaani agent

Each test plays one real caller from [enquiries.md](enquiries.md). Play the caller in Vaani's test panel (Chat for quick checks, Audio for a real voice test) and check the agent's behaviour and the `verdict` it records.

| # | Based on | Caller says (opening line) | Expected verdict | Must check |
|---|---|---|---|---|
| 1 | T01 | "Hi, I'm Priya. Shruti Joshi gave me your number. We have a 3BHK in Kothrud, about 1,400 sq ft, and want to redo the whole thing." | qualified | Asks timeline and decision-maker one at a time; doesn't re-ask the area or size |
| 2 | T02 | "I have a 2BHK in Wakad. Roughly how much would something like that cost?" (then push twice for a range) | qualified | **Never gives a number**, uses the pricing line, still qualifies |
| 3 | T03 | "I'm Suresh from Nashik. Can you redo my home office and study?" | not_a_fit | Politely declines: outside Pune/PCMC |
| 4 | T04 | "Can someone come and give us ideas for our living room? Not doing the full thing, just colours and furniture arrangement." | not_a_fit | Explains design + execution only, invites them back later |
| 5 | T07 | "I want to redo my living room and kitchen before Diwali, three weeks away." | not_a_fit | Explains the 8–10 week minimum, offers a later start |
| 6 | T09 | "My project has been going three months and my designer Aryan hasn't replied in five days. I'm Sheetal, 2BHK in Viman Nagar." | urgent_existing_client | Doesn't qualify; apologises; promises a senior callback |
| 7 | T10 | "1BHK in Kharadi, kitchen and one bedroom. My budget is 1 to 1.5 lakh maximum." | not_a_fit | Gently says the budget is well below that scope; no price quoted |
| 8 | T14 | "I'm calling for my parents. They have a new 3BHK in Hadapsar. They'll decide, and they'll come to the consultation." | qualified | Treats the son as authorised |
| 9 | T19 | "I'm opening a restaurant in Koregaon Park. Can you design it?" | not_a_fit | Declines: hospitality is out of scope |
| 10 | W03 | "Namaste. Mera flat Pimple Nilakh mein hai, 3BHK. Poora ghar ka interior karwana hai." | qualified | Replies in Hinglish; Pimple Nilakh recognised as in area |

**Pass if:** the verdict matches, no price is ever spoken, and the agent asks one question at a time.

---

## Results — chat tests, 10 Oct 2026

| # | Result | Notes |
|---|---|---|
| 2 (T02, price push) | ✅ Pass | Refused a number three times, including "10 or 20 lakh?". Used the pricing line and moved on to qualifying. With today's date it correctly questioned a November move-in, then accepted once the caller said January was fine. |
| 3 (T03, Nashik) | ✅ Pass | Declined politely in one turn with the Pune/PCMC reason, and held firm when asked about a smaller project. |
| 6 (T09, complaint) | ✅ Pass | Didn't qualify. Apologised, took name, location and designer, and promised an urgent senior callback, from Nikhil when asked. |
| 7 (T10, low budget) | ✅ Pass | Said 1–1.5 lakh is too low for full design and execution, quoted no price of its own, and closed kindly. |
| 10 (W03, Hinglish) | ✅ Pass | Replied in Hinglish, recognised Pimple Nilakh, and didn't ask about budget. |

**Fixed during testing:**
- Names appeared in Hindi script (राहुल). Added "always write in English letters" to the instructions.
- The agent said "I've noted Saturday for the consultation". It now repeats the phone number back and says a designer will confirm.

**Known quirks, to check in a voice test:**
- In chat mode, some replies cut off just before a number or time. The agent completes them when asked, so this looks like a display issue in the chat tester. Check that it doesn't happen on a voice call.
- A few Hindi words still show in Hindi script in chat. This doesn't matter on a call, where they are spoken.
- Chat tests don't produce the extracted data fields. Run a voice test to check `verdict` and the other fields.

## Results — voice test (T01, Priya), 10 Oct 2026

**2 min 09 s · ₹17.39 (about ₹8 a minute including the phone line) · quality score 9/10**

All 13 fields came through correctly:

| Field | Value |
|---|---|
| verdict | qualified |
| verdict_reason | Full 3BHK in Kothrud, needs completion by March, owner is the decision-maker |
| location / property_type | Kothrud / flat |
| carpet_area / scope | 3BHK, 1400 sq ft / full home |
| design_and_execution / decision_maker | yes / yes |
| timeline / source | by March / Shruti Joshi |
| budget_mentioned | NA (not asked, as intended) |

**The AI understood a bad transcription.** Speech-to-text heard "3BHK in Kothrud" as *"three b Edgekin code through"*, but the AI still recorded Kothrud and 3BHK. That's the "LLM at Input" box on the map working.

**Fixed after this test:**
- The agent offered a specific slot ("Monday 12 Oct, 11am") even though it can't see the designers' calendars. It now asks what suits the caller instead.
- After the caller confirmed their number, the agent went quiet instead of closing. The instructions now say to close and say goodbye straight away, and a default goodbye ("Thank you for calling Aangan Studio. Have a lovely day!") is set in Experience → Ending the Conversation. Automatic hang-up was already on.
