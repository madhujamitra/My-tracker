/**
 * Full pipeline classifier fixtures (16 core + 4 edges).
 * `phaseA` = what heuristic classifyJobEmail must return today
 * (advanced stages collapsed; job_title/title soft — asserted separately for LLM later).
 */

/** @typedef {{ kind: string|null, proposed_status: string|null, proposed_company: string|null, awaiting_candidate_reply?: boolean }} PhaseAExpect */

/**
 * @param {object} full User / Phase-B ideal
 * @param {Partial<PhaseAExpect>} override
 * @returns {PhaseAExpect}
 */
function phaseAFrom(full, override = {}) {
  let kind = full.kind
  let status = full.proposed_status
  if (kind === 'assessment_event') kind = 'interview_event'
  if (kind === 'offer_event') kind = 'status_update'
  if (kind === 'ignore') kind = null
  if (status === 'screening' || status === 'assessment' || status === 'final_round') {
    status = 'interviewing'
  }
  if (status === 'accepted') status = 'offer'
  if (status === 'on_hold') status = 'not_selected'
  return {
    kind,
    proposed_status: status,
    proposed_company: full.company,
    awaiting_candidate_reply: full.awaiting_candidate_reply,
    ...override,
  }
}

export const PIPELINE_TEST_CASES = [
  {
    name: 'Opportunity - Shopify recruiter outreach',
    subject: 'Senior Frontend Developer opportunity at Shopify',
    snippet: `
Hi Madhuja,
I came across your profile and thought your React and TypeScript
experience could be a strong match for a Senior Frontend Developer
position with Shopify.
Would you be open to a quick conversation about the opportunity?
Best, Rachel Talent Acquisition Shopify
    `,
    from: 'Rachel <rachel@shopify.com>',
    ideal: {
      kind: 'new_opportunity',
      proposed_status: 'opportunity',
      company: 'Shopify',
      awaiting_candidate_reply: true,
    },
    phaseA: phaseAFrom({
      kind: 'new_opportunity',
      proposed_status: 'opportunity',
      company: 'Shopify',
      awaiting_candidate_reply: true,
    }),
  },
  {
    name: 'Needs reply - Microsoft resume request',
    subject: 'Microsoft Software Engineer opportunity',
    snippet: `
Hi Madhuja,
Thank you for your interest in opportunities at Microsoft.
Before I can submit your profile to the engineering team,
could you please send me your most recent resume and confirm
that you are interested in the Software Engineer position?
Regards, Daniel Microsoft Recruiting
    `,
    from: 'Daniel <daniel@microsoft.com>',
    ideal: {
      kind: 'needs_reply',
      proposed_status: 'opportunity',
      company: 'Microsoft',
      awaiting_candidate_reply: true,
    },
    // Phase A: known employer + resume ask → Opportunity row (awaiting reply)
    phaseA: {
      kind: 'new_opportunity',
      proposed_status: 'opportunity',
      proposed_company: 'Microsoft',
      awaiting_candidate_reply: true,
    },
  },
  {
    name: 'Applied - Amazon application receipt',
    subject: "We've received your application",
    snippet: `
Hello Madhuja,
Thank you for applying for the Software Development Engineer II
position at Amazon.
We have successfully received your application and our recruiting
team will review your qualifications.
No action is required from you at this time.
Amazon Recruiting
    `,
    from: 'Amazon Recruiting <recruiting@amazon.com>',
    ideal: {
      kind: 'new_application',
      proposed_status: 'applied',
      company: 'Amazon',
      awaiting_candidate_reply: false,
    },
    phaseA: phaseAFrom({
      kind: 'new_application',
      proposed_status: 'applied',
      company: 'Amazon',
      awaiting_candidate_reply: false,
    }),
  },
  {
    name: 'Applied - CGI acknowledgement',
    subject: 'Job Application Acknowledgement - Full Stack Developer',
    snippet: `
Dear Madhuja,
This email acknowledges receipt of your resume for the
Full Stack Developer position with CGI.
Your information has been forwarded to our recruitment team
for consideration.
We will contact you should your qualifications match our requirements.
CGI Talent Acquisition
    `,
    from: 'CGI Talent Acquisition <help.candidate@njoyn.com>',
    ideal: {
      kind: 'new_application',
      proposed_status: 'applied',
      company: 'CGI',
      awaiting_candidate_reply: false,
    },
    phaseA: phaseAFrom({
      kind: 'new_application',
      proposed_status: 'applied',
      company: 'CGI',
      awaiting_candidate_reply: false,
    }),
  },
  {
    name: 'Applied - Robert Half submitting to RBC',
    subject: 'Your profile has been submitted',
    snippet: `
Hi Madhuja,
As discussed, I have submitted your profile to RBC for their
Senior Full Stack Developer position in Toronto.
The RBC hiring manager will review your background and I will
contact you when I receive feedback.
Regards, Michael Robert Half
    `,
    from: 'Michael <michael@roberthalf.com>',
    ideal: {
      kind: 'new_application',
      proposed_status: 'applied',
      company: 'RBC',
      awaiting_candidate_reply: false,
    },
    phaseA: phaseAFrom({
      kind: 'new_application',
      proposed_status: 'applied',
      company: 'RBC',
      awaiting_candidate_reply: false,
    }),
  },
  {
    name: 'Screening - Stripe recruiter call',
    subject: 'Next step: Recruiter conversation with Stripe',
    snippet: `
Hi Madhuja,
We reviewed your application for the Backend Engineer position
and would like to schedule an initial 30-minute recruiter screen.
Please use the scheduling link below to select a time that works
for you.
Best, Stripe Recruiting
    `,
    from: 'Stripe Recruiting <recruiting@stripe.com>',
    ideal: {
      kind: 'interview_event',
      proposed_status: 'screening',
      company: 'Stripe',
      awaiting_candidate_reply: true,
    },
    phaseA: phaseAFrom({
      kind: 'interview_event',
      proposed_status: 'screening',
      company: 'Stripe',
      awaiting_candidate_reply: true,
    }),
  },
  {
    name: 'Assessment - Google coding exercise',
    subject: 'Google Online Assessment Invitation',
    snippet: `
Hello Madhuja,
Thank you for your interest in the Software Engineer position
at Google.
As the next step in our process, we'd like you to complete
an online coding assessment.
Please complete the assessment within five days.
Google Recruiting
    `,
    from: 'Google Recruiting <recruiting@google.com>',
    ideal: {
      kind: 'assessment_event',
      proposed_status: 'assessment',
      company: 'Google',
      awaiting_candidate_reply: true,
    },
    phaseA: phaseAFrom({
      kind: 'assessment_event',
      proposed_status: 'assessment',
      company: 'Google',
      awaiting_candidate_reply: true,
    }),
  },
  {
    name: 'Interviewing - Datadog technical interview',
    subject: 'Technical interview confirmation',
    snippet: `
Hi Madhuja,
Your technical interview for the Senior Software Engineer role
at Datadog has been scheduled for Thursday at 10:00 AM PT.
You'll meet with two engineers and complete a coding discussion.
No further confirmation is required.
Best, Datadog Recruiting
    `,
    from: 'Datadog Recruiting <recruiting@datadoghq.com>',
    ideal: {
      kind: 'interview_event',
      proposed_status: 'interviewing',
      company: 'Datadog',
      awaiting_candidate_reply: false,
    },
    phaseA: phaseAFrom({
      kind: 'interview_event',
      proposed_status: 'interviewing',
      company: 'Datadog',
      awaiting_candidate_reply: false,
    }),
  },
  {
    name: 'Interviewing - Airbnb availability requested',
    subject: 'Availability for your next Airbnb interview',
    snippet: `
Hi Madhuja,
The team enjoyed speaking with you and would like to move you
forward to the technical interview stage for the Senior Frontend
Engineer role.
Could you please send us your availability for next week?
Best, Airbnb Recruiting
    `,
    from: 'Airbnb Recruiting <recruiting@airbnb.com>',
    ideal: {
      kind: 'interview_event',
      proposed_status: 'interviewing',
      company: 'Airbnb',
      awaiting_candidate_reply: true,
    },
    phaseA: phaseAFrom({
      kind: 'interview_event',
      proposed_status: 'interviewing',
      company: 'Airbnb',
      awaiting_candidate_reply: true,
    }),
  },
  {
    name: 'Final round - Coinbase',
    subject: 'Final Interview Round - Coinbase',
    snippet: `
Hi Madhuja,
We're pleased to let you know that you've progressed to the final
round for the Staff Software Engineer position at Coinbase.
Your final stage will include conversations with our Engineering
Director and VP of Engineering.
Please confirm whether Tuesday afternoon works for you.
Regards, Coinbase Talent Team
    `,
    from: 'Coinbase Talent <talent@coinbase.com>',
    ideal: {
      kind: 'interview_event',
      proposed_status: 'final_round',
      company: 'Coinbase',
      awaiting_candidate_reply: true,
    },
    phaseA: phaseAFrom({
      kind: 'interview_event',
      proposed_status: 'final_round',
      company: 'Coinbase',
      awaiting_candidate_reply: true,
    }),
  },
  {
    name: 'Offer - Adobe',
    subject: 'Your offer from Adobe',
    snippet: `
Dear Madhuja,
We are delighted to formally offer you the position of
Senior Software Engineer at Adobe.
Your offer letter and compensation package are attached.
Please review the documents and let us know your decision
by August 17.
Congratulations!
Adobe Talent Acquisition
    `,
    from: 'Adobe Talent <talent@adobe.com>',
    ideal: {
      kind: 'offer_event',
      proposed_status: 'offer',
      company: 'Adobe',
      awaiting_candidate_reply: true,
    },
    phaseA: phaseAFrom({
      kind: 'offer_event',
      proposed_status: 'offer',
      company: 'Adobe',
      awaiting_candidate_reply: true,
    }),
  },
  {
    name: 'Accepted - Salesforce',
    subject: 'Welcome to Salesforce!',
    snippet: `
Hi Madhuja,
We're thrilled that you have accepted our offer for the
Lead Software Engineer position at Salesforce.
We've received your signed employment agreement and our
onboarding team will contact you shortly.
Welcome aboard!
Salesforce Recruiting
    `,
    from: 'Salesforce Recruiting <recruiting@salesforce.com>',
    ideal: {
      kind: 'status_update',
      proposed_status: 'accepted',
      company: 'Salesforce',
      awaiting_candidate_reply: false,
    },
    phaseA: phaseAFrom({
      kind: 'status_update',
      proposed_status: 'accepted',
      company: 'Salesforce',
      awaiting_candidate_reply: false,
    }),
  },
  {
    name: 'Rejected - Netflix',
    subject: 'Update regarding your application',
    snippet: `
Hi Madhuja,
Thank you for taking the time to interview for the
Senior UI Engineer position at Netflix.
After careful consideration, we've decided not to move forward
with your candidacy.
We appreciate your interest in Netflix.
Netflix Talent Team
    `,
    from: 'Netflix Talent <talent@netflix.com>',
    ideal: {
      kind: 'status_update',
      proposed_status: 'rejected',
      company: 'Netflix',
      awaiting_candidate_reply: false,
    },
    phaseA: phaseAFrom({
      kind: 'status_update',
      proposed_status: 'rejected',
      company: 'Netflix',
      awaiting_candidate_reply: false,
    }),
  },
  {
    name: 'Withdrawn - Atlassian',
    subject: 'Confirmation of application withdrawal',
    snippet: `
Hi Madhuja,
We've processed your request to withdraw your application
for the Senior Full Stack Engineer position at Atlassian.
Your application will no longer be considered for this opening.
Regards, Atlassian Recruiting
    `,
    from: 'Atlassian Recruiting <recruiting@atlassian.com>',
    ideal: {
      kind: 'status_update',
      proposed_status: 'withdrawn',
      company: 'Atlassian',
      awaiting_candidate_reply: false,
    },
    phaseA: phaseAFrom({
      kind: 'status_update',
      proposed_status: 'withdrawn',
      company: 'Atlassian',
      awaiting_candidate_reply: false,
    }),
  },
  {
    name: 'On hold - Intel hiring freeze',
    subject: 'Update on your Intel application',
    snippet: `
Hello Madhuja,
We wanted to update you regarding the Senior Software Developer
position at Intel.
The team has temporarily paused hiring for this position due to
an internal hiring freeze.
Your application remains active, and we will reach out if the
position reopens.
Intel Talent Acquisition
    `,
    from: 'Intel Talent <talent@intel.com>',
    ideal: {
      kind: 'status_update',
      proposed_status: 'on_hold',
      company: 'Intel',
      awaiting_candidate_reply: false,
    },
    phaseA: phaseAFrom({
      kind: 'status_update',
      proposed_status: 'on_hold',
      company: 'Intel',
      awaiting_candidate_reply: false,
    }),
  },
  {
    name: 'Ignore - LinkedIn recommendations',
    subject: '15 new software engineering jobs for you',
    snippet: `
Hi Madhuja,
Based on your profile, here are new jobs you may be interested in:
Senior Engineer at Company A
Frontend Developer at Company B
See all recommended jobs.
LinkedIn Jobs
    `,
    from: 'LinkedIn Jobs <jobs-noreply@linkedin.com>',
    ideal: {
      kind: 'ignore',
      proposed_status: null,
      company: null,
      awaiting_candidate_reply: false,
    },
    phaseA: { kind: null, proposed_status: null, proposed_company: null },
  },
]

export const PIPELINE_EDGE_CASES = [
  {
    name: 'Positive feedback but no offer - Snowflake',
    subject: 'Interview update',
    snippet: `
Hi Madhuja,
The Snowflake team had very positive feedback from your interviews
for the Senior Software Engineer position.
You're one of the candidates being considered, and we expect
to make a decision next week.
Best, Snowflake Recruiting
    `,
    from: 'Snowflake Recruiting <recruiting@snowflake.com>',
    ideal: {
      kind: 'status_update',
      proposed_status: 'interviewing',
      company: 'Snowflake',
      awaiting_candidate_reply: false,
    },
    // Heuristic: interview mention → interview_event (same pipeline stage)
    phaseA: {
      kind: 'interview_event',
      proposed_status: 'interviewing',
      proposed_company: 'Snowflake',
      awaiting_candidate_reply: false,
    },
  },
  {
    name: 'Applied and action required - Uber',
    subject: 'Your Uber application - additional information',
    snippet: `
Hi Madhuja,
We've received your application for the Senior Backend Engineer
position at Uber.
Before the hiring manager reviews your profile, please reply
with your current work authorization status and preferred
interview availability.
Regards, Uber Recruiting
    `,
    from: 'Uber Recruiting <recruiting@uber.com>',
    ideal: {
      kind: 'new_application',
      proposed_status: 'applied',
      company: 'Uber',
      awaiting_candidate_reply: true,
    },
    phaseA: phaseAFrom({
      kind: 'new_application',
      proposed_status: 'applied',
      company: 'Uber',
      awaiting_candidate_reply: true,
    }),
  },
  {
    name: 'Unknown client - recruiting agency',
    subject: 'React Developer Contract Opportunity',
    snippet: `
Hi Madhuja,
I'm working with one of our enterprise clients on a six-month
React Developer contract in Vancouver.
The client name is confidential at this stage.
Would you be interested in learning more?
Regards, James TEKsystems
    `,
    from: 'James <james@teksystems.com>',
    ideal: {
      kind: 'new_opportunity',
      proposed_status: 'opportunity',
      company: null,
      awaiting_candidate_reply: true,
    },
    // No employer → needs_reply + opportunity (same board outcome via sync)
    phaseA: {
      kind: 'needs_reply',
      proposed_status: 'opportunity',
      proposed_company: null,
      awaiting_candidate_reply: true,
    },
  },
  {
    name: 'VP interview but not final round - HubSpot',
    subject: 'Next interview with VP Engineering',
    snippet: `
Hi Madhuja,
We'd like to schedule your next interview for the
Principal Software Engineer role at HubSpot.
You will be meeting with our VP of Engineering.
Please send us your availability for Wednesday or Thursday.
Best, HubSpot Recruiting
    `,
    from: 'HubSpot Recruiting <recruiting@hubspot.com>',
    ideal: {
      kind: 'interview_event',
      proposed_status: 'interviewing',
      company: 'HubSpot',
      awaiting_candidate_reply: true,
    },
    phaseA: phaseAFrom({
      kind: 'interview_event',
      proposed_status: 'interviewing',
      company: 'HubSpot',
      awaiting_candidate_reply: true,
    }),
  },
]

export const ALL_PIPELINE_FIXTURES = [
  ...PIPELINE_TEST_CASES,
  ...PIPELINE_EDGE_CASES,
]
