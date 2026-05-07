const sections = [
  {
    title: "1. Acceptance and authority",
    body: "These DueScope Service Terms (the Terms) govern access to and use of the DueScope service, including the application, reports, watchlist features, billing flows, support, and related documentation. By creating an account, clicking acceptance, or using the service, you agree to be bound by these Terms. If you use the service on behalf of a legal entity, you represent and warrant that you have authority to bind that entity, and references to Customer or you mean that entity."
  },
  {
    title: "2. Service description",
    body: "DueScope provides source-backed due diligence workflow software for screening companies, individuals, jurisdictions, vendors, partners, customers, and investment targets. The service may generate target profiles, jurisdiction-risk summaries, sanctions and watchlist signals, category scores, rationale, citations, watchlist monitoring, usage records, and exportable reports. DueScope is a decision-support tool only and does not make final compliance, legal, procurement, investment, or risk decisions for Customer."
  },
  {
    title: "3. Customer obligations",
    body: "Customer is solely responsible for the accuracy, lawfulness, and completeness of information submitted to the service; for maintaining a lawful basis to screen any person or organisation; for reviewing outputs before use; and for ensuring that its use of the service complies with applicable sanctions, export-control, anti-bribery, privacy, employment, anti-discrimination, procurement, and sector-specific laws. Customer must not submit secrets, passwords, payment-card data, health data, special category data, criminal-offence data, or confidential third-party information unless Customer has the authority and legal basis to do so."
  },
  {
    title: "4. Acceptable use restrictions",
    body: "Customer shall not misuse the service, circumvent usage limits, attempt unauthorised access, interfere with platform integrity, scrape or bulk extract the service, reverse engineer security controls, upload malicious code, use the service to harass or unlawfully profile individuals, or use outputs in a manner that violates applicable law. DueScope may suspend access where it reasonably believes Customer's use presents a security, legal, operational, or payment risk."
  },
  {
    title: "5. AI-assisted outputs",
    body: "DueScope uses automated and AI-assisted analysis to retrieve, summarise, classify, and score public-source and Customer-provided information. Outputs may contain errors, omissions, outdated information, false positives, false negatives, or incomplete source coverage. Customer must independently review reports, source links, confidence indicators, limitations, and rationale before relying on any output. DueScope does not provide legal, tax, investment, financial, sanctions, cybersecurity, privacy, procurement, or professional advice."
  },
  {
    title: "6. Cybersecurity and access control",
    body: "DueScope applies technical and organisational measures designed to protect the service, including authenticated access, owner-scoped records, server-side provider calls, protected payment boundaries, access controls, and operational monitoring. Customer is responsible for maintaining credential confidentiality, controlling account access, promptly revoking access for unauthorised users, and notifying DueScope without undue delay of suspected compromise, misuse, or unauthorised access."
  },
  {
    title: "7. Fees, taxes, and invoices",
    body: "Paid plans, subscriptions, and check packs are billed through Stripe or another payment processor made available by DueScope. Prices shown in the service are exclusive of VAT and other applicable taxes unless expressly stated otherwise. A 25% VAT line is added to paid purchases where the checkout tax configuration applies, and invoices are issued or made available through the payment processor. Customer is responsible for all fees, taxes, and payment information associated with its account."
  },
  {
    title: "8. Confidentiality",
    body: "Each party shall use commercially reasonable measures to protect non-public information disclosed by the other party and shall use such information only as necessary to perform or receive the service, comply with law, enforce these Terms, or protect the service. Confidentiality obligations do not apply to information that is public, independently developed, lawfully received from a third party, or required to be disclosed by law."
  },
  {
    title: "9. Availability and changes",
    body: "DueScope may modify, suspend, or discontinue features, integrations, plan limits, pricing, report formats, or provider relationships from time to time. The service may be unavailable due to maintenance, provider outages, rate limits, security events, network issues, force majeure events, or other circumstances beyond DueScope's reasonable control."
  },
  {
    title: "10. Term, suspension, and termination",
    body: "These Terms remain in effect while Customer maintains an account or uses the service. Customer may stop using the service at any time. DueScope may suspend or terminate access for non-payment, material breach, security risk, unlawful use, or conduct that may expose DueScope or other users to liability. Upon termination, Customer remains responsible for accrued fees and for exporting any reports it wishes to retain, subject to plan entitlements and applicable law."
  },
  {
    title: "11. Disclaimers and responsibility for decisions",
    body: "To the maximum extent permitted by applicable law, the service and outputs are provided on an as-is and as-available basis. DueScope does not warrant that reports will be complete, error-free, current, or sufficient for any specific regulatory, legal, procurement, investment, or compliance purpose. Customer retains sole responsibility for final decisions, escalations, approvals, enhanced due diligence, legal review, and external filings."
  },
  {
    title: "12. Intellectual property and licence",
    body: "DueScope and its licensors retain all right, title, and interest in and to the service, software, models, workflows, prompts, templates, user interface, documentation, know-how, and underlying technology. Subject to these Terms and payment of applicable fees, Customer receives a limited, revocable, non-exclusive, non-transferable right to access and use the service for its internal business purposes. Customer retains ownership of Customer Data and grants DueScope the rights necessary to host, process, transmit, display, secure, analyse, and otherwise handle Customer Data to provide and improve the service."
  },
  {
    title: "13. Feedback and improvements",
    body: "If Customer provides suggestions, ideas, enhancement requests, or other feedback, DueScope may use such feedback without restriction or obligation, provided that DueScope does not identify Customer as the source without permission. DueScope may use aggregated or de-identified operational, usage, and performance information to maintain, secure, improve, and develop the service."
  },
  {
    title: "14. Third-party services and public sources",
    body: "The service may depend on third-party infrastructure, payment processors, authentication providers, AI providers, search providers, public websites, official registers, sanctions or watchlist sources, map providers, and other external services. DueScope is not responsible for the accuracy, availability, terms, or content of third-party sources. Customer acknowledges that third-party source availability, rate limits, content changes, and provider restrictions may affect report completeness and service performance."
  },
  {
    title: "15. Export control, sanctions, and restricted use",
    body: "Customer shall not access or use the service in violation of applicable export-control, sanctions, anti-boycott, anti-money-laundering, anti-corruption, or counter-terrorist financing laws. Customer represents that it is not barred from using the service under applicable sanctions or export-control rules and will not make the service available to any person or entity where doing so would be prohibited."
  },
  {
    title: "16. Limitation of liability",
    body: "To the maximum extent permitted by applicable law, DueScope shall not be liable for indirect, incidental, special, consequential, exemplary, punitive, or loss-of-profit damages, or for loss of revenue, goodwill, data, business opportunity, procurement outcome, investment outcome, compliance decision, or regulatory position. DueScope's aggregate liability arising out of or relating to the service shall not exceed the fees paid by Customer to DueScope for the service during the six months preceding the event giving rise to the claim. These limitations apply regardless of the legal theory and even if a remedy fails of its essential purpose."
  },
  {
    title: "17. Customer indemnity",
    body: "Customer shall defend, indemnify, and hold harmless DueScope from and against claims, damages, fines, penalties, costs, and expenses arising from Customer Data, Customer's screening instructions, Customer's use of outputs, Customer's breach of these Terms, Customer's unlawful processing of personal data, or Customer's violation of third-party rights or applicable law."
  },
  {
    title: "18. Notices",
    body: "DueScope may provide notices through the service, by email to the account address, through billing or support channels, or by posting updated terms in the service. Customer is responsible for maintaining current contact information. Notices are deemed received when made available in the service or sent to the email address associated with the account."
  },
  {
    title: "19. Assignment, subcontracting, and affiliates",
    body: "Customer may not assign or transfer these Terms without DueScope's prior written consent, except to a successor in connection with a merger, reorganisation, or sale of substantially all assets, provided the assignee assumes all obligations. DueScope may assign these Terms to an affiliate or successor and may subcontract performance of the service, provided DueScope remains responsible for its obligations under these Terms."
  },
  {
    title: "20. Governing law and disputes",
    body: "Unless a separate written agreement states otherwise, these Terms are governed by the laws of Sweden, without regard to conflict-of-law rules. The parties shall first attempt in good faith to resolve disputes through executive-level discussions. Any dispute not resolved informally shall be submitted to the competent courts of Sweden, except that either party may seek urgent injunctive or equitable relief where necessary to protect confidential information, intellectual property, security, or service integrity."
  },
  {
    title: "21. Amendments, severability, and waiver",
    body: "DueScope may update these Terms from time to time by posting a revised version or otherwise notifying Customer. Material changes will apply prospectively unless required by law or necessary for security, compliance, or service integrity. If any provision is held invalid or unenforceable, the remaining provisions remain in effect. A party's failure to enforce a provision is not a waiver of future enforcement."
  },
  {
    title: "22. Order of precedence",
    body: "If Customer has a separately signed written agreement with DueScope, that agreement controls to the extent of any conflict. Otherwise these Terms, together with the Data Processing Addendum below and any applicable order, plan, or checkout terms, constitute the agreement between the parties concerning the service."
  }
];

const dpaClauses = [
  {
    title: "DPA 1. Scope and role of the parties",
    body: "This Data Processing Addendum (DPA) forms part of the Terms where DueScope processes Customer Personal Data on behalf of Customer. For Customer Personal Data submitted to, generated within, or stored in the service for Customer's due diligence purposes, Customer acts as controller and DueScope acts as processor. DueScope may act as an independent controller for limited account administration, billing, security, compliance, and service analytics data."
  },
  {
    title: "DPA 2. Subject matter, duration, nature, and purpose",
    body: "The subject matter of processing is the provision, operation, support, security, billing, and improvement of the DueScope service. The duration of processing is the term of Customer's account and any post-termination retention period required by law, security, accounting, dispute-resolution, or backup practices. The nature and purpose of processing include hosting Customer inputs, generating and storing due diligence reports, maintaining watchlists, authenticating users, providing support, securing the service, and fulfilling billing and legal obligations."
  },
  {
    title: "DPA 3. Documented instructions",
    body: "DueScope shall process Customer Personal Data only on Customer's documented instructions, including these Terms, Customer's use of product settings, and Customer's submitted requests, unless required to do otherwise by applicable law. If DueScope is legally required to process Customer Personal Data other than on Customer's instructions, DueScope will inform Customer before such processing unless prohibited by law."
  },
  {
    title: "DPA 4. Categories of data and data subjects",
    body: "Customer Personal Data may include account user names, email addresses, company details, submitted target names, public role information, aliases, URLs, jurisdictional context, watchlist entries, report content, source references, usage records, and support communications. Data subjects may include Customer users, Customer representatives, screened individuals, beneficial owners, directors, officers, public officials, politically exposed persons, counterparties, suppliers, customers, partners, and other persons identified in public-source diligence materials."
  },
  {
    title: "DPA 5. Confidentiality and personnel",
    body: "DueScope shall ensure that persons authorised to process Customer Personal Data are subject to appropriate confidentiality obligations and receive access only as necessary for service operation, support, security, compliance, or maintenance."
  },
  {
    title: "DPA 6. Security measures",
    body: "Taking into account the nature of processing, DueScope shall maintain appropriate technical and organisational measures designed to protect Customer Personal Data against accidental or unlawful destruction, loss, alteration, unauthorised disclosure, or access. Measures may include authentication, access limitation, owner-scoped records, provider-secret isolation, secure server-side processing boundaries, logging, payment-provider segregation, and operational safeguards."
  },
  {
    title: "DPA 7. Sub-processors and providers",
    body: "Customer authorises DueScope to engage sub-processors and service providers necessary to deliver the service, including hosting, database, authentication, payment, AI, search, monitoring, and support providers. DueScope shall impose data protection obligations on sub-processors that are materially consistent with this DPA. DueScope remains responsible for its sub-processors' performance of their data protection obligations to the extent required by applicable data protection law."
  },
  {
    title: "DPA 8. International transfers",
    body: "Where Customer Personal Data is transferred internationally, DueScope shall use an appropriate transfer mechanism where required by applicable data protection law, such as Standard Contractual Clauses, adequacy decisions, or another lawful transfer basis. Customer acknowledges that public-source research and AI-assisted processing may involve providers or infrastructure outside Customer's jurisdiction."
  },
  {
    title: "DPA 9. Assistance with data subject rights and compliance",
    body: "Taking into account the nature of the processing and information available to DueScope, DueScope shall provide reasonable assistance to Customer for responding to data subject requests and for Customer's compliance with security, breach-notification, data protection impact assessment, and supervisory-authority consultation obligations. Customer remains responsible for determining whether and how to respond to data subjects and regulators."
  },
  {
    title: "DPA 10. Personal data breach",
    body: "DueScope shall notify Customer without undue delay after becoming aware of a personal data breach affecting Customer Personal Data, and shall provide information reasonably available to DueScope to help Customer meet its breach-notification obligations. Notification is not an admission of fault or liability."
  },
  {
    title: "DPA 11. Deletion and return",
    body: "Upon termination or written request, DueScope shall delete or return Customer Personal Data in accordance with product functionality, support procedures, legal requirements, backup retention, security needs, and legitimate accounting or dispute-resolution obligations. Residual copies may persist in backups or logs for a limited period before deletion through ordinary lifecycle controls."
  },
  {
    title: "DPA 12. Audit and information",
    body: "DueScope shall make available information reasonably necessary to demonstrate compliance with this DPA. Audits must be limited to once annually unless required by law or following a confirmed material security incident, conducted on reasonable prior notice, during normal business hours, and subject to confidentiality, security, and non-disruption requirements."
  },
  {
    title: "DPA 13. Sub-processor changes and objections",
    body: "DueScope may update its sub-processors as needed to provide, secure, or improve the service. Customer may object to a new sub-processor on reasonable data protection grounds by providing written notice within a reasonable period after being informed of the change. If the parties cannot resolve the objection, DueScope may suspend or terminate the affected service features without liability other than any prepaid fees for unused affected services."
  },
  {
    title: "DPA 14. Records, compliance, and instructions conflict",
    body: "DueScope shall maintain records and information reasonably necessary to demonstrate compliance with this DPA. If DueScope believes an instruction infringes applicable data protection law, DueScope may suspend the relevant processing and inform Customer unless legally prohibited. Customer is responsible for ensuring its instructions are lawful, specific, and documented."
  },
  {
    title: "DPA 15. Regulated and sensitive data restrictions",
    body: "The service is not designed for unrestricted processing of special categories of personal data, criminal-offence data, payment-card data, health data, children's data, credentials, government secrets, or similarly regulated information. Customer shall not submit such data unless expressly permitted by DueScope in writing and supported by an appropriate legal basis, risk assessment, and instructions."
  },
  {
    title: "DPA 16. DPA precedence",
    body: "In the event of a conflict between this DPA and the main Terms regarding the processing of Customer Personal Data, this DPA controls to the extent of the conflict. In all other respects, the Terms remain in full force and effect."
  }
];

const dpaSchedule = [
  "Subject matter: provision of source-backed due diligence workflow software.",
  "Processing purpose: account administration, target screening, report generation, watchlist monitoring, support, billing, security, and compliance.",
  "Data subjects: Customer users, screened targets, public officials, beneficial owners, directors, officers, counterparties, and other persons appearing in submitted or public-source diligence material.",
  "Data categories: identifiers, contact details, public professional roles, aliases, jurisdictional context, risk report content, source references, usage records, billing references, and support communications.",
  "Special categories: not required for the service and must not be submitted unless Customer has a valid legal basis and explicit authority.",
  "Retention: for the account term and applicable backup, billing, legal, security, and dispute-resolution periods.",
  "Processor instructions: the Terms, Customer's account settings, submitted screening requests, support requests, and documented written instructions.",
  "Sub-processor categories: cloud hosting, database, authentication, payment, AI, search, monitoring, logging, analytics, communications, and support providers.",
  "Technical and organisational measures: authentication, access controls, owner-scoped records, provider-secret isolation, transport security, operational logging, backup controls, payment segregation, and incident response procedures."
];

function renderClauseList(items) {
  return `
    <ul class="agreement-clause-list">
      ${items.map((item) => `<li>${item}</li>`).join("")}
    </ul>
  `;
}

function renderSections(items) {
  return items.map((section) => `
    <article class="card card-pad agreement-section">
      <h2>${section.title}</h2>
      <p>${section.body}</p>
    </article>
  `).join("");
}

function renderDpa() {
  return `
    <section class="agreement-dpa">
      <div class="section-heading">
        <h2>Data Processing Addendum</h2>
        <p>This DPA is intended to address controller-processor obligations where DueScope processes Customer Personal Data on Customer's behalf.</p>
      </div>
      <div class="agreement-sections">
        ${renderSections(dpaClauses)}
        <article class="card card-pad agreement-section">
          <h2>DPA Schedule</h2>
          ${renderClauseList(dpaSchedule)}
        </article>
      </div>
    </section>
  `;
}

export function renderAgreement() {
  return `
    <main class="agreement-page">
      <section class="agreement-hero">
        <div>
          <div class="eyebrow">Service terms</div>
          <h1>DueScope Service Terms</h1>
          <p>Contract terms for using DueScope, including service scope, customer obligations, cybersecurity, AI-assisted outputs, billing, and the Data Processing Addendum.</p>
        </div>
        <aside class="card card-pad agreement-summary">
          <strong>Effective date</strong>
          <span>May 7, 2026</span>
        </aside>
      </section>

      <section class="agreement-layout">
        <aside class="agreement-toc card card-pad">
          <h2>Included terms</h2>
          <ul>
            <li>Acceptance and authority</li>
            <li>Customer obligations</li>
            <li>Acceptable use</li>
            <li>Cybersecurity</li>
            <li>AI-assisted outputs</li>
            <li>VAT and billing</li>
            <li>Data Processing Addendum</li>
          </ul>
        </aside>
        <div class="agreement-sections">
          ${renderSections(sections)}
          ${renderDpa()}
        </div>
      </section>
    </main>
  `;
}
