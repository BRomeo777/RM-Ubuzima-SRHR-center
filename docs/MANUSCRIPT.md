# RM Ubuzima: Design and Implementation of a Privacy-First, Anonymous, Multilingual Digital Platform for Sexual and Reproductive Health and Rights Information and Services in Rwanda

**Running title:** A Privacy-First Anonymous SRHR Platform for Rwanda

---

## Authors

R. M. Bananeza¹*, on behalf of the RM Ubuzima Development Team¹

¹ Dr.R Technologies, Kigali, Rwanda

\*Corresponding author:
R. M. Bananeza
Dr.R Technologies, Kigali, Rwanda
Email: bananeza777@gmail.com
Tel: +250 783 679 400

---

## Abstract

**Background:** Access to accurate sexual and reproductive health and rights (SRHR) information remains constrained for adolescents and young adults in low- and middle-income countries (LMICs) by stigma, confidentiality concerns, cost, language barriers, and uneven service availability. Mobile digital health (mHealth) tools can reduce these barriers, but many existing platforms require personal identifiers, depend on continuous high-bandwidth connectivity, offer content in a single language, and provide no safety mechanism for users in coercive or unsafe environments.

**Objective:** We aimed to design, implement, and document a privacy-first, fully anonymous, multilingual, low-cost mobile-first platform—*RM Ubuzima*—that delivers curated SRHR information and connects users to real-time human and clinical support in the Rwandan context, while embedding user-safety features appropriate to sensitive health seeking.

**Methods:** Using a design-and-development methodology, we built a Progressive Web Application (PWA) with a React 18/TypeScript front end, Tailwind CSS, a Zustand state layer, and a serverless Google Firebase Firestore back end providing real-time synchronization. The platform integrates the Groq large language model (LLM) application programming interface (API) for AI-generated educational content, OpenStreetMap/Leaflet for facility mapping, and Jitsi Meet for scheduled video consultations. Core design principles were (1) anonymity by default (no email, phone number, or device tracking required), (2) offline-tolerant, low-data operation, (3) multilingual delivery in English, Kinyarwanda, French, and Swahili, (4) safety-by-design including an instant "decoy mode," and (5) tiered human moderation via a badge-based facilitator system.

**Results:** The implemented platform comprises twelve integrated modules: anonymous authentication, an AI-curated daily information feed, a searchable multilingual SRHR library, a geolocated facility finder, anonymous provider booking, a weekly live "Baza Muganga" video clinic, a moderated community chat, discussion groups, an emergency-contacts directory, a confidential "Girls Room" with a "Big Sister" (Shangazi) mentor chat and consent-education modules, and a new "Mpuza" service hub that connects users directly to legal and human-rights advisors, family-planning, safe-abortion information, and gender-based-violence (GBV) support. A four-tier facilitator badge system (Facilitator, Shangazi, Healthcare Provider, Legal Advisor) governs privileges and routes private conversations to appropriately trained responders. Safety engineering includes a keyboard-activated decoy screen, no persistent personal data, and confidential one-to-one messaging on isolated data collections. The platform is deployable at near-zero recurring cost on free-tier infrastructure, targeting sustainability for community-scale deployment.

**Conclusions:** RM Ubuzima demonstrates that a comprehensive, safety-conscious, anonymous SRHR platform can be delivered for an LMIC context using entirely free-tier, serverless infrastructure and modern web technologies. The design contributes a replicable reference architecture that couples privacy-by-default and safety-by-design with multilingual, human-in-the-loop support. Prospective mixed-methods evaluation of reach, engagement, acceptability, and health-service linkage is warranted and is outlined as the next phase of this work.

**Keywords:** sexual and reproductive health and rights; SRHR; digital health; mHealth; Rwanda; privacy by design; anonymity; adolescent health; low- and middle-income countries; progressive web application; artificial intelligence; gender-based violence

---

## 1. Introduction

### 1.1 Background

Sexual and reproductive health and rights (SRHR) are foundational to individual well-being and to the achievement of the United Nations Sustainable Development Goals (SDGs), particularly SDG 3 (good health and well-being) and SDG 5 (gender equality) [1]. Adolescents and young adults in sub-Saharan Africa bear a disproportionate burden of adverse SRHR outcomes, including early and unintended pregnancy, sexually transmitted infections including HIV, unsafe abortion, and gender-based violence (GBV) [2,3]. In Rwanda, national policy has advanced adolescent and youth SRHR, yet young people continue to report barriers to information and care, including fear of judgment, concerns about confidentiality, limited youth-friendly services, and cultural sensitivities around discussing sexuality [4,5].

Digital and mobile health (mHealth) interventions offer a promising route to overcome several of these barriers by delivering information privately, on demand, and at scale [6,7]. Mobile-phone penetration in Rwanda is high and continues to grow, and young people are frequent users of internet-enabled devices [8]. Digital tools can provide confidential, non-judgmental spaces that reduce the social cost of seeking sensitive information, and can bridge users to formal health services when needed [9].

### 1.2 Gaps in Existing Solutions

Despite the promise of mHealth for SRHR, several recurring limitations reduce the real-world effectiveness of existing platforms for LMIC youth:

1. **Identity and privacy risk.** Many platforms require registration with an email address or phone number, creating a data trail that deters privacy-sensitive users and can expose them to risk if a device is shared or monitored [10].
2. **Connectivity and cost assumptions.** Solutions built for high-bandwidth, always-online contexts perform poorly where data is expensive or intermittent [11].
3. **Language exclusion.** Content offered only in English or French excludes users most comfortable in local languages such as Kinyarwanda and Swahili.
4. **Absence of safety features.** Few platforms consider the physical safety of a user who may be browsing sensitive content in a coercive household or relationship, or who needs to conceal usage instantly.
5. **Information without linkage.** Static information repositories frequently lack a pathway to real human support—clinical, psychosocial, or legal—leaving users informed but unconnected.
6. **Unsustainable cost models.** Platforms dependent on paid cloud infrastructure or per-message gateways often cannot be sustained by community organizations after initial grant funding ends.

### 1.3 Objectives

To address these gaps, we set out to design, implement, and document **RM Ubuzima** (from Kinyarwanda *ubuzima*, "health/life"), a privacy-first, anonymous, multilingual, low-cost SRHR platform for the Rwandan context. Our specific objectives were to:

1. Build a mobile-first platform that requires **no personal identifiers** and stores **no tracking data** by default.
2. Deliver curated and AI-assisted SRHR education in **four languages** (English, Kinyarwanda, French, Swahili).
3. **Link users to real human support**—healthcare providers, trained mentors, and legal/human-rights advisors—through confidential real-time channels.
4. Embed **safety-by-design** features appropriate to sensitive health seeking, including an instant concealment ("decoy") mode.
5. Achieve **financial sustainability** through an architecture deployable on free-tier infrastructure at community scale.

This paper reports the design rationale, system architecture, feature set, and safety and privacy engineering of the implemented platform, and outlines a protocol for prospective evaluation.

---

## 2. Methods

### 2.1 Study Design and Development Approach

We followed an iterative design-and-development methodology consistent with recommendations for reporting the development of digital health interventions [12]. Development proceeded through cycles of requirement definition, implementation, internal testing, and refinement. Requirements were grounded in the documented SRHR access barriers described above and in principles of youth-friendly health services: accessibility, acceptability, equity, appropriateness, and effectiveness [13]. This manuscript reports the design and implementation phase; formal user-facing effectiveness evaluation is proposed as future work (Section 4.5).

### 2.2 Guiding Design Principles

Five principles governed all design decisions:

- **P1 — Privacy by default.** No email, phone number, or real name is required to use core features. No behavioral tracking, advertising identifiers, or third-party analytics cookies are employed.
- **P2 — Safety by design.** The platform assumes some users browse in unsafe contexts and provides an instant concealment mechanism and confidential, siloed communication channels.
- **P3 — Linguistic inclusion.** All interface strings and key content are available in English, Kinyarwanda, French, and Swahili, with automatic language detection and manual override.
- **P4 — Low-resource tolerance.** The application is a Progressive Web App (PWA) that is installable, works on modest devices, and minimizes data use.
- **P5 — Sustainability.** The system runs on free-tier, serverless infrastructure to remove recurring hosting costs as a barrier to continued operation.

### 2.3 System Architecture

RM Ubuzima is implemented as a client-centric Progressive Web Application. The architecture is deliberately serverless to minimize operational cost and maintenance burden.

**Front end.** The user interface is built with React 18 and TypeScript, bundled with Vite, and styled with Tailwind CSS. Client-side state is managed with Zustand, using a persistence layer that separates ephemeral session state from persistent user preferences. Routing is handled by React Router v6. Internationalization uses the i18next framework with browser language detection.

**Back end and data synchronization.** Persistent, shared data (educational posts, appointments, community and private messages, groups, facility metadata, emergency contacts) are stored in Google Firebase Firestore, a serverless NoSQL document database that provides real-time synchronization across clients via subscription listeners. This enables features such as live chat and instantly propagated administrative updates without a bespoke server.

**Storage strategy.** A three-tier storage model is used: (i) Firestore for cloud-synchronized shared data; (ii) browser `localStorage` for administrative settings, user preferences, and authentication state; and (iii) `sessionStorage` for transient session data. This division keeps sensitive session context off the network while allowing legitimate cross-device synchronization of public content.

**Third-party integrations.**
- **Artificial intelligence:** The Groq LLM API (Llama-3-family model) generates educational daily-feed content and powers an in-app navigation assistant. All AI output is constrained by system prompts that (a) restrict scope to educational information, (b) mandate an explicit "not medical advice" disclaimer, and (c) redirect personalized medical questions to qualified professionals or appropriate app sections.
- **Mapping:** OpenStreetMap tiles rendered via Leaflet/react-leaflet provide a geolocated facility finder for hospitals, health centers, health posts, pharmacies, and private clinics, with routing and contact links.
- **Video consultation:** Jitsi Meet provides end-to-end-capable video rooms for the scheduled weekly clinic.

**Deployment.** The compiled static application is hosted on Hugging Face Spaces (free static hosting). Combined with Firebase's free tier (documented allowances of approximately 50,000 reads/day, 20,000 writes/day, and 1 GB storage at time of writing), the platform targets a recurring infrastructure cost of zero for community-scale usage.

### 2.4 Privacy and Safety Engineering

Consistent with principles P1 and P2, the following mechanisms were implemented:

- **Anonymous onboarding.** Users may enter with a system-generated pseudonymous display name and a selectable avatar (rendered via a DiceBear-style generator). No email or phone number is required for anonymous entry.
- **No tracking.** The platform employs no advertising trackers or analytics cookies; ephemeral session data remains client-side.
- **Decoy mode.** A discreet keyboard shortcut instantly replaces the entire interface with an innocuous "Project Documentation" technical page, allowing a user to conceal activity if observed. Returning to the app is equally discreet.
- **Siloed confidential messaging.** One-to-one conversations (e.g., mentor and legal-advisor chats) are stored in dedicated, isolated Firestore collections separate from public chat, and are queried using participant-scoped access patterns.
- **Data minimization in service requests.** Appointment booking supports an explicit anonymous option, collecting only what is necessary to arrange contact.

### 2.5 Human-in-the-Loop Moderation: The Facilitator Badge System

To connect users with appropriately trained humans while maintaining safety, we implemented a four-tier badge system that governs privileges and message routing:

- **F — Facilitator:** general community moderator with content and moderation privileges.
- **S — Shangazi (Big Sister):** a trusted mentor authorized to provide confidential peer support within the Girls Room.
- **H — Healthcare Provider:** a verified clinical professional.
- **L — Legal Advisor:** a legal and human-rights specialist serving the Mpuza legal channel.

Badges are assigned by an administrator through an approval workflow and are persisted to the user record for cross-device continuity. Each private-chat surface subscribes only to conversations with holders of the relevant badge, ensuring that, for example, a legal query is routed to a Legal Advisor rather than to general community moderators.

### 2.6 Ethical Considerations

The platform is designed for the delivery of educational information and the facilitation of voluntary contact with support services; it does not itself provide medical diagnosis or treatment. All AI-generated content carries mandatory disclaimers stating that it is educational and not a substitute for professional consultation. Because core use is anonymous and no personal identifiers are collected by default, the platform minimizes data-protection risk. Formal ethical review will be sought prior to the prospective evaluation described in Section 4.5, in accordance with Rwandan national research ethics requirements.

---

## 3. Results: The Implemented Platform

The delivered platform comprises twelve integrated modules. We describe each in terms of purpose and implemented functionality.

### 3.1 Anonymous Authentication

Users access the platform without providing personal identifiers. The onboarding flow offers a generated pseudonymous name and avatar selection, supports optional persistent (remembered) sessions, and exposes the decoy-mode hint at entry. An optional account layer (via Firebase Authentication) exists for users who wish to recover a persistent identity, but anonymity remains the default path.

### 3.2 AI-Curated Daily Feed

A personalized home feed presents short, medium, or long educational posts generated by the integrated LLM under strict educational-scope prompts. Two AI personae are implemented: **RM Admin**, an app-navigation assistant that explicitly declines to give medical advice and redirects users to appropriate resources; and **Hekimo**, which summarizes trending SRHR topics with disclaimers. Content is generated per language, and each post records non-identifying view counts for content-management purposes.

### 3.3 Multilingual SRHR Library

An administrator-curated library organizes educational articles by topic. Each article supports title and body content in all four languages plus images and videos, and is fully searchable. This provides an authoritative, human-reviewed complement to the AI feed.

### 3.4 Facility Finder

An interactive OpenStreetMap/Leaflet map helps users locate nearby hospitals, health centers, health posts, pharmacies, and private clinics. Facilities carry structured, verifiable contact records, service listings, hours, and one-tap directions and calling. The map supports geolocation, search, and filtering.

### 3.5 Anonymous Provider Booking ("Book Doctor")

Users can request a consultation with an SRHR healthcare provider. The form supports an anonymous mode and issues a reference number for follow-up. Requests synchronize in real time to the administrative interface, where they can be triaged, assigned to a provider, and returned to the user with feedback.

### 3.6 Weekly Live Clinic ("Baza Muganga")

A recurring, scheduled video clinic (configured for a weekly Friday evening slot in Central Africa Time) is delivered through Jitsi Meet. The module computes a live countdown using timezone-accurate logic, opens the room only within the scheduled window, and supports pseudonymous participation and camera-off attendance for privacy.

### 3.7 Moderated Community Chat

A real-time global chat allows anonymous peer discussion. AI personae can contribute, and facilitators—identified by their badges—moderate content, pin announcements, and enforce community terms. Messages support replies and reactions, and moderation actions (deletion, banning) are available to privileged roles.

### 3.8 Discussion Groups

A WhatsApp-inspired groups feature allows the creation of public or private topic-based groups with configurable permissions (who may post, who may edit group information, whether joining requires approval), invite links, member and admin roles, and group-level real-time chat. Group creation follows an administrative approval workflow.

### 3.9 Emergency Contacts

A categorized directory (police, ambulance, fire, suicide prevention, GBV, youth services, and other) provides one-tap calling and silent SMS options. The interface emphasizes that location is never automatically shared and that contact is confidential.

### 3.10 Girls Room

A confidential space designed for girls and young women combines (i) **Baza Shangazi**, a private one-to-one chat with a trusted "Big Sister" mentor (badge S), with conversation history and online-presence indicators; and (ii) **consent-education and life-skills modules**, including scenario-based consent training with an answer-history feature. Conversations are stored in an isolated collection and are private to the participants.

### 3.11 Mpuza Service Hub

*Mpuza* (Kinyarwanda, connoting "connect/introduce me") is a service hub that links users to the right human support. It presents four sub-services: **Legal and Human Rights Affairs**, **Family Planning**, **Safe Abortion information**, and **Gender-Based Violence support**. The first of these, Legal and Human Rights Affairs, is fully implemented as a confidential real-time chat that connects a user directly to a Legal Advisor (badge L). Mirroring the Shangazi architecture, it uses a dedicated Firestore collection, an advisor-selection view showing available advisors and prior conversations, and a private chat interface with optimistic message delivery and delivery-status feedback. This enables a person who has experienced a rights violation to reach legal support directly and confidentially.

### 3.12 Settings, Notifications, and Accessibility

Users can select their language, toggle notifications and dark mode, review privacy and terms content (available in all four languages), access a help center, and apply to become a facilitator. An in-app notification system supports announcements, reminders, event alerts (e.g., the weekly clinic), and private messages.

### 3.13 Summary of Delivered Capabilities

Table 1 maps each design objective to the implemented features that satisfy it.

**Table 1. Mapping of design objectives to implemented features.**

| Objective | Implemented features |
|---|---|
| O1: No personal identifiers; no tracking | Anonymous onboarding with generated name/avatar; no analytics cookies; client-side session data; decoy mode |
| O2: Multilingual education | i18next four-language interface; multilingual SRHR library; per-language AI feed |
| O3: Linkage to human support | Book Doctor; weekly Jitsi clinic; Shangazi mentor chat; Mpuza Legal Advisor chat; emergency directory |
| O4: Safety by design | Decoy mode; siloed confidential collections; anonymous booking; no auto-location sharing |
| O5: Sustainability | Serverless Firestore + static hosting on free tiers; PWA installability; low-data operation |

---

## 4. Discussion

### 4.1 Principal Findings

We designed and implemented a comprehensive SRHR platform that operationalizes privacy-by-default and safety-by-design within a low-cost, serverless, multilingual architecture. The principal contribution is a demonstration that an anonymous, human-in-the-loop SRHR service—spanning curated and AI-assisted education, geolocated service discovery, confidential mentorship, clinical booking and tele-clinic, and direct legal/human-rights support—can be assembled entirely on free-tier infrastructure suitable for a resource-constrained setting. The four-tier badge system provides a simple but effective mechanism for routing sensitive conversations to appropriately trained responders, and the decoy mode represents a concrete safety affordance rarely present in comparable tools.

### 4.2 Comparison with Prior Work

Prior SRHR mHealth efforts in LMICs have frequently relied on SMS or single-purpose apps and have generally required some form of registration or phone-based identity [6,7,9]. RM Ubuzima differs in three respects. First, anonymity is the default rather than an add-on, reducing the disclosure cost of engagement. Second, the platform integrates *information and linkage* in one place—coupling educational content with direct, confidential access to mentors, clinicians, and legal advisors—rather than serving as a standalone repository. Third, the explicit inclusion of safety concealment (decoy mode) and legal/human-rights linkage extends the scope beyond clinical information toward the broader "rights" dimension of SRHR, which is often neglected in digital tools.

### 4.3 Strengths

Key strengths include: comprehensive multilingual coverage across four languages; a privacy-preserving, no-identifier default; a sustainable zero-recurring-cost deployment model; real-time human support routed by role; and safety features tailored to sensitive health seeking. The use of a widely supported PWA stack lowers the barrier to installation and updates without app-store gatekeeping.

### 4.4 Limitations

This paper reports design and implementation; it does not yet report user-facing outcomes such as reach, engagement, acceptability, or health-service linkage, and therefore effectiveness cannot be claimed. Reliance on third-party free tiers introduces dependency and quota risk at larger scale. LLM-generated content, although constrained by disclaimers and educational-scope prompts, requires ongoing human oversight to mitigate the risk of inaccuracy. The availability and responsiveness of human responders (mentors, clinicians, legal advisors) depend on recruitment and retention of trained facilitators. Finally, anonymity, while protective, complicates longitudinal follow-up and safeguarding escalation, which must be handled through carefully designed referral pathways.

### 4.5 Future Work: Proposed Evaluation

We propose a prospective, mixed-methods evaluation following formal ethical approval. Quantitative indicators would include reach and adoption (installations, active users), engagement (session frequency and depth, feature use), and linkage (bookings made, clinic attendance, confidential-chat initiations), measured through privacy-preserving, non-identifying aggregate counters already present in the system. Qualitative methods—focus groups and in-depth interviews with young users and facilitators—would assess acceptability, perceived confidentiality, comprehension across languages, and the usability of safety features. Acceptability could be quantified with validated instruments such as the System Usability Scale. Subsequent phases could evaluate effects on SRHR knowledge and on service-seeking behavior. Completion of the remaining Mpuza sub-services (family planning, safe-abortion information, GBV support) and formal security and data-protection auditing are additional priorities.

### 4.6 Implications

For program implementers in LMICs, RM Ubuzima offers a replicable reference architecture showing that comprehensive, safety-conscious SRHR services can be delivered sustainably without recurring infrastructure cost. For designers of sensitive digital health tools, it illustrates concrete patterns—anonymity by default, siloed confidential channels, role-based human routing, and instant concealment—that can be adopted independently of this specific platform.

---

## 5. Conclusions

RM Ubuzima demonstrates the feasibility of a privacy-first, anonymous, multilingual, and safety-conscious SRHR platform built entirely on free-tier, serverless infrastructure and modern web technologies, tailored to the Rwandan context. By integrating curated and AI-assisted education with real-time, role-routed human support and embedding safety features appropriate to sensitive health seeking, the platform addresses several persistent limitations of existing tools. Prospective mixed-methods evaluation is the necessary next step to establish reach, acceptability, and impact, and to responsibly scale the approach.

---

## Abbreviations

AI: artificial intelligence; API: application programming interface; CAT: Central Africa Time; GBV: gender-based violence; HIV: human immunodeficiency virus; LLM: large language model; LMIC: low- and middle-income country; mHealth: mobile health; NoSQL: non-relational database; PWA: Progressive Web Application; SDG: Sustainable Development Goal; SMS: short message service; SRHR: sexual and reproductive health and rights.

---

## Declarations

**Ethics approval and consent to participate:** Not applicable to the design-and-implementation work reported here. Ethical approval from the relevant Rwandan institutional review board will be obtained prior to the prospective human-subjects evaluation described in Section 4.5.

**Consent for publication:** Not applicable.

**Availability of data and materials:** No participant datasets were generated or analyzed for this design-and-implementation report. Technical implementation details are described within the manuscript.

**Competing interests:** The author is affiliated with Dr.R Technologies, the developer of the RM Ubuzima platform. No other competing interests are declared.

**Funding:** The platform was developed using free-tier infrastructure; no external funding is declared for the work reported here.

**Authors' contributions:** RMB conceived, designed, implemented, and documented the platform and drafted the manuscript. All authors read and approved the final manuscript.

**Acknowledgements:** The author thanks the community facilitators and prospective mentors, healthcare providers, and legal advisors who informed the design of the support features.

---

## References

1. United Nations. Transforming our world: the 2030 Agenda for Sustainable Development. New York: United Nations; 2015.

2. Starrs AM, Ezeh AC, Barker G, et al. Accelerate progress—sexual and reproductive health and rights for all: report of the Guttmacher–Lancet Commission. Lancet. 2018;391(10140):2642–2692.

3. World Health Organization. Adolescent and young adult health. Geneva: WHO; 2023.

4. National Institute of Statistics of Rwanda, Ministry of Health, ICF. Rwanda Demographic and Health Survey 2019–20: Final Report. Kigali and Rockville: NISR/MOH/ICF; 2021.

5. Ministry of Health, Republic of Rwanda. Adolescent Sexual and Reproductive Health and Rights policy and strategic plan. Kigali: MOH; 2018.

6. Feroz A, Perveen S, Aftab W. Role of mHealth applications for improving antenatal and postnatal care in low and middle income countries: a systematic review. BMC Health Serv Res. 2017;17:704.

7. L'Engle KL, Mangone ER, Parcesepe AM, Agarwal S, Ippoliti NB. Mobile phone interventions for adolescent sexual and reproductive health: a systematic review. Pediatrics. 2016;138(3):e20160884.

8. Rwanda Utilities Regulatory Authority. Statistics report for the telecom, media and broadcasting sector. Kigali: RURA; 2023.

9. Hightow-Weidman LB, Muessig KE, Bauermeister JA, LeGrand S, Fiellin LE. The future of digital games for HIV prevention and care. Curr Opin HIV AIDS. 2017;12(5):501–507.

10. Cavoukian A. Privacy by design: the 7 foundational principles. Toronto: Information and Privacy Commissioner of Ontario; 2011.

11. van Heerden A, Tomlinson M, Swartz L. Point of care in your pocket: a research agenda for the field of m-health. Bull World Health Organ. 2012;90(5):393–394.

12. Michie S, Yardley L, West R, Patrick K, Greaves F. Developing and evaluating digital interventions to promote behavior change in health and health care: recommendations resulting from an international workshop. J Med Internet Res. 2017;19(6):e232.

13. World Health Organization. Global standards for quality health-care services for adolescents. Geneva: WHO; 2015.

---

*Manuscript prepared for submission. Correspondence: bananeza777@gmail.com.*
