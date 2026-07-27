import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  Shield, 
  GraduationCap,
  MessageCircleHeart,
  ChevronRight,
  ChevronUp,
  X,
  Send,
  Lock,
  CheckCircle,
  AlertCircle,
  Phone,
  ArrowLeft,
  Play,
  Volume2,
  Stethoscope,
  Search,
  User,
  Brain,
  BookOpen,
  History,
  Home,
  MessageSquare,
  ExternalLink,
  Mic,
} from 'lucide-react';
import { cn } from '../utils/helpers';
import GirlIcon from '../components/GirlIcon';
import { useEphemeralStore, usePersistentStore } from '../store';
import type { Facilitator, DirectMessage, InboxConversation } from '../types';
import { subscribeToShangaziConversation, sendShangaziMessage, subscribeToUserShangaziInbox } from '../services/inboxService';
import { usePhoneBackNavigation } from '../hooks/usePhoneBackNavigation';
import VoiceRecorder from '../components/VoiceRecorder';
import VoicePlayer from '../components/VoicePlayer';
import VoiceSelector from '../components/VoiceSelector';
import { useVoiceNote } from '../hooks/useVoiceNote';

// --- Types ---
interface SisterMessage {
  id: string;
  content: string;
  sender: 'user' | 'sister';
  timestamp: string;
  isVoice?: boolean;
}

interface ConsentScenario {
  id: string;
  category: 'safety' | 'consent' | 'health' | 'rights' | 'relationships' | 'puberty' | 'hygiene' | 'mental_health' | 'future_planning';
  title: string;
  titleKinyarwanda?: string;
  description: string;
  descriptionKinyarwanda?: string;
  options: {
    text: string;
    textKinyarwanda?: string;
    isCorrect: boolean;
    feedback: string;
    feedbackKinyarwanda?: string;
  }[];
}

interface DailyAnswer {
  optionIndex: number;
  isCorrect: boolean;
  answeredAt: string;
}

interface EducationalContent {
  id: string;
  title: string;
  titleKinyarwanda?: string;
  type: 'audio' | 'video' | 'document';
  url: string;
  duration?: string;
  category: 'puberty' | 'relationships' | 'rights' | 'health' | 'safety' | 'mental_health';
  uploadedBy: string;
  uploadedAt: string;
  description?: string;
  descriptionKinyarwanda?: string;
}

// --- Daily Consent Quiz Types ---
interface DailyQuizState {
  lastQuizDate: string;
  answeredToday: string[];
  todaysQuestions: string[];
  allAnswers: Record<string, { scenarioId: string; optionIndex: number; date: string; isCorrect: boolean }>;
}

// --- OPTIMIZED: Q to Answer NO - Professional SRHR Scenarios (50 Scenarios) ---
// Theme: Practice Saying NO in Real-World SRHR Situations
const consentScenarios: ConsentScenario[] = [
  // === CONSENT & BODILY AUTONOMY (1-8) ===
  {
    id: '1',
    category: 'consent',
    title: 'Q: Boyfriend says "Prove your love"',
    titleKinyarwanda: 'Q: Umukunzi avuga "Ngaragaza urukundo"',
    description: 'Your boyfriend says: "If you really love me, you\'ll have sex with me." What do you say?',
    descriptionKinyarwanda: 'Umukunzi wawe avuga: "Niwankunda by\'ukuri, tuzasambane." Uravuga iki?',
    options: [
      { text: 'Say YES to keep him happy', textKinyarwanda: 'Vuga YEGO kugirango abe neza', isCorrect: false, feedback: 'Wrong! Your body is not currency for love. Someone who pressures you does not respect you.', feedbackKinyarwanda: 'S\'icyo! Umubiri wawe si ifaranga. Ukukurarikira ntakubaha.' },
      { text: 'Say NO: "My body, my rules. Love waits."', textKinyarwanda: 'Vuga OYA: "Umubiri wange, amategeko yanjye. Urukundo rutegereza."', isCorrect: true, feedback: 'Correct! NO is a complete sentence. True love respects boundaries.', feedbackKinyarwanda: 'Ukuli! OYA ni interuro yuzuye. Urukundo rwubaha.' },
      { text: 'Say MAYBE to buy time', textKinyarwanda: 'Vuga HARI IBYO kugirango ugire igihe', isCorrect: false, feedback: 'Maybe leaves door open for pressure. Say NO clearly.', feedbackKinyarwanda: 'Kuvuga HARI IBYO kigaragaza ko wemera. Vuga OYA.' }
    ]
  },
  {
    id: '2',
    category: 'consent',
    title: 'Q: Pressure to skip condoms',
    titleKinyarwanda: 'Q: Gusabwa kureka condom',
    description: 'Partner says: "I don\'t like condoms. We\'re both clean, right?" What is your response?',
    descriptionKinyarwanda: 'Umukunzi avuga: "Ntiwende condom. Twese turacyeze?" Wasubiza iki?',
    options: [
      { text: 'Agree since you trust them', textKinyarwanda: 'Emera kuko wizeye', isCorrect: false, feedback: 'Wrong! Trust does not prevent STIs or pregnancy.', feedbackKinyarwanda: 'S\'icyo! Kwizera ntikurinda indwara.' },
      { text: 'Say NO: "No condom, no sex. Non-negotiable."', textKinyarwanda: 'Vuga OYA: "Nta condom, nta mibonano."', isCorrect: true, feedback: 'Correct! NO condom means NO sex. Protect your health.', feedbackKinyarwanda: 'Ukuli! Nta condom bisobanuye OYA. Shikama.' },
      { text: 'Suggest pulling out instead', textKinyarwanda: 'Shyira mu bitekerezo kuvamo', isCorrect: false, feedback: 'Withdrawal is NOT reliable. Say NO to unprotected sex.', feedbackKinyarwanda: 'Kuvamo si uburyo bwizewe.' }
    ]
  },
  {
    id: '3',
    category: 'rights',
    title: 'Q: Family demands FGM',
    titleKinyarwanda: 'Q: Umuryango usaba guca',
    description: 'Your grandmother says: "You must be cut to be a proper woman." How do you respond?',
    descriptionKinyarwanda: 'Nyogokuru avuga: "Ugomba gucwa ngo ube umugore." Wasubiza iki?',
    options: [
      { text: 'Submit to tradition', textKinyarwanda: 'Emera umuco', isCorrect: false, feedback: 'Wrong! FGM is illegal and harmful. Your body belongs to YOU.', feedbackKinyarwanda: 'S\'icyo! Guca ni ibyaha. Umubiri wawe ari uwawe.' },
      { text: 'Say NO: "My body is mine. I refuse cutting."', textKinyarwanda: 'Vuga OYA: "Umubiri wange ari uwange. Nta guca."', isCorrect: true, feedback: 'Correct! NO to FGM. Seek help from authorities.', feedbackKinyarwanda: 'Ukuli! OYA ku guca. Shaka ubufasha.' },
      { text: 'Ask for a less severe cut', textKinyarwanda: 'Saba gucwa make', isCorrect: false, feedback: 'Any cutting is violation. Say NO completely.', feedbackKinyarwanda: 'Igice cyose ari ugukica uburenganzira.' }
    ]
  },
  {
    id: '4',
    category: 'consent',
    title: 'Q: Sexting request',
    titleKinyarwanda: 'Q: Gusabwa amafoto',
    description: 'Boyfriend texts: "Send me a sexy photo. I promise I won\'t share it." What do you reply?',
    descriptionKinyarwanda: 'Umukunzi yumvise: "Ndohereze amafoto. Ndahiye." Wasubiza iki?',
    options: [
      { text: 'Send one with face hidden', textKinyarwanda: 'Ndohereze afite mu maso hishe', isCorrect: false, feedback: 'Wrong! Any intimate photo can be traced back to you.', feedbackKinyarwanda: 'S\'icyo! Ifoto yose irashobora kukugaragaza.' },
      { text: 'Say NO: "I don\'t send intimate photos. Period."', textKinyarwanda: 'Vuga OYA: "Nta amafoto nohereza. Iherezo."', isCorrect: true, feedback: 'Correct! NO is final. Your privacy is non-negotiable.', feedbackKinyarwanda: 'Ukuli! OYA ni iherezo. Amabanga yawe ntago biganirizwa.' },
      { text: 'Send an old photo', textKinyarwanda: 'Ndohereze ifoto ya kera', isCorrect: false, feedback: 'Any photo is a risk. Say NO to all requests.', feedbackKinyarwanda: 'Ifoto yose ni akayiko. Vuga OYA.' }
    ]
  },
  {
    id: '5',
    category: 'safety',
    title: 'Q: Unsafe touch - "Keep it secret"',
    titleKinyarwanda: 'Q: Gutoucha - "Ribanga"',
    description: 'Relative touches you inappropriately and says: "This is our secret. Don\'t tell anyone." What do you do?',
    descriptionKinyarwanda: 'Umuryango agukoraho atandukanye avuga: "Iki ni ibanga. Ntubwire." Wukora iki?',
    options: [
      { text: 'Keep the secret', textKinyarwanda: 'Kubangira', isCorrect: false, feedback: 'Wrong! Secrets about abuse protect the abuser.', feedbackKinyarwanda: 'S\'icyo! Amabanga arinda ukoresha.' },
      { text: 'Say NO by telling a trusted adult NOW', textKinyarwanda: 'Vuga OYA ubwire umuntu wizeye UBU', isCorrect: true, feedback: 'Correct! NO to silence. Tell someone immediately.', feedbackKinyarwanda: 'Ukuli! OYA ku guhisha. Bwira ako kanya.' },
      { text: 'Avoid them but stay quiet', textKinyarwanda: 'Kwirabura ariko ntuvuge', isCorrect: false, feedback: 'Silence enables abuse. Speak up.', feedbackKinyarwanda: 'Kugira icyo uvuga byongera ihohoterwa.' }
    ]
  },
  {
    id: '6',
    category: 'consent',
    title: 'Q: Demanding phone password',
    titleKinyarwanda: 'Q: Gusabwa ijambo ry\'ibanga',
    description: 'Partner demands: "Give me your phone password or you\'re hiding something." What\'s your answer?',
    descriptionKinyarwanda: 'Umukunzi asaba: "Mpa ijambo." Wasubiza iki?',
    options: [
      { text: 'Give the password', textKinyarwanda: 'Shyira ijambo', isCorrect: false, feedback: 'Wrong! Privacy is a right, not a privilege.', feedbackKinyarwanda: 'S\'icyo! Amabanga ni uburenganzira.' },
      { text: 'Say NO: "Privacy is my right. Trust without surveillance."', textKinyarwanda: 'Vuga OYA: "Amabanga ari uburenganzira."', isCorrect: true, feedback: 'Correct! NO to surveillance. Healthy relationships respect privacy.', feedbackKinyarwanda: 'Ukuli! OYA ku kuburabura. Imito y\'ubuzima ireba amabanga.' },
      { text: 'Give a fake password', textKinyarwanda: 'Shyira ijambo ribeshya', isCorrect: false, feedback: 'Dishonesty is not the answer. Say NO clearly.', feedbackKinyarwanda: 'Uburyarya si igisubizo. Vuga OYA.' }
    ]
  },
  {
    id: '7',
    category: 'consent',
    title: 'Q: Drunk at party - suggests private room',
    titleKinyarwanda: 'Q: Wasinziwe - basaba aho hihishe',
    description: 'You\'ve been drinking. Someone suggests: "Let\'s go somewhere private." What\'s your response?',
    descriptionKinyarwanda: 'Wanyoye inzoga. Umuntu asaba: "Tujya aho hihishe." Wasubiza iki?',
    options: [
      { text: 'Go with them', textKinyarwanda: 'Ujye na we', isCorrect: false, feedback: 'Wrong! Alcohol impairs judgment and consent.', feedbackKinyarwanda: 'S\'icyo! Inzoga zica ubwenge.' },
      { text: 'Say NO: "I\'m staying with my friends."', textKinyarwanda: 'Vuga OYA: "Ndi kumwe n\'inshuti."', isCorrect: true, feedback: 'Correct! NO when impaired. Stay with friends.', feedbackKinyarwanda: 'Ukuli! OYA wanyoye inzoga. Eba nan\'inshuti.' },
      { text: 'Agree but ask them to be gentle', textKinyarwanda: 'Emera ariko usabe kuba neza', isCorrect: false, feedback: 'Impaired consent is not consent. Say NO.', feedbackKinyarwanda: 'Kwishimira wanyoye inzoga si ukwemera.' }
    ]
  },
  {
    id: '8',
    category: 'rights',
    title: 'Q: Forced marriage at 16',
    titleKinyarwanda: 'Q: Gushyingirwa ku myaka 16',
    description: 'Parents say: "We\'ve arranged your marriage. It\'s for the family\'s good." What do you say?',
    descriptionKinyarwanda: 'Babyeyi bavuga: "Twagufatanyije. Ni byiza ku muryango." Uravuga iki?',
    options: [
      { text: 'Accept for family honor', textKinyarwanda: 'Emera ku gahirane', isCorrect: false, feedback: 'Wrong! Child marriage violates your rights and future.', feedbackKinyarwanda: 'S\'icyo! Gushyingirwa ukiri muto kwica uburenganzira.' },
      { text: 'Say NO: "I\'m not ready. I choose my future."', textKinyarwanda: 'Vuga OYA: "Ntabwo niteguye. Nitora ejo haza."', isCorrect: true, feedback: 'Correct! NO to child marriage. You have rights to education and choice.', feedbackKinyarwanda: 'Ukuli! OYA ku gushyingirwa ukiri muto. Ufite uburenganzira.' },
      { text: 'Delay by asking for more time', textKinyarwanda: 'Tinda usabe igihe', isCorrect: false, feedback: 'Delay still leads to forced marriage. Say NO.', feedbackKinyarwanda: 'Gutinda biracyagerayo. Vuga OYA.' }
    ]
  },
  {
    id: '9',
    category: 'safety',
    title: 'Q: Teacher suggests private tutoring',
    titleKinyarwanda: 'Q: Mwarimu asaba kwiga wenyine',
    description: 'Teacher says: "Come to my house for extra lessons. Just you and me." How do you respond?',
    descriptionKinyarwanda: 'Mwarimu avuga: "Uze mu nzu yange kwiga. Tugire we n\'uwewe." Wasubiza iki?',
    options: [
      { text: 'Go to get better grades', textKinyarwanda: 'Ujye kugirango ubon amanota meza', isCorrect: false, feedback: 'Wrong! Private meetings with teachers can lead to exploitation.', feedbackKinyarwanda: 'S\'icyo! Gutana na mwarimu wenyine bishobora kuba ubwambuzi.' },
      { text: 'Say NO: "I prefer studying at school with others."', textKinyarwanda: 'Vuga OYA: "Nkunda kwiga ku ishuri nabandi."', isCorrect: true, feedback: 'Correct! NO to private meetings. Stay in public spaces.', feedbackKinyarwanda: 'Ukuli! OYA ku gutana wenyine. Eba ahantu haboneka.' },
      { text: 'Bring a friend along', textKinyarwanda: 'Jyana n\'inshuti', isCorrect: false, feedback: 'Better, but still risky. Say NO completely.', feedbackKinyarwanda: 'Byiza, ariko hari akayiko. Vuga OYA rwose.' }
    ]
  },
  {
    id: '10',
    category: 'rights',
    title: 'Q: Denied contraception at clinic',
    titleKinyarwanda: 'Q: Kwimwa imiti ku vuriro',
    description: 'Nurse says: "You\'re too young for contraceptives. Come back when you\'re married." What\'s your response?',
    descriptionKinyarwanda: 'Umuganga avuga: "Uri muto cyane. Garuka washyingirwe." Uravuga iki?',
    options: [
      { text: 'Leave and try elsewhere', textKinyarwanda: 'Genda ushye ahandi', isCorrect: false, feedback: 'Wrong! You have the RIGHT to contraception regardless of age.', feedbackKinyarwanda: 'S\'icyo! Ufite uburenganzira bwo kwita ku ndota.' },
      { text: 'Say NO to refusal: "I demand my reproductive rights."', textKinyarwanda: 'Vuga OYA: "Ndasaba uburenganzira bwanjye."', isCorrect: true, feedback: 'Correct! NO to being denied care. Demand proper care.', feedbackKinyarwanda: 'Ukuli! OYA ku kwimwa ubufasha. Saba ubufasha.' },
      { text: 'Lie about being married', textKinyarwanda: 'Shyigikira ko washyingirwe', isCorrect: false, feedback: 'Lying is unnecessary. Assert your rights.', feedbackKinyarwanda: 'Kubeshya ntibikenewe. Shyira uburenganzira.' }
    ]
  },
  {
    id: '11',
    category: 'consent',
    title: 'Q: Friend shares private photos of others',
    titleKinyarwanda: 'Q: Inshuti igusangiza amafoto',
    description: 'Friend shows you intimate photos of someone else: "Look what they sent me." How do you respond?',
    descriptionKinyarwanda: 'Inshuti ikubonera amafoto: "Reba yohererejwe." Wasubiza iki?',
    options: [
      { text: 'Look and laugh', textKinyarwanda: 'Reba useke', isCorrect: false, feedback: 'Wrong! Viewing non-consensual photos is illegal.', feedbackKinyarwanda: 'S\'icyo! Kureba amafoto ntaremewe.' },
      { text: 'Say NO: "I don\'t view shared intimate photos. Delete them."', textKinyarwanda: 'Vuga OYA: "Nta amafoto ndeba. Yasiba."', isCorrect: true, feedback: 'Correct! NO to revenge porn. Stand up for privacy.', feedbackKinyarwanda: 'Ukuli! OYA ku gusangiza. Shyira amabanga.' },
      { text: 'Pretend not to see', textKinyarwanda: 'Wigire ko utabonye', isCorrect: false, feedback: 'Silence enables abuse. Speak up.', feedbackKinyarwanda: 'Kugira icyo uvuga byongera ihohoterwa.' }
    ]
  },
  {
    id: '12',
    category: 'safety',
    title: 'Q: Stranger offers ride home',
    titleKinyarwanda: 'Q: Umuntu utazi aha akazi',
    description: 'Man in nice car says: "I know your parents. Let me drive you home." What\'s your response?',
    descriptionKinyarwanda: 'Umugabo mu modoka avuga: "Nzi babyeyi. Reka nkujyane." Wasubiza iki?',
    options: [
      { text: 'Accept the ride', textKinyarwanda: 'Emera akazi', isCorrect: false, feedback: 'Wrong! Never accept rides from strangers.', feedbackKinyarwanda: 'S\'icyo! Ntukemere akazi k\'umuntu utazi.' },
      { text: 'Say NO: "I walk with friends. Goodbye."', textKinyarwanda: 'Vuga OYA: "Nganze nan\'inshuti. Muraho."', isCorrect: true, feedback: 'Correct! NO to strangers. Walk in groups.', feedbackKinyarwanda: 'Ukuli! OYA ku bantu utazi. Kanza mu matsinda.' },
      { text: 'Ask him to call your parents first', textKinyarwanda: 'Musabe ama babyeyi', isCorrect: false, feedback: 'Engaging with strangers is risky. Say NO.', feedbackKinyarwanda: 'Kuvugana n\'umuntu utazi ni ibyago.' }
    ]
  },
  {
    id: '13',
    category: 'consent',
    title: 'Q: Partner wants sex when you\'re tired',
    titleKinyarwanda: 'Q: Umukunzi asaba igihe wacuze',
    description: 'You\'re exhausted and not in the mood. Partner says: "But I need you now." What do you say?',
    descriptionKinyarwanda: 'Wacuze. Umukunzi avuga: "Ariko ngukeneye." Uravuga iki?',
    options: [
      { text: 'Give in to avoid conflict', textKinyarwanda: 'Emera kugirango udahangana', isCorrect: false, feedback: 'Wrong! Consent must be enthusiastic. Tiredness means NO.', feedbackKinyarwanda: 'S\'icyo! Kwemera bisaba kwishimana.' },
      { text: 'Say NO: "Not tonight. I need rest. Respect that."', textKinyarwanda: 'Vuga OYA: "Uyu munsi oya. Ngukeneye kuryama."', isCorrect: true, feedback: 'Correct! NO when not in the mood. Consent is ongoing.', feedbackKinyarwanda: 'Ukuli! OYA igihe utifuza. Kwemera bihoraho.' },
      { text: 'Agree but not participate', textKinyarwanda: 'Emera ariko utifatanye', isCorrect: false, feedback: 'Half-consent is not consent. Say NO clearly.', feedbackKinyarwanda: 'Kwemera gusa si ukwemera.' }
    ]
  },
  {
    id: '14',
    category: 'consent',
    title: 'Q: Pressure to use drugs/alcohol',
    titleKinyarwanda: 'Q: Guhata kunywa inzoga',
    description: 'Friends say: "Come on, just one drink. Don\'t be boring." How do you respond?',
    descriptionKinyarwanda: 'Inshuti zibwira: "Reka, inzoga imwe. Ntube umunyu." Wasubiza iki?',
    options: [
      { text: 'Take one to fit in', textKinyarwanda: 'Fata imwe ngo uhite', isCorrect: false, feedback: 'Wrong! One can lead to more. Peer pressure is not friendship.', feedbackKinyarwanda: 'S\'icyo! Imwe ishobora gutera izindi.' },
      { text: 'Say NO: "I\'m good without it. Respect my choice."', textKinyarwanda: 'Vuga OYA: "Ndizeye nta yo. Ubahe agaciro."', isCorrect: true, feedback: 'Correct! NO to substance pressure. True friends respect boundaries.', feedbackKinyarwanda: 'Ukuli! OYA ku guhata. Inshuti z\'ukuri zubaha.' },
      { text: 'Fake drinking', textKinyarwanda: 'Wigire ko wanyoye', isCorrect: false, feedback: 'Dishonesty is stressful. Say NO confidently.', feedbackKinyarwanda: 'Kubeshya byagutera ingamba.' }
    ]
  },
  {
    id: '15',
    category: 'safety',
    title: 'Q: Online predator asks to meet',
    titleKinyarwanda: 'Q: Umuntu ku murongo asaba guhura',
    description: 'Someone you met online says: "Let\'s meet in person. I have gifts for you." What\'s your response?',
    descriptionKinyarwanda: 'Umuntu wamenye ku murongo avuga: "Reka duhure. Mfite impano." Wasubiza iki?',
    options: [
      { text: 'Meet in a public place', textKinyarwanda: 'Hurira ahantu haboneka', isCorrect: false, feedback: 'Wrong! Meeting online strangers is dangerous.', feedbackKinyarwanda: 'S\'icyo! Guhura nabamenye ku murongo ni ibyago.' },
      { text: 'Say NO: "I don\'t meet strangers from online."', textKinyarwanda: 'Vuga OYA: "Nta muntu nabaze ku murongo mbona."', isCorrect: true, feedback: 'Correct! NO to meeting online contacts. Block and report.', feedbackKinyarwanda: 'Ukuli! OYA ku guhura. Funga no gutanga amakuru.' },
      { text: 'Ask for more photos first', textKinyarwanda: 'Saba amafoto y\'umubiri', isCorrect: false, feedback: 'Photos can be fake. Say NO.', feedbackKinyarwanda: 'Amafoto arashobora kuba abeshya.' }
    ]
  },
  {
    id: '16',
    category: 'consent',
    title: 'Q: Isolating you from friends',
    titleKinyarwanda: 'Q: Guwugaza inshuti zawe',
    description: 'Partner says: "Your friends are bad influences. Spend all your time with me." How do you respond?',
    descriptionKinyarwanda: 'Umukunzi avuga: "Inshuti zawe zitera ibibi. Guhanagura umwanya wawe nanjye." Wasubiza iki?',
    options: [
      { text: 'Reduce time with friends', textKinyarwanda: 'Guhanagura umwanya n\'inshuti', isCorrect: false, feedback: 'Wrong! Isolation is control, not love.', feedbackKinyarwanda: 'S\'icyo! Guwugaza ni ugufata mu ntoki.' },
      { text: 'Say NO: "My friends matter. I won\'t isolate for you."', textKinyarwanda: 'Vuga OYA: "Inshuti zanje ari ngombwa. Nta guwugaza."', isCorrect: true, feedback: 'Correct! NO to isolation. Healthy relationships support friendships.', feedbackKinyarwanda: 'Ukuli! OYA ku guwugaza. Imito y\'ubuzima itera inshuti.' },
      { text: 'Agree to avoid arguments', textKinyarwanda: 'Emera kugirango udahangana', isCorrect: false, feedback: 'Giving in enables abuse. Say NO.', feedbackKinyarwanda: 'Gukemera byongera ihohoterwa.' }
    ]
  },
  {
    id: '17',
    category: 'safety',
    title: 'Q: Unsafe touch - "It\'s our secret"',
    titleKinyarwanda: 'Q: Gutoucha - "Ni ibanga"',
    description: 'Relative touches you inappropriately: "This is our secret. Don\'t tell anyone." What do you say?',
    descriptionKinyarwanda: 'Umuryango agukoraho: "Iki ni ibanga. Ntubwire." Uravuga iki?',
    options: [
      { text: 'Keep silent to protect family', textKinyarwanda: 'Kugira icyo uvuga kugirango urinde umuryango', isCorrect: false, feedback: 'Wrong! Secrets protect abusers. Speak up!', feedbackKinyarwanda: 'S\'icyo! Amabanga arinda abakoresha. Vuga!' },
      { text: 'Say NO by telling a trusted adult IMMEDIATELY', textKinyarwanda: 'Vuga OYA ubwire umuntu wizeye UBU', isCorrect: true, feedback: 'Correct! NO to silence. Report abuse immediately.', feedbackKinyarwanda: 'Ukuli! OYA ku guhisha. Tangaza ihohoterwa.' },
      { text: 'Avoid them quietly', textKinyarwanda: 'Kwirabura utavuge', isCorrect: false, feedback: 'Silence enables abuse. Speak up!', feedbackKinyarwanda: 'Kugira icyo uvuga byongera ihohoterwa.' }
    ]
  },
  {
    id: '18',
    category: 'rights',
    title: 'Q: Denied school during menstruation',
    titleKinyarwanda: 'Q: Kwimwa kwiga mu gihe cy\'imihango',
    description: 'School says: "Girls with periods must stay home. It\'s unclean." How do you respond?',
    descriptionKinyarwanda: 'Ishuri rivuga: "Abakobwa bafite imihango bagomba kuguma murugo." Wasubiza iki?',
    options: [
      { text: 'Stay home to respect tradition', textKinyarwanda: 'Guma murugo kugirango ubehe umuco', isCorrect: false, feedback: 'Wrong! Period stigma violates your right to education.', feedbackKinyarwanda: 'S\'icyo! Gutsinda imihango kwica uburenganzira bwo kwiga.' },
      { text: 'Say NO: "Menstruation is natural. I demand my education."', textKinyarwanda: 'Vuga OYA: "Imihango ari iy\'kamere. Ndasaba kwiga."', isCorrect: true, feedback: 'Correct! NO to period discrimination. Education is your right.', feedbackKinyarwanda: 'Ukuli! OYA ku gutsinda. Uburenganzira bwo kwiga ni ubwawe.' },
      { text: 'Hide it and attend anyway', textKinyarwanda: 'Wihishe uze nk\'ubisanzwe', isCorrect: false, feedback: 'Hiding reinforces stigma. Challenge the policy.', feedbackKinyarwanda: 'Guhisha byatera isoni. Hagarika ayo mategeko.' }
    ]
  },
  {
    id: '19',
    category: 'health',
    title: 'Q: STI symptoms - embarrassed to seek care',
    titleKinyarwanda: 'Q: Ibimenyetso by\'indwara - isoni zo kubaza',
    description: 'You have STI symptoms but feel embarrassed to go to clinic. Friends might see you. What do you do?',
    descriptionKinyarwanda: 'Wabonye ibimenyetso by\'indwara ariko wumvise isoni kujya ku vuriro. Inshuti zawe zabona. Wukora iki?',
    options: [
      { text: 'Wait hoping it clears up', textKinyarwanda: 'Tegereza kigende', isCorrect: false, feedback: 'Wrong! STIs need treatment. Delay causes complications.', feedbackKinyarwanda: 'S\'icyo! Indwara zisaba umuti. Gutinda byatera ibibazo.' },
      { text: 'Say NO to shame: "My health comes first. I seek care now."', textKinyarwanda: 'Vuga OYA ku isoni: "Ubuzima bwanje ni bwa mbere. Ndasaba ubufasha."', isCorrect: true, feedback: 'Correct! NO to shame. Your health is priority.', feedbackKinyarwanda: 'Ukuli! OYA ku isoni. Ubuzima bwawe ni bwa mbere.' },
      { text: 'Self-treat with herbs', textKinyarwanda: 'Kwita ubwawe n\'ibimera', isCorrect: false, feedback: 'Self-treatment is dangerous. Seek professional care.', feedbackKinyarwanda: 'Kwitondera ubwawe bibi. Shaka ubufasha bw\'inzobere.' }
    ]
  },
  {
    id: '20',
    category: 'health',
    title: 'Q: Pregnant at 17 - others decide for you',
    titleKinyarwanda: 'Q: Utwitse ku myaka 17 - abandi bahitamo',
    description: 'You\'re pregnant. Boyfriend says "Abort." Mother says "Keep it." They pressure you to decide. What do you say?',
    descriptionKinyarwanda: 'Utwitse. Umukunzi avuga "Kwima." Nyoko avuga "Yikomeze." Bakurarikira guhitamo. Uravuga iki?',
    options: [
      { text: 'Choose what boyfriend wants', textKinyarwanda: 'Hitamo ibyo umukunzi ashaka', isCorrect: false, feedback: 'Wrong! Your body, your choice. Others don\'t decide for you.', feedbackKinyarwanda: 'S\'icyo! Umubiri wawe, guhitamo kwawe.' },
      { text: 'Say NO to pressure: "I need unbiased counseling first."', textKinyarwanda: 'Vuga OYA: "Nkeneye inama mbere."', isCorrect: true, feedback: 'Correct! NO to external pressure. Seek professional guidance.', feedbackKinyarwanda: 'Ukuli! OYA ku kwirengagiza. Shaka inama z\'abazima bwanze.' },
      { text: 'Choose what mother wants', textKinyarwanda: 'Hitamo ibyo nyoko ashaka', isCorrect: false, feedback: 'Others cannot decide for you. Seek counseling.', feedbackKinyarwanda: 'Abandi batashobora kuguhitiramo.' }
    ]
  },
  {
    id: '21',
    category: 'consent',
    title: 'Q: Partner shares your intimate details',
    titleKinyarwanda: 'Q: Umukunzi asangiza amabanga yawe',
    description: 'Partner tells friends about your intimate moments together. You feel humiliated. What do you say?',
    descriptionKinyarwanda: 'Umukunzi abwira inshuti ibyanyu by\'amabanga. Wumvise isoni. Uravuga iki?',
    options: [
      { text: 'Accept it as normal relationship talk', textKinyarwanda: 'Emera nk\'uko bigira mu biganiro', isCorrect: false, feedback: 'Wrong! Your privacy matters. Intimate details are not for sharing.', feedbackKinyarwanda: 'S\'icyo! Amabanga yawe ari ngombwa.' },
      { text: 'Say NO: "My privacy is non-negotiable. Stop sharing my life."', textKinyarwanda: 'Vuga OYA: "Amabanga yange ntago biganirizwa. Reka."', isCorrect: true, feedback: 'Correct! NO to privacy violations. Set clear boundaries.', feedbackKinyarwanda: 'Ukuli! OYA ku gukica amabanga. Shyira imipaka.' },
      { text: 'Share their secrets in revenge', textKinyarwanda: 'Basangize amabanga ye ngo umuhanywe', isCorrect: false, feedback: 'Revenge escalates conflict. Say NO clearly.', feedbackKinyarwanda: 'Guhanya byongera impaka. Vuga OYA.' }
    ]
  },
  {
    id: '22',
    category: 'rights',
    title: 'Q: Asked to drop out for family money',
    titleKinyarwanda: 'Q: Gusabwa gusiba ishuri ku mafaranga',
    description: 'Parents say: "Leave school and work to help the family." You want to finish education. What do you say?',
    descriptionKinyarwanda: 'Babyeyi bavuga: "Siba ishuri ukore akazi." Urashaka kurangiza. Uravuga iki?',
    options: [
      { text: 'Drop out to help family', textKinyarwanda: 'Siba ngo ufashe umuryango', isCorrect: false, feedback: 'Wrong! Education is your right and future investment.', feedbackKinyarwanda: 'S\'icyo! Uburezi ni uburenganzira bwawe.' },
      { text: 'Say NO: "My education matters. I\'ll find other ways to help."', textKinyarwanda: 'Vuga OYA: "Uburezi bwanje ari ngombwa. Nzasanga izindi nzira."', isCorrect: true, feedback: 'Correct! NO to sacrificing your future. Seek alternatives.', feedbackKinyarwanda: 'Ukuli! OYA ku gusiba ejo haza. Shaka izindi nzira.' },
      { text: 'Drop out temporarily', textKinyarwanda: 'Siba igihe gito', isCorrect: false, feedback: 'Temporary often becomes permanent. Say NO.', feedbackKinyarwanda: 'Igihe gito bihinduka iteka. Vuga OYA.' }
    ]
  },
  {
    id: '23',
    category: 'consent',
    title: 'Q: Older man offers gifts for attention',
    titleKinyarwanda: 'Q: Umugabo mukuru aha impano',
    description: 'Older man says: "I\'ll buy you nice things if you spend time with me." How do you respond?',
    descriptionKinyarwanda: 'Umugabo mukuru avuga: "Nzaguhera ibintu byiza niba uhanagura umwanya nanjye." Wasubiza iki?',
    options: [
      { text: 'Accept gifts for school needs', textKinyarwanda: 'Emera impano zo kwiga', isCorrect: false, feedback: 'Wrong! Gifts for attention is exploitation. Say NO.', feedbackKinyarwanda: 'S\'icyo! Impano ku gushishikazwa ni ubwambuzi.' },
      { text: 'Say NO: "I don\'t trade my time for gifts. Goodbye."', textKinyarwanda: 'Vuga OYA: "Nta guhanagura umwanya ku mpano. Muraho."', isCorrect: true, feedback: 'Correct! NO to transactional relationships. Protect yourself.', feedbackKinyarwanda: 'Ukuli! OYA ku mibanire y\'ubucuruzi. Rinda umubiri wawe.' },
      { text: 'Take gifts but avoid being alone', textKinyarwanda: 'Fata impano ariko wirinde kuba wenyine', isCorrect: false, feedback: 'Accepting enables exploitation. Say NO firmly.', feedbackKinyarwanda: 'Kwemera byongera ubwambuzi. Vuga OYA.' }
    ]
  },
  {
    id: '24',
    category: 'consent',
    title: 'Q: Rush into relationship pressure',
    titleKinyarwanda: 'Q: Guhata kujya mu mibanire vuba',
    description: 'New partner says: "We should make it official and exclusive right now." You want to take time. What do you say?',
    descriptionKinyarwanda: 'Umukunzi mushya avuga: "Dukwiye guhisha abandi ubu." Urashaka gufata igihe. Uravuga iki?',
    options: [
      { text: 'Agree to keep them happy', textKinyarwanda: 'Emera kugirango abe neza', isCorrect: false, feedback: 'Wrong! Rushing leads to poor decisions. Take your time.', feedbackKinyarwanda: 'S\'icyo! Kwihuta byatera guhitamo bibi.' },
      { text: 'Say NO: "I need time to know you before committing."', textKinyarwanda: 'Vuga OYA: "Nkeneye igihe ngo nmenye."', isCorrect: true, feedback: 'Correct! NO to rushing. Healthy relationships grow slowly.', feedbackKinyarwanda: 'Ukuli! OYA ku kwihuta. Imito y\'ubuzima iterera buhoro.' },
      { text: 'Say yes but keep options open', textKinyarwanda: 'Vuga yego ariko ugare amahitamo', isCorrect: false, feedback: 'Dishonesty hurts both. Say NO clearly.', feedbackKinyarwanda: 'Uburyarya byagira ababi. Vuga OYA.' }
    ]
  },
  {
    id: '25',
    category: 'safety',
    title: 'Q: Drink left unattended at party',
    titleKinyarwanda: 'Q: Inzoga yasizwe ubusa mu birori',
    description: 'You put your drink down. Someone offers: "I\'ll watch it for you." What do you say?',
    descriptionKinyarwanda: 'Washize inzoga kera. Umuntu avuga: "Nzayirinda." Uravuga iki?',
    options: [
      { text: 'Accept and thank them', textKinyarwanda: 'Emera ukabashimira', isCorrect: false, feedback: 'Wrong! Drink spiking is real. Never trust others with drinks.', feedbackKinyarwanda: 'S\'icyo! Gushyira ibiyobyabwenge ni ibyago.' },
      { text: 'Say NO: "I\'ll get a fresh drink. I don\'t share drinks."', textKinyarwanda: 'Vuga OYA: "Nzafata iyindi. Nta kugabana."', isCorrect: true, feedback: 'Correct! NO to drink sharing. Protect yourself.', feedbackKinyarwanda: 'Ukuli! OYA ku gusangiza inzoga. Rinda umubiri wawe.' },
      { text: 'Take it back but keep watching them', textKinyarwanda: 'Yafata ariko ukomeze kumurikira', isCorrect: false, feedback: 'Risky. Get a fresh drink instead.', feedbackKinyarwanda: 'Hari akayiko. Fata iyindi.' }
    ]
  },
  // === HEALTH RIGHTS (26-35) ===
  {
    id: '26', category: 'health', title: 'Q: Clinic refuses you without parent', titleKinyarwanda: 'Q: Vuriro rikwima nta mubyeyi',
    description: 'Clinic says: "We need parental consent for your appointment." You need confidential care. What do you say?',
    descriptionKinyarwanda: 'Ivuriro rivuga: "Dukeneye umwemerere wa babyeyi." Ukeneye ubufasha bw\'ibanga. Uravuga iki?',
    options: [
      { text: 'Leave and bring parent later', textKinyarwanda: 'Genda ukazanze babyeyi', isCorrect: false, feedback: 'Wrong! You have rights to confidential SRHR care.', feedbackKinyarwanda: 'S\'icyo! Ufite uburenganzira bwo kwita ku ndota.' },
      { text: 'Say NO: "I have the right to confidential healthcare."', textKinyarwanda: 'Vuga OYA: "Mfite uburenganzira bwo kwita ku ndota."', isCorrect: true, feedback: 'Correct! NO to barriers. Assert your rights.', feedbackKinyarwanda: 'Ukuli! OYA ku bigabanira. Shyira uburenganzira.' },
      { text: 'Ask a friend to pose as parent', textKinyarwanda: 'Saba inshuti kumera nk\'ababyeyi', isCorrect: false, feedback: 'Dishonest and risky. Assert your legal rights.', feedbackKinyarwanda: 'Bibi kandi birimo akayiko. Shyira uburenganzira.' }
    ]
  },
  {
    id: '27', category: 'consent', title: 'Q: Partner pressures for unprotected sex', titleKinyarwanda: 'Q: Umukunzi asaba kutarinza',
    description: 'Partner says: "Withdrawal works fine. Trust me, I know my body." How do you respond?',
    descriptionKinyarwanda: 'Umukunzi avuga: "Kuvamo biba neza. Wizere." Wasubiza iki?',
    options: [
      { text: 'Agree since they seem experienced', textKinyarwanda: 'Emera kuko bajejeje inzobere', isCorrect: false, feedback: 'Wrong! Withdrawal is NOT reliable protection.', feedbackKinyarwanda: 'S\'icyo! Kuvamo si uburyo bwizewe.' },
      { text: 'Say NO: "I need reliable protection. No condom, no sex."', textKinyarwanda: 'Vuga OYA: "Nkeneye uburyo bwizewe."', isCorrect: true, feedback: 'Correct! NO to unprotected sex. Your health first.', feedbackKinyarwanda: 'Ukuli! OYA ku mibonano idakingirwe. Ubuzima bwawe.' },
      { text: 'Suggest tracking fertility instead', textKinyarwanda: 'Shyira mu bitekerezo gukurikirana imihango', isCorrect: false, feedback: 'Fertility tracking is unreliable. Say NO to unsafe sex.', feedbackKinyarwanda: 'Gukurikirana imihango si byizewe. Vuga OYA.' }
    ]
  },
  {
    id: '28', category: 'safety', title: 'Q: Boss suggests quid pro quo', titleKinyarwanda: 'Q: Umukozi ukuru asaba ibyiza',
    description: 'Boss says: "Be nice to me and I\'ll promote you." This feels wrong. What do you say?',
    descriptionKinyarwanda: 'Umukozi ukuru avuga: "Uba neza nanjye nkaguhagarika." Wumvise bibi. Uravuga iki?',
    options: [
      { text: 'Be nice to get promotion', textKinyarwanda: 'Uba neza kugirango uhagarike', isCorrect: false, feedback: 'Wrong! Trading favors for advancement is exploitation.', feedbackKinyarwanda: 'S\'icyo! Guhanagura ibyiza ku kuzamura ni ubwambuzi.' },
      { text: 'Say NO: "I earn promotions through work, not favors."', textKinyarwanda: 'Vuga OYA: "Nzanisha akazi, si ibyiza."', isCorrect: true, feedback: 'Correct! NO to workplace harassment. Report this.', feedbackKinyarwanda: 'Ukuli! OYA ku mwego mubi wo mu kazi. Tangaza.' },
      { text: 'Avoid them but stay silent', textKinyarwanda: 'Kwirabura utavuge', isCorrect: false, feedback: 'Silence enables abuse. Speak up.', feedbackKinyarwanda: 'Kugira icyo uvuga byongera ihohoterwa.' }
    ]
  },
  {
    id: '29', category: 'consent', title: 'Q: Pressure to move in together', titleKinyarwanda: 'Q: Guhata kubana hamwe',
    description: 'Partner says: "We should live together to save money and test our relationship." You\'re not ready. What do you say?',
    descriptionKinyarwanda: 'Umukunzi avuga: "Dukwiye kubana kugirango dukize." Ntabwo witeguye. Uravuga iki?',
    options: [
      { text: 'Agree to save money', textKinyarwanda: 'Emera kugirango ukize', isCorrect: false, feedback: 'Wrong! Financial pressure is not a reason to rush.', feedbackKinyarwanda: 'S\'icyo! Amafaranga si impamvu yo kwihuta.' },
      { text: 'Say NO: "I\'m not ready to live together. Respect that."', textKinyarwanda: 'Vuga OYA: "Ntabwo niteguye kubana."', isCorrect: true, feedback: 'Correct! NO until you\'re ready. Your pace matters.', feedbackKinyarwanda: 'Ukuli! OYA kugeza uteguye. Igihe cyawe ni ngombwa.' },
      { text: 'Suggest trial period', textKinyarwanda: 'Shyira mu bitekerezo igihe cyo kugerageza', isCorrect: false, feedback: 'Trial periods still commit you prematurely. Say NO.', feedbackKinyarwanda: 'Igihe cyo kugerageza gishobora kuguhata. Vuga OYA.' }
    ]
  },
  {
    id: '30', category: 'consent', title: 'Q: Pressure to send more photos', titleKinyarwanda: 'Q: Guhata kohereza amafoto',
    description: 'Partner says: "You sent one before, why stop now? Don\'t you trust me?" How do you respond?',
    descriptionKinyarwanda: 'Umukunzi avuga: "Wohereje mbere, kuki urenga? Ntunyizera?" Wasubiza iki?',
    options: [
      { text: 'Send more to prove trust', textKinyarwanda: 'Ndohereze ngo uhite ko wizeye', isCorrect: false, feedback: 'Wrong! One photo doesn\'t obligate more. Say NO.', feedbackKinyarwanda: 'S\'icyo! Ifoto imwe ntitera izindi. Vuga OYA.' },
      { text: 'Say NO: "I changed my mind. No more photos. Final."', textKinyarwanda: 'Vuga OYA: "Nahinduye ubwenge. Nta zindi. Iherezo."', isCorrect: true, feedback: 'Correct! NO is always your right, even after yes.', feedbackKinyarwanda: 'Ukuli! OYA igihe cyose ari uburenganzira bwawe.' },
      { text: 'Send less revealing ones', textKinyarwanda: 'Ndohereze nta cyo bireba', isCorrect: false, feedback: 'Any photos can be shared. Say NO to all.', feedbackKinyarwanda: 'Ifoto yose irashobora gusangizwa. Vuga OYA.' }
    ]
  },
  // === ADDITIONAL SRHR SCENARIOS (31-50) ===
  {
    id: '31', category: 'consent', title: 'Q: Ex threatens to share photos', titleKinyarwanda: 'Q: Uwari umukunzi ateza gusangiza amafoto',
    description: 'Ex says: "If you don\'t get back with me, I\'ll share your photos." How do you respond?',
    descriptionKinyarwanda: 'Uwari umukunzi avuga: "Nutaza nanjye, nzasangiza amafoto yawe." Wasubiza iki?',
    options: [
      { text: 'Get back together to protect yourself', textKinyarwanda: 'Garukana kugirango wirinde', isCorrect: false, feedback: 'Wrong! Blackmail is abuse. Never give in.', feedbackKinyarwanda: 'S\'icyo! Gucungerwa ni ihohoterwa. Ntukemere.' },
      { text: 'Say NO: "That\'s illegal. I\'m reporting you to police."', textKinyarwanda: 'Vuga OYA: "Iribwanye amategeko. Ndakutanga."', isCorrect: true, feedback: 'Correct! NO to blackmail. Report immediately.', feedbackKinyarwanda: 'Ukuli! OYA ku gucungerwa. Tangaza ako kanya.' },
      { text: 'Beg them not to share', textKinyarwanda: 'Musabe kudasangiza', isCorrect: false, feedback: 'Begging shows fear. Take legal action.', feedbackKinyarwanda: 'Gusaba bigaragaza ubwoba. Koresha amategeko.' }
    ]
  },
  {
    id: '32', category: 'rights', title: 'Q: Told FGM is required by religion', titleKinyarwanda: 'Q: Bati guca ari umuco',
    description: 'Elder says: "God requires cutting. You cannot be married without it." What is your response?',
    descriptionKinyarwanda: 'Umukuru avuga: "Imana isaba guca. Ntushobora gushyingirwa." Wasubiza iki?',
    options: [
      { text: 'Accept for spiritual purity', textKinyarwanda: 'Emera ku gahumanire k\'umwuka', isCorrect: false, feedback: 'Wrong! No religion requires FGM. It\'s harmful tradition.', feedbackKinyarwanda: 'S\'icyo! Nta dini isaba guca. Ni umuco mubi.' },
      { text: 'Say NO: "FGM violates my body and rights. I refuse."', textKinyarwanda: 'Vuga OYA: "Guca kwica uburenganzira bwanjye."', isCorrect: true, feedback: 'Correct! NO to FGM. Your body, your rights.', feedbackKinyarwanda: 'Ukuli! OYA ku guca. Umubiri wawe, uburenganzira bwawe.' },
      { text: 'Ask for a smaller cut', textKinyarwanda: 'Saba gucwa make', isCorrect: false, feedback: 'Any cutting is violation. Say NO completely.', feedbackKinyarwanda: 'Igice cyose ari ugukica uburenganzira.' }
    ]
  },
  {
    id: '33', category: 'consent', title: 'Q: Partner denies saying hurtful things', titleKinyarwanda: 'Q: Umukunzi yanga ibyo yavuze',
    description: 'Partner said something cruel yesterday, now denies it: "I never said that. You\'re crazy." How do you respond?',
    descriptionKinyarwanda: 'Umukunzi yavuze ikibi, ubu arahakana: "Sinubyaye. Urazura." Wasubiza iki?',
    options: [
      { text: 'Apologize for misunderstanding', textKinyarwanda: 'Mbabarira ko utabanyize', isCorrect: false, feedback: 'Wrong! This is gaslighting - emotional manipulation.', feedbackKinyarwanda: 'S\'icyo! Iki ni ugukoresha amagambo - guhata.' },
      { text: 'Say NO: "I trust my memory. Your denial is manipulation."', textKinyarwanda: 'Vuga OYA: "Nizeye kwibuka kwanjye. Wanka."', isCorrect: true, feedback: 'Correct! NO to gaslighting. Trust yourself.', feedbackKinyarwanda: 'Ukuli! OYA ku gukoresha amagambo. Wizeye wewe.' },
      { text: 'Let it go to keep peace', textKinyarwanda: 'Reka kugirango ube mu mahoro', isCorrect: false, feedback: 'Silence enables abuse. Speak up.', feedbackKinyarwanda: 'Kugira icyo uvuga byongera ihohoterwa.' }
    ]
  },
  {
    id: '34', category: 'rights', title: 'Q: Asked to quit school for marriage', titleKinyarwanda: 'Q: Gusabwa gusiba ku bwa gushyingirwa',
    description: 'Fiancé says: "Quit school now. Wives don\'t need education." How do you respond?',
    descriptionKinyarwanda: 'Umushyingirano avuga: "Siba ishuri. Abagore badakeneye kwiga." Wasubiza iki?',
    options: [
      { text: 'Quit to be a good wife', textKinyarwanda: 'Siba ngo ube umugore mwiza', isCorrect: false, feedback: 'Wrong! Education is your right. Never sacrifice it.', feedbackKinyarwanda: 'S\'icyo! Uburezi ni uburenganzira bwawe.' },
      { text: 'Say NO: "I finish school first. Education is non-negotiable."', textKinyarwanda: 'Vuga OYA: "Nsoza ishuri. Uburezi ntago biganirizwa."', isCorrect: true, feedback: 'Correct! NO to sacrificing education. Stand firm.', feedbackKinyarwanda: 'Ukuli! OYA ku gusiba uburezi. Shikama.' },
      { text: 'Delay wedding until you finish', textKinyarwanda: 'Tinda ubukwe kugeza urangije', isCorrect: false, feedback: 'Better, but they may pressure again. Say NO clearly.', feedbackKinyarwanda: 'Byiza, ariko bashobora kongera. Vuga OYA.' }
    ]
  },
  {
    id: '35', category: 'safety', title: 'Q: Friend\'s older brother asks to meet alone', titleKinyarwanda: 'Q: Mukuru w\'inshuti asaba guhura wenyine',
    description: 'Friend\'s brother texts: "Let\'s meet alone. Your friend doesn\'t need to know." How do you respond?',
    descriptionKinyarwanda: 'Mukuru w\'inshuti yumvise: "Reka duhure wenyine. Inshuti yawe ntiyagomba kumenya." Wasubiza iki?',
    options: [
      { text: 'Meet to be polite', textKinyarwanda: 'Hurira kugirango ube neza', isCorrect: false, feedback: 'Wrong! Secret meetings are dangerous. Say NO.', feedbackKinyarwanda: 'S\'icyo! Gutana kw\'ibanga ni ibyago. Vuga OYA.' },
      { text: 'Say NO: "I don\'t meet people secretly. Tell your sister."', textKinyarwanda: 'Vuga OYA: "Nta kugana kw\'ibanga. Mbwira mushiki wawe."', isCorrect: true, feedback: 'Correct! NO to secrecy. Protect yourself.', feedbackKinyarwanda: 'Ukuli! OYA ku ibanga. Rinda umubiri wawe.' },
      { text: 'Ask what he wants first', textKinyarwanda: 'Mubaza icyo ashaka', isCorrect: false, feedback: 'Engaging enables them. Say NO immediately.', feedbackKinyarwanda: 'Kuvugana byabakorera. Vuga OYA ako kanya.' }
    ]
  },
  // === OPTIMIZED PLACEHOLDER SCENARIOS 36-50 ===
  // High-quality SRHR-focused scenarios for practice
  ...Array.from({ length: 15 }, (_, i): ConsentScenario => {
    const id = String(i + 36);
    const scenarios: Array<{ cat: ConsentScenario['category']; title: string; desc: string; knyTitle: string; knyDesc: string }> = [
      { cat: 'consent', title: 'Q: Partner wants sex without condom', desc: 'Partner says: "Condoms ruin the mood." You want protection. What do you say?', knyTitle: 'Q: Umukunzi asaba nta condom', knyDesc: 'Umukunzi avuga: "Condom zica impumo." Urashaka kwita. Uravuga iki?' },
      { cat: 'safety', title: 'Q: Stranger follows you home', desc: 'You notice someone following you. They say: "I\'m just walking the same way." What do you do?', knyTitle: 'Q: Umuntu akurikira', knyDesc: 'Wabonye umuntu akurikira. Avuga: "Nganze." Wukora iki?' },
      { cat: 'rights', title: 'Q: Clinic demands marriage certificate', desc: 'Nurse says: "Married women only for this service." You need care. What do you say?', knyTitle: 'Q: Vuriro risaba icyemezo cy\'ubushyingirwe', knyDesc: 'Umuganga avuga: "Abagore bashyingirwe gusa." Ukeneye ubufasha. Uravuga iki?' },
      { cat: 'consent', title: 'Q: Pressure for sex on first date', desc: 'Date says: "Everyone does it on the first date. Don\'t be old-fashioned." What do you say?', knyTitle: 'Q: Guhata ku munsi wa mbere', knyDesc: 'Uwo mwahuye avuga: "Bose bakora ku munsi wa mbere." Uravuga iki?' },
      { cat: 'safety', title: 'Q: Someone spiked your friend\'s drink', desc: 'You suspect someone put something in your friend\'s drink. What do you do?', knyTitle: 'Q: Umuntu yashyize ikintu mu nzoga', knyDesc: 'Wibwira ko umuntu yashyize ikintu mu nzoga y\'inshuti yawe. Wukora iki?' },
      { cat: 'health', title: 'Q: Ashamed to buy pads at shop', desc: 'Shopkeeper is male and you feel embarrassed buying pads. What do you do?', knyTitle: 'Q: Isoni zo kugura impapuro', knyDesc: 'Umucuruzi ari umugabo ukaba wumvise isoni. Wukora iki?' },
      { cat: 'consent', title: 'Q: Partner shares your location without asking', desc: 'Partner put a tracker on your phone without permission. What do you say?', knyTitle: 'Q: Umukunzi akubona aho uri', knyDesc: 'Umukunzi yashyize tracker ku terefone yawe. Uravuga iki?' },
      { cat: 'rights', title: 'Q: School expels pregnant student', desc: 'School says: "Pregnant girls cannot study here." Your friend is pregnant. What do you say?', knyTitle: 'Q: Ishuri rimwimura utwite', knyDesc: 'Ishuri rivuga: "Utwitse ntaziga." Inshuti yawe utwitse. Uravuga iki?' },
      { cat: 'safety', title: 'Q: Cab driver takes wrong route', desc: 'Driver turns down dark street saying: "Shortcut." You feel unsafe. What do you say?', knyTitle: 'Q: Umushofera ajya mu nzira ibi', knyDesc: 'Umushofera ajya mu nzira imisha avuga: "Inzira ngufi." Wumvise nta mutekano. Uravuga iki?' },
      { cat: 'consent', title: 'Q: Partner pressures for group sex', desc: 'Partner suggests involving others: "It will spice things up." You don\'t want to. What do you say?', knyTitle: 'Q: Umukunzi asaba kwinjiza abandi', knyDesc: 'Umukunzi asaba kwinjiza abandi. Ntufifuza. Uravuga iki?' },
      { cat: 'health', title: 'Q: Pharmacist judges you for condoms', desc: 'Pharmacist frowns when you ask for condoms. Others are watching. What do you do?', knyTitle: 'Q: Umuganga w\'imiti akureba nabi', knyDesc: 'Umuganga w\'imiti arakuzirana usaba condom. Abandi babireba. Wukora iki?' },
      { cat: 'safety', title: 'Q: Friend leaves you alone with stranger', desc: 'Friend goes home leaving you with someone you just met. What do you say?', knyTitle: 'Q: Inshuti igusiga n\'umuntu utazi', knyDesc: 'Inshuti igusiga n\'umuntu mwaboneye gusa. Uravuga iki?' },
      { cat: 'consent', title: 'Q: Partner records you without consent', desc: 'You discover partner recorded your intimate moments. What do you say?', knyTitle: 'Q: Umukunzi yafashe amafoto', knyDesc: 'Wabonye ko umukunzi yafashe amafoto. Uravuga iki?' },
      { cat: 'rights', title: 'Q: Family refuses HPV vaccine', desc: 'Parents say: "That vaccine encourages promiscuity." You want protection. What do you say?', knyTitle: 'Q: Umuryango urwanya igakinga', knyDesc: 'Babyeyi bavuga: "Igakinga iterera imibonano." Urashaka kurinda. Uravuga iki?' },
      { cat: 'safety', title: 'Q: Social media stalker threatens you', desc: 'Online stalker says: "I know where you live." What do you do?', knyTitle: 'Q: Umuntu ku murongo aguteye', knyDesc: 'Umuntu ku murongo avuga: "Nzi aho utuye." Wukora iki?' }
    ];
    const s = scenarios[i];
    return {
      id,
      category: s.cat,
      title: s.title,
      titleKinyarwanda: s.knyTitle,
      description: s.desc,
      descriptionKinyarwanda: s.knyDesc,
      options: [
        { text: 'Say NO: "I\'m not comfortable. This stops now."', textKinyarwanda: 'Vuga OYA: "Ntabwo mbyizemo. Ibi birangira."', isCorrect: true, feedback: 'Correct! Assert your boundaries firmly. Your safety and autonomy matter.', feedbackKinyarwanda: 'Ukuli! Shyira imipaka neza. Umutekano wawe ni ngombwa.' },
        { text: 'Go along to avoid conflict', textKinyarwanda: 'Emera kugirango udahangana', isCorrect: false, feedback: 'Wrong! Compromising your safety is never the answer. Say NO firmly.', feedbackKinyarwanda: 'S\'icyo! Kureka umutekano si igisubizo. Vuga OYA.' },
        { text: 'Make excuses and delay', textKinyarwanda: 'Shaka impamvu ukatinda', isCorrect: false, feedback: 'Excuses leave the door open. Clear NO is necessary for safety.', feedbackKinyarwanda: 'Impamvu zigaragaza ko wemera. OYA cyane ni ngombwa.' }
      ]
    };
  })
];

// --- Component ---
export default function GirlsRoomPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { session } = useEphemeralStore();
  const [activeTab, setActiveTab] = useState<'home' | 'sister' | 'consent' | 'audio'>('home');
  const [showSafeExit, setShowSafeExit] = useState(false);
  const [showPrivacyWarning, setShowPrivacyWarning] = useState(true);

  // Sister Chat State
  const [sisterMessages, setSisterMessages] = useState<SisterMessage[]>([]);
  const [sisterInput, setSisterInput] = useState('');
  const sisterChatRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Consent Simulator State
  const [currentScenario, setCurrentScenario] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [consentCompleted, setConsentCompleted] = useState<string[]>([]);

  // Daily Quiz State
  const [dailyQuizDate, setDailyQuizDate] = useState<string>(() => {
    try {
      return localStorage.getItem('girlsRoom_dailyQuizDate') || '';
    } catch (e) {
      return '';
    }
  });
  const [dailyQuestionIds, setDailyQuestionIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('girlsRoom_dailyQuestions');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  // All-time answer history (never cleared, for statistics)
  const [answerHistory, setAnswerHistory] = useState<Record<string, DailyAnswer>>(() => {
    try {
      const saved = localStorage.getItem('girlsRoom_answerHistory');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error('Error loading answer history:', e);
      return {};
    }
  });
  
  // Today's quiz session (cleared each day)
  const [todaySession, setTodaySession] = useState<{
    date: string;
    questionIds: string[];
    answers: Record<string, DailyAnswer>;
    currentIndex: number;
    isComplete: boolean;
  }>(() => {
    try {
      const saved = localStorage.getItem('girlsRoom_todaySession');
      const today = getTodaysDate();
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only restore if it's from today
        if (parsed.date === today) {
          return parsed;
        }
      }
      return {
        date: today,
        questionIds: [],
        answers: {},
        currentIndex: 0,
        isComplete: false
      };
    } catch (e) {
      console.error('Error loading today session:', e);
      return {
        date: new Date().toISOString().split('T')[0],
        questionIds: [],
        answers: {},
        currentIndex: 0,
        isComplete: false
      };
    }
  });
  
  const [showDailyQuiz, setShowDailyQuiz] = useState(false);
  const [showAnswerHistory, setShowAnswerHistory] = useState(false);
  const [questionTransition, setQuestionTransition] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);

  // Audio Player State
  // Educational Content State (renamed from Audio Lessons)
  const [educationalContent, setEducationalContent] = useState<EducationalContent[]>(() => {
    const saved = localStorage.getItem('girlsRoom_educationalContent');
    return saved ? JSON.parse(saved) : [];
  });
  const [playingContent, setPlayingContent] = useState<string | null>(null);
  const [showContentManager, setShowContentManager] = useState(false);
  const [activeContentId, setActiveContentId] = useState<string | null>(null); // For inline viewing

  // Content Management State (for S-badge facilitators)
  const [newContentTitle, setNewContentTitle] = useState('');
  const [newContentTitleKinyarwanda, setNewContentTitleKinyarwanda] = useState('');
  const [newContentUrl, setNewContentUrl] = useState('');
  const [newContentType, setNewContentType] = useState<'audio' | 'video' | 'document'>('audio');
  const [newContentCategory, setNewContentCategory] = useState<EducationalContent['category']>('health');
  const [newContentDescription, setNewContentDescription] = useState('');
  const [newContentDescriptionKinyarwanda, setNewContentDescriptionKinyarwanda] = useState('');
  const [newContentDuration, setNewContentDuration] = useState('');

  // Get persistent store state for facilitator checks
  const { chatSettings, isUserBigSister } = usePersistentStore();

  // Check if current user is Big Sister (S badge facilitator)
  const isBigSister = session?.user?.id && isUserBigSister 
    ? isUserBigSister(session.user.id)
    : false;

  // Phone back navigation for modals - must be after all state declarations
  usePhoneBackNavigation({
    isOpen: showSafeExit,
    onClose: () => setShowSafeExit(false),
    modalId: 'girlsroom-safe-exit'
  });

  usePhoneBackNavigation({
    isOpen: showPrivacyWarning,
    onClose: () => setShowPrivacyWarning(false),
    modalId: 'girlsroom-privacy-warning'
  });

  usePhoneBackNavigation({
    isOpen: showFeedback,
    onClose: () => setShowFeedback(false),
    modalId: 'girlsroom-feedback'
  });

  usePhoneBackNavigation({
    isOpen: showDailyQuiz,
    onClose: () => setShowDailyQuiz(false),
    modalId: 'girlsroom-daily-quiz'
  });

  usePhoneBackNavigation({
    isOpen: showAnswerHistory,
    onClose: () => setShowAnswerHistory(false),
    modalId: 'girlsroom-answer-history'
  });

  usePhoneBackNavigation({
    isOpen: showContentManager,
    onClose: () => setShowContentManager(false),
    modalId: 'girlsroom-content-manager'
  });

  usePhoneBackNavigation({
    isOpen: !!playingContent,
    onClose: () => setPlayingContent(null),
    modalId: 'girlsroom-playing-content'
  });

  const isKinyarwanda = i18n.language === 'rw';
  const { voiceProfile, selectedVoiceId, setSelectedVoiceId, isFacilitator: isFacilitatorVoice, showVoiceSelector, setShowVoiceSelector, handleVoiceSend } = useVoiceNote();

  // Safe Exit Handler
  const handleSafeExit = () => {
    // Clear session storage for this page
    sessionStorage.removeItem('girlsRoomActive');
    // Navigate to decoy or home
    window.location.href = '/';
  };

  // Sister Chat Handler
  const sendSisterMessage = () => {
    if (!sisterInput.trim()) return;
    
    const userMsg: SisterMessage = {
      id: Date.now().toString(),
      content: sisterInput,
      sender: 'user',
      timestamp: new Date().toISOString()
    };
    
    setSisterMessages(prev => [...prev, userMsg]);
    setSisterInput('');
    
    // Simulate sister response
    setTimeout(() => {
      const sisterResponses = [
        'Thank you for sharing that with me. You are very brave. Remember, your feelings are valid.',
        'I hear you. That sounds difficult. Would you like to talk more about it?',
        'You are not alone in this. Many girls go through similar experiences. What would help you feel safer?',
        'Your safety and wellbeing matter most. Have you considered talking to [local support resource]?'
      ];
      
      const sisterMsg: SisterMessage = {
        id: (Date.now() + 1).toString(),
        content: sisterResponses[Math.floor(Math.random() * sisterResponses.length)],
        sender: 'sister',
        timestamp: new Date().toISOString()
      };
      
      setSisterMessages(prev => [...prev, sisterMsg]);
    }, 1500);
  };

  // Consent Simulator Handler
  const handleConsentOption = (optionIndex: number) => {
    setSelectedOption(optionIndex);
    setShowFeedback(true);
    
    if (consentScenarios[currentScenario].options[optionIndex].isCorrect) {
      setConsentCompleted(prev => [...new Set([...prev, consentScenarios[currentScenario].id])]);
    }
  };

  const nextScenario = () => {
    if (currentScenario < consentScenarios.length - 1) {
      setCurrentScenario(prev => prev + 1);
      setShowFeedback(false);
      setSelectedOption(null);
    }
  };

  // Daily Quiz Handlers
  const getTodaysDate = () => new Date().toISOString().split('T')[0];

  // Get or create user-specific seed for consistent randomization
  const getUserShuffleSeed = () => {
    const savedSeed = localStorage.getItem('girlsRoom_shuffleSeed');
    if (savedSeed) return parseInt(savedSeed, 10);
    const newSeed = Math.floor(Math.random() * 1000000);
    localStorage.setItem('girlsRoom_shuffleSeed', newSeed.toString());
    return newSeed;
  };

  // Seeded shuffle for consistent but unique order per user
  const seededShuffle = (array: string[], seed: number) => {
    const result = [...array];
    let currentSeed = seed;
    for (let i = result.length - 1; i > 0; i--) {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      const j = Math.floor((currentSeed / 233280) * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };

  const generateDailyQuestions = (forceRegenerate = false) => {
    const today = getTodaysDate();
    
    // Check if we already have today's session
    if (!forceRegenerate && todaySession.questionIds.length === 3 && todaySession.date === today) {
      console.log('[Quiz] Using existing today session:', todaySession.questionIds);
      return;
    }

    console.log('[Quiz] Generating fresh 3 questions for today...');

    // Get user-specific shuffled order of all questions
    const seed = getUserShuffleSeed();
    const allIds = consentScenarios.map(s => s.id);
    const shuffledOrder = seededShuffle(allIds, seed);

    // Filter out questions that have been answered in history (to avoid repetition)
    const answeredIds = Object.keys(answerHistory);
    const availableQuestions = shuffledOrder.filter(id => !answeredIds.includes(id));
    
    // If we've answered all questions, just use shuffled order (allow repetition)
    const poolToUse = availableQuestions.length >= 3 ? availableQuestions : shuffledOrder;
    
    // Select first 3 from the pool
    const selectedIds = poolToUse.slice(0, 3);

    console.log('[Quiz] Selected questions for today:', selectedIds);

    // Create new session
    const newSession = {
      date: today,
      questionIds: selectedIds,
      answers: {},
      currentIndex: 0,
      isComplete: false
    };
    
    setTodaySession(newSession);
    localStorage.setItem('girlsRoom_todaySession', JSON.stringify(newSession));
    
    // Also update legacy state for backward compatibility
    setDailyQuestionIds(selectedIds);
    setDailyQuizDate(today);
    localStorage.setItem('girlsRoom_dailyQuestions', JSON.stringify(selectedIds));
    localStorage.setItem('girlsRoom_dailyQuizDate', today);
  };

  const reshuffleQuestions = () => {
    // Generate new seed for reshuffling
    const newSeed = Math.floor(Math.random() * 1000000);
    localStorage.setItem('girlsRoom_shuffleSeed', newSeed.toString());
    localStorage.removeItem('girlsRoom_questionOrder');
    
    // Clear today's session for a completely fresh start
    const today = getTodaysDate();
    const freshSession = {
      date: today,
      questionIds: [],
      answers: {},
      currentIndex: 0,
      isComplete: false
    };
    setTodaySession(freshSession);
    localStorage.setItem('girlsRoom_todaySession', JSON.stringify(freshSession));
    
    // Note: We keep answerHistory for statistics, just clear today's progress
    
    // Regenerate with new order
    generateDailyQuestions(true);
  };

  const handleDailyAnswer = (optionIndex: number) => {
    const currentIdx = todaySession.currentIndex;
    const currentScenarioId = todaySession.questionIds[currentIdx];
    const scenario = consentScenarios.find(s => s.id === currentScenarioId);
    
    if (!scenario) {
      console.error('[Quiz] Scenario not found for id:', currentScenarioId);
      return;
    }

    const isCorrect = scenario.options[optionIndex].isCorrect;
    const answerRecord: DailyAnswer = {
      optionIndex,
      isCorrect,
      answeredAt: new Date().toISOString()
    };

    // Update today's session with this answer
    const newSession = {
      ...todaySession,
      answers: {
        ...todaySession.answers,
        [currentScenarioId]: answerRecord
      }
    };
    setTodaySession(newSession);
    localStorage.setItem('girlsRoom_todaySession', JSON.stringify(newSession));
    
    // Also add to all-time history for statistics
    const newHistory = {
      ...answerHistory,
      [currentScenarioId]: answerRecord
    };
    setAnswerHistory(newHistory);
    localStorage.setItem('girlsRoom_answerHistory', JSON.stringify(newHistory));
    
    setShowFeedback(true);
    
    console.log(`[Quiz] Answered Q${currentIdx + 1} of 3`);

    // Check if this was the last question
    const isLastQuestion = currentIdx >= 2;
    
    if (!isLastQuestion) {
      console.log('[Quiz] Starting 3 second auto-advance timer...');
      
      // Clear any existing timers
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      
      // Start countdown display
      let secondsLeft = 3;
      setCountdown(secondsLeft);
      countdownIntervalRef.current = window.setInterval(() => {
        secondsLeft -= 1;
        setCountdown(secondsLeft > 0 ? secondsLeft : 0);
        if (secondsLeft <= 0 && countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
      }, 1000);
      
      // Auto-advance after 3 seconds
      autoAdvanceTimerRef.current = window.setTimeout(() => {
        console.log(`[Quiz] Auto-advancing from Q${currentIdx + 1} to Q${currentIdx + 2}`);
        
        setCountdown(0);
        setQuestionTransition(true);
        
        setTimeout(() => {
          const updatedSession = {
            ...todaySession,
            answers: {
              ...todaySession.answers,
              [currentScenarioId]: answerRecord
            },
            currentIndex: currentIdx + 1
          };
          setTodaySession(updatedSession);
          localStorage.setItem('girlsRoom_todaySession', JSON.stringify(updatedSession));
          setShowFeedback(false);
          setSelectedOption(null);
          setQuestionTransition(false);
          console.log(`[Quiz] Now on question ${currentIdx + 2}`);
        }, 300);
        
        autoAdvanceTimerRef.current = null;
      }, 3000);
    } else {
      // Mark session as complete
      console.log('[Quiz] All 3 questions answered - session complete!');
      setCountdown(0);
      const completedSession = {
        ...todaySession,
        answers: {
          ...todaySession.answers,
          [currentScenarioId]: answerRecord
        },
        isComplete: true
      };
      setTodaySession(completedSession);
      localStorage.setItem('girlsRoom_todaySession', JSON.stringify(completedSession));
    }
  };

  const handleNextQuestion = () => {
    // Clear auto timer since user clicked manually
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(0);
    
    const currentIdx = todaySession.currentIndex;
    console.log(`[Quiz] Manual next from Q${currentIdx + 1}`);
    
    if (currentIdx < 2) {
      setQuestionTransition(true);
      
      setTimeout(() => {
        const newSession = {
          ...todaySession,
          currentIndex: currentIdx + 1
        };
        setTodaySession(newSession);
        localStorage.setItem('girlsRoom_todaySession', JSON.stringify(newSession));
        setShowFeedback(false);
        setSelectedOption(null);
        setQuestionTransition(false);
        console.log(`[Quiz] Advanced to Q${currentIdx + 2}`);
      }, 300);
    }
  };

  const startDailyQuiz = () => {
    console.log('[Quiz] Starting daily quiz session...');
    
    // Clear any existing timers
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    const today = getTodaysDate();
    
    // Check if we need a fresh session or can resume
    let session = todaySession;
    if (todaySession.date !== today || todaySession.isComplete) {
      // New day or completed - create fresh session
      console.log('[Quiz] Creating fresh session for today');
      session = {
        date: today,
        questionIds: [],
        answers: {},
        currentIndex: 0,
        isComplete: false
      };
    } else {
      console.log('[Quiz] Resuming existing session:', todaySession);
    }
    
    // Generate questions if needed
    if (session.questionIds.length !== 3) {
      console.log('[Quiz] Need to generate questions');
      generateDailyQuestions(true);
    } else {
      setTodaySession(session);
    }
    
    // Reset UI state
    setShowFeedback(false);
    setSelectedOption(null);
    setShowAnswerHistory(false);
    setQuestionTransition(false);
    setCountdown(0);
    
    // Show quiz UI
    setShowDailyQuiz(true);
    console.log(`[Quiz] Quiz ready at Q${session.currentIndex + 1}`);
  };

  const viewAnswerHistory = () => {
    setShowAnswerHistory(true);
    setShowDailyQuiz(false);
  };

  // Initialize daily quiz on mount
  useEffect(() => {
    const today = getTodaysDate();
    
    // Check if we need a fresh session for today
    if (todaySession.date !== today || todaySession.isComplete) {
      console.log('[Quiz] New day or completed - resetting session');
      const freshSession = {
        date: today,
        questionIds: [],
        answers: {},
        currentIndex: 0,
        isComplete: false
      };
      setTodaySession(freshSession);
      localStorage.setItem('girlsRoom_todaySession', JSON.stringify(freshSession));
      
      // Generate new questions for today
      setTimeout(() => generateDailyQuestions(false), 0);
    }
  }, []);

  // Get today's questions for display from session
  const todaysQuestions = todaySession.questionIds.length === 3 
    ? todaySession.questionIds.map(id => consentScenarios.find(s => s.id === id)).filter(Boolean) as ConsentScenario[]
    : [];
  
  // Count unanswered questions in today's session
  const unansweredCount = todaySession.questionIds.filter(id => !todaySession.answers[id]).length;
  const answeredTodayCount = Object.keys(todaySession.answers).length;

  // Scroll sister chat to bottom
  useEffect(() => {
    if (sisterChatRef.current) {
      sisterChatRef.current.scrollTop = sisterChatRef.current.scrollHeight;
    }
  }, [sisterMessages]);

  // Welcome message on first load
  useEffect(() => {
    if (sisterMessages.length === 0) {
      setSisterMessages([{
        id: 'welcome',
        content: isKinyarwanda 
          ? 'Muraho! Ndi \'Big Sister\' wawe. Nshobora kugufasha ku bibazo byose ufite ku buzima bwo gusamba, imibanire, cyangwa niba wumva utizewe. Ntibivugwa hanze!'
          : 'Hello! I am your Big Sister. I can help with questions about reproductive health, relationships, or if you feel unsafe. Nothing leaves this room!',
        sender: 'sister',
        timestamp: new Date().toISOString()
      }]);
    }
  }, []);

  // --- Render Helpers ---
  const renderHome = () => (
    <div className="space-y-4">
      {/* Hero Card */}
      <div className="bg-gradient-to-br from-srhr-dark via-srhr-dark to-cool-800 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center overflow-hidden">
            <GirlIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{isKinyarwanda ? 'Icyumba cy\'Abakobwa' : 'Girls Room'}</h2>
            <p className="text-white/80 text-sm">{isKinyarwanda ? 'Ahantu heza, hwihishe, hizewe' : 'Safe, private, trusted space'}</p>
          </div>
        </div>
        <p className="text-white/70 text-sm leading-relaxed">
          {isKinyarwanda 
            ? 'Wikundire, wibaze, wigire. Tugufasha kugira ubuzima bwiza n\'ejo haza heza.'
            : 'Learn, ask, grow. We help you build a healthy life and bright future.'}
        </p>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={() => setActiveTab('sister')}
          className="bg-white rounded-xl p-4 border border-srhr/20 shadow-sm hover:shadow-md transition-all text-left group"
        >
          <div className="w-10 h-10 bg-srhr/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-srhr/20 transition-colors">
            <MessageCircleHeart className="w-5 h-5 text-srhr" />
          </div>
          <h3 className="font-semibold text-cool-800 text-sm">{isKinyarwanda ? 'Baza Shangazi' : 'Baza Shangazi'}</h3>
          <p className="text-xs text-cool-500 mt-1">{isKinyarwanda ? 'Vugana umukecuru wawe' : 'Ask your Big Sister'}</p>
        </button>

        <button 
          onClick={() => setActiveTab('consent')}
          className="bg-white rounded-xl p-4 border border-srhr/20 shadow-sm hover:shadow-md transition-all text-left group"
        >
          <div className="w-10 h-10 bg-srhr/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-srhr/20 transition-colors">
            <Shield className="w-5 h-5 text-srhr" />
          </div>
          <h3 className="font-semibold text-cool-800 text-sm">{isKinyarwanda ? 'Umubiri Wange' : 'My Body, My Rules'}</h3>
          <p className="text-xs text-cool-500 mt-1">{isKinyarwanda ? 'Wiga kwirengagiza' : 'Practice saying NO'}</p>
        </button>

        <button 
          onClick={() => setActiveTab('audio')}
          className="bg-white rounded-xl p-4 border border-srhr/20 shadow-sm hover:shadow-md transition-all text-left group"
        >
          <div className="w-10 h-10 bg-srhr/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-srhr/20 transition-colors">
            <GraduationCap className="w-5 h-5 text-srhr" />
          </div>
          <h3 className="font-semibold text-cool-800 text-sm">{isKinyarwanda ? 'Amahugurwa' : 'Lessons'}</h3>
          <p className="text-xs text-cool-500 mt-1">{isKinyarwanda ? 'Wumva, urebe, wige' : 'Audio, Video & More'}</p>
        </button>
      </div>
    </div>
  );

  // --- Baza Shangazi (Big Sister Inbox) State ---
  const [bigSisters, setBigSisters] = useState<Facilitator[]>([]);
  const [selectedSister, setSelectedSister] = useState<Facilitator | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [shangaziConversations, setShangaziConversations] = useState<InboxConversation[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loadingSisters, setLoadingSisters] = useState(true);
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  // Load Big Sisters (facilitators with 'S' badge) from store
  useEffect(() => {
    if (chatSettings?.facilitators) {
      // Only facilitators with 'S' badge are Big Sisters
      const sisters = chatSettings.facilitators.filter(f => f.badges?.includes('S') || f.isBigSister);
      setBigSisters(sisters);
      setLoadingSisters(false);
    } else {
      setLoadingSisters(false);
    }
  }, [chatSettings]);

  // NEW: Subscribe to user's Shangazi inbox for conversation history
  useEffect(() => {
    if (!session?.user?.id) return;

    console.log('[GirlsRoom] Subscribing to Shangazi inbox for persistence');
    const unsubscribe = subscribeToUserShangaziInbox(session.user.id, (conversations) => {
      console.log(`[GirlsRoom] Loaded ${conversations.length} Shangazi conversations`);
      setShangaziConversations(conversations);
    });

    return () => unsubscribe();
  }, [session?.user?.id]);

  // Subscribe to messages when a sister is selected
  // ULTRA-OPTIMIZED: Uses participants array only - NO composite index required
  useEffect(() => {
    if (!selectedSister || !session?.user?.id) return;

    console.log(`[GirlsRoom] Starting Shangazi conversation subscription with ${selectedSister.userId}`);

    const unsubscribe = subscribeToShangaziConversation(
      session.user.id,
      selectedSister.userId,
      (msgs) => {
        console.log(`[GirlsRoom] Received ${msgs.length} Shangazi messages`);
        setMessages(msgs);
      }
    );

    return () => {
      unsubscribe();
      // Don't clear messages on unmount - prevents flickering when switching
    };
  }, [selectedSister?.userId, session?.user?.id]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // VIRTUAL SCROLLING: Only render visible messages for performance
  // IMPORTANT: This useMemo must be declared BEFORE any useEffect that uses visibleMessages
  const VIRTUALIZATION_THRESHOLD = 50;
  const visibleMessages = useMemo(() => {
    if (messages.length <= VIRTUALIZATION_THRESHOLD) return messages;
    // For large message lists, show last 30 messages
    return messages.slice(-30);
  }, [messages]);

  // Scroll to bottom when visible messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleMessages]);

  // OPTIMIZED: useCallback prevents re-creation on every render
  const sendMessage = useCallback(async () => {
    if (!messageInput.trim() || !selectedSister || !session?.user) return;

    const content = messageInput.trim();
    const tempId = `temp-${Date.now()}`;

    // Create optimistic message for immediate UI update
    const optimisticMessage: DirectMessage = {
      id: tempId,
      senderId: session.user.id,
      senderName: session.user.name,
      senderAvatar: session.user.avatar,
      receiverId: selectedSister.userId,
      receiverName: selectedSister.userName,
      content: content,
      timestamp: new Date().toISOString(),
      isDeleted: false,
      isRead: false,
      type: 'text',
    };

    // Optimistic UI - add message immediately to chat
    setMessages(prev => [...prev, optimisticMessage]);
    setMessageInput('');
    setSendStatus('sending');
    setStatusMessage('Sending...');

    try {
      const result = await sendShangaziMessage(
        session.user.id,
        session.user.name,
        session.user.avatar,
        selectedSister.userId,
        selectedSister.userName,
        content
      );

      if (result && result.id) {
        console.log('[GirlsRoom] Shangazi message sent successfully:', result.id);
        setSendStatus('sent');
        setStatusMessage('Message sent!');
        // Clear status after 2 seconds
        setTimeout(() => {
          setSendStatus('idle');
          setStatusMessage('');
        }, 2000);
      } else {
        // Remove optimistic message on failure
        console.error('[GirlsRoom] Message sending returned null/undefined');
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setMessageInput(content);
        setSendStatus('error');
        setStatusMessage('Failed to send. Please try again.');
      }
    } catch (error: any) {
      console.error('[GirlsRoom] Error sending Shangazi message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setMessageInput(content);
      setSendStatus('error');
      setStatusMessage(error?.message || 'Error sending message. Please try again.');
    }
  }, [messageInput, selectedSister, session?.user]);

  const renderBazaShangazi = () => {
    // Sister selection view
    if (!selectedSister) {
      return (
        <div className="bg-white rounded-2xl border border-srhr/20 overflow-hidden min-h-[calc(100vh-200px)]">
          {/* Header */}
          <div className="bg-srhr/5 p-4 border-b border-srhr/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-srhr rounded-full flex items-center justify-center">
                <MessageCircleHeart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-cool-800">{isKinyarwanda ? 'Baza Shangazi' : 'Baza Shangazi'}</h3>
                <p className="text-xs text-cool-500">{isKinyarwanda ? 'Hitamo shangazi wawe' : 'Choose your Big Sister'}</p>
              </div>
              <div className="ml-auto flex items-center gap-1 text-xs text-cool-400">
                <Lock className="w-3 h-3" />
                {isKinyarwanda ? 'Ntibivugwa' : 'Private'}
              </div>
            </div>
          </div>

          {/* Conversation History + Big Sisters List */}
          <div className="p-4 space-y-3">
            {loadingSisters ? (
              <div className="text-center py-8 text-slate-400">
                {isKinyarwanda ? 'Gutegereza...' : 'Loading...'}
              </div>
            ) : bigSisters.length === 0 ? (
              <div className="text-center py-8">
                <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">
                  {isKinyarwanda
                    ? 'Nta Shangazi buboneka ubu. Subira nyuma.'
                    : 'No Big Sisters available right now. Please check back later.'}
                </p>
              </div>
            ) : (
              <>
                {/* RECENT CONVERSATIONS - Shows conversation history */}
                {shangaziConversations.length > 0 && (
                  <>
                    <p className="text-sm font-medium text-slate-700 mb-3">
                      {isKinyarwanda ? 'Ingingo zanyu' : 'Your Conversations'}
                    </p>
                    {shangaziConversations.map((conv) => {
                      const sister = bigSisters.find(s => s.userId === conv.participantId);
                      return (
                        <button
                          key={conv.participantId}
                          onClick={() => {
                            const selectedSis = sister || {
                              userId: conv.participantId,
                              userName: conv.participantName,
                              userAvatar: conv.participantAvatar,
                              isOnline: false,
                              role: 'Big Sister',
                              badges: ['S'],
                            } as Facilitator;
                            setSelectedSister(selectedSis);
                          }}
                          className="w-full flex items-center gap-4 p-4 bg-white border border-srhr/20 rounded-xl hover:shadow-md hover:border-srhr/40 transition-all text-left"
                        >
                          <div className="relative">
                            <img
                              src={conv.participantAvatar || sister?.userAvatar || '/default-avatar.png'}
                              alt={conv.participantName}
                              className="w-14 h-14 rounded-full object-cover"
                            />
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-srhr-dark rounded-full flex items-center justify-center border-2 border-white">
                              <span className="text-white text-xs font-bold">S</span>
                            </div>
                            {sister?.isOnline && (
                              <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-cool-800 truncate">{conv.participantName}</p>
                                <span className="px-1.5 py-0.5 bg-srhr-dark text-white text-xs rounded font-bold">S</span>
                              </div>
                              {conv.unreadCount > 0 && (
                                <span className="bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full">
                                  {conv.unreadCount}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-500 truncate mt-1">{conv.lastMessage}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {new Date(conv.lastMessageTimestamp).toLocaleDateString()}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-cool-400 flex-shrink-0" />
                        </button>
                      );
                    })}
                  </>
                )}

                {/* DIVIDER */}
                {shangaziConversations.length > 0 && (
                  <div className="border-t border-slate-200 my-4 pt-4">
                    <p className="text-sm font-medium text-slate-700 mb-3">
                      {isKinyarwanda ? 'Shangazi zitangira ingingo' : 'Available Big Sisters'}
                    </p>
                  </div>
                )}

                {/* Show message if no conversations yet */}
                {shangaziConversations.length === 0 && (
                  <p className="text-sm text-slate-600 mb-4">
                    {isKinyarwanda
                      ? 'Hitamo shangazi wawe. Urashobora kuvugana n\'umwe wese.'
                      : 'Choose a Big Sister to talk to. You can chat with any of them.'}
                  </p>
                )}

                {/* AVAILABLE BIG SISTERS */}
                {bigSisters
                  .filter(sister => !shangaziConversations.some(conv => conv.participantId === sister.userId))
                  .map((sister) => (
                  <button
                    key={sister.userId}
                    onClick={() => setSelectedSister(sister)}
                    className="w-full flex items-center gap-4 p-4 bg-white border border-srhr/20 rounded-xl hover:shadow-md hover:border-srhr/40 transition-all text-left"
                  >
                    <div className="relative">
                      <img
                        src={sister.userAvatar || '/default-avatar.png'}
                        alt={sister.userName}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                      {/* S Badge overlay */}
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-srhr-dark rounded-full flex items-center justify-center border-2 border-white">
                        <span className="text-white text-xs font-bold">S</span>
                      </div>
                      {sister.isOnline && (
                        <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-cool-800">{sister.userName}</p>
                        {/* S Badge */}
                        <span className="px-1.5 py-0.5 bg-srhr-dark text-white text-xs rounded font-bold" title="Shangazi (Big Sister)">
                          S
                        </span>
                        {sister.isHealthcareProvider && (
                          <div className="flex items-center" title="Healthcare Provider">
                            <Stethoscope className="w-4 h-4 text-srhr" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-cool-500 mt-0.5">{sister.bio || (isKinyarwanda ? 'Shangazi' : 'Big Sister')}</p>
                      {/* Online status indicator - only show when online */}
                      {sister.isOnline && (
                        <p className="text-xs text-green-600 mt-1">
                          {isKinyarwanda ? 'Ari online' : 'Online'}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-cool-400" />
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      );
    }

    // Chat view with selected sister
    return (
      <div className="flex flex-col h-[calc(100vh-200px)] bg-white rounded-2xl border border-srhr/20 overflow-hidden">
        {/* Header */}
        <div className="bg-srhr/5 p-4 border-b border-srhr/20">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSelectedSister(null)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-srhr/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-cool-600" />
            </button>
            <div className="relative">
              <img
                src={selectedSister.userAvatar || '/default-avatar.png'}
                alt={selectedSister.userName}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-srhr-dark rounded-full flex items-center justify-center border-2 border-white">
                <span className="text-white text-[10px] font-bold">S</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-cool-800">{selectedSister.userName}</h3>
                <span className="px-1 py-0.5 bg-srhr-dark text-white text-xs rounded font-bold">S</span>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-1 text-xs text-cool-400">
              <Lock className="w-3 h-3" />
              {isKinyarwanda ? 'Ntibivugwa' : 'Private'}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
        >
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                {isKinyarwanda
                  ? 'Nta bwozi buriho. Tangira ubwanya!'
                  : 'No messages yet. Start chatting!'}
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.senderId === session?.user?.id ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.senderId === session?.user?.id
                      ? 'bg-srhr text-white rounded-br-none'
                      : 'bg-gray-100 text-gray-800 rounded-bl-none'
                  }`}
                >
                  {message.type === 'voice' && message.voiceData ? (
                    <VoicePlayer
                      base64={message.voiceData}
                      duration={message.voiceDuration}
                      isOwn={message.senderId === session?.user?.id}
                      themeColor="#ec4899"
                    />
                  ) : (
                    <p className="text-sm">{message.content}</p>
                  )}
                </div>
              </div>
            ))
          )}
          {/* Message virtualization indicator */}
          {/* Show indicator if messages are virtualized */}
          {messages.length > VIRTUALIZATION_THRESHOLD && (
            <div className="text-center py-2 text-xs text-gray-400">
              Showing last {visibleMessages.length} of {messages.length} messages
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input - Form wrapped for better UX and reliable delivery - MOBILE OPTIMIZED */}
        <div className="p-2 sm:p-4 border-t border-pink-100 bg-white">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2 items-end">
            <button
              type="button"
              onClick={() => setShowVoiceSelector(true)}
              className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              title={isKinyarwanda ? 'Hitamo ijwi' : 'Select voice'}
            >
              <Mic className="w-4 h-4" style={{ color: voiceProfile.color }} />
            </button>
            <VoiceRecorder
              voiceProfile={voiceProfile}
              onSend={(base64, duration) => {
                handleVoiceSend(base64, duration, async (params) => {
                  if (!session?.user || !selectedSister) return null;
                  return sendShangaziMessage(
                    session.user.id,
                    session.user.name,
                    session.user.avatar,
                    selectedSister.userId,
                    selectedSister.userName,
                    params.content,
                    { voiceData: params.voiceData, voiceDuration: params.voiceDuration, voiceProfileId: params.voiceProfileId, type: 'voice' }
                  );
                });
              }}
              themeColor="#ec4899"
            />
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder={isKinyarwanda ? 'Andika ubutumwa...' : 'Type message...'}
              disabled={sendStatus === 'sending'}
              className="flex-1 min-w-0 px-3 py-2 sm:px-4 sm:py-2 bg-slate-100 rounded-full text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!messageInput.trim() || sendStatus === 'sending'}
              className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 bg-pink-500 text-white rounded-full flex items-center justify-center disabled:opacity-50 hover:bg-pink-600 transition-colors shadow-md"
              title={isKinyarwanda ? 'Ohereza' : 'Send'}
            >
              {sendStatus === 'sending' ? (
                <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              )}
            </button>
          </form>

          {/* Status Message */}
          {statusMessage && (
            <div className={cn(
              'mt-2 text-center text-sm font-medium',
              sendStatus === 'sending' && 'text-blue-600',
              sendStatus === 'sent' && 'text-green-600',
              sendStatus === 'error' && 'text-red-600'
            )}>
              {sendStatus === 'sending' && (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  {statusMessage}
                </span>
              )}
              {sendStatus === 'sent' && (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {statusMessage}
                </span>
              )}
              {sendStatus === 'error' && statusMessage}
            </div>
          )}

        </div>

        {/* Voice Selector Modal */}
        {showVoiceSelector && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setShowVoiceSelector(false)}>
            <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{isKinyarwanda ? 'Hitamo Ijwi' : 'Choose Voice'}</h3>
                <button onClick={() => setShowVoiceSelector(false)} className="p-1 rounded-full hover:bg-gray-100">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <VoiceSelector
                selectedVoiceId={selectedVoiceId}
                onSelect={(id) => { setSelectedVoiceId(id); setShowVoiceSelector(false); }}
                isFacilitator={isFacilitatorVoice}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderConsentSimulator = () => {
    // Show answer history view - uses all-time answerHistory
    if (showAnswerHistory) {
      const allAnsweredIds = Object.keys(answerHistory);
      const answeredScenarios = allAnsweredIds
        .map(id => consentScenarios.find(s => s.id === id))
        .filter(Boolean) as ConsentScenario[];

      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowAnswerHistory(false)}
              className="flex items-center gap-2 text-purple-600 hover:text-purple-700"
            >
              <ArrowLeft className="w-4 h-4" />
              {isKinyarwanda ? 'Garuka' : 'Back'}
            </button>
            <span className="text-sm text-slate-500">
              {answeredScenarios.length} {isKinyarwanda ? 'ibisubizo' : 'answers'}
            </span>
          </div>

          <div className="bg-purple-50 rounded-xl p-4 mb-4">
            <h3 className="font-semibold text-purple-800 mb-1">
              {isKinyarwanda ? 'Ibisubizo byawe' : 'Your Answer History'}
            </h3>
            <p className="text-sm text-purple-600">
              {isKinyarwanda 
                ? 'Reba ibyo wigeze wasubiza kandi wigire' 
                : 'Review your past responses and learn'}
            </p>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {answeredScenarios.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{isKinyarwanda ? 'Nta bisubizo byabitswe' : 'No answers yet'}</p>
              </div>
            ) : (
              answeredScenarios.map((scenario, idx) => {
                const answer = answerHistory[scenario.id];
                const selectedOpt = scenario.options[answer.optionIndex];
                return (
                  <div key={scenario.id} className="bg-white rounded-xl p-4 border border-slate-200">
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-xs text-slate-400">#{idx + 1}</span>
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-800 text-sm">
                          {isKinyarwanda && scenario.titleKinyarwanda ? scenario.titleKinyarwanda : scenario.title}
                        </h4>
                        <span className="text-xs text-slate-400">
                          {new Date(answer.answeredAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className={cn(
                        'px-2 py-1 rounded text-xs font-medium',
                        answer.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      )}>
                        {answer.isCorrect ? '✓' : '✗'}
                      </div>
                    </div>
                    <div className={cn(
                      'p-3 rounded-lg text-sm',
                      answer.isCorrect ? 'bg-green-50' : 'bg-red-50'
                    )}>
                      <p className="text-slate-600 mb-2">
                        {isKinyarwanda && selectedOpt.textKinyarwanda ? selectedOpt.textKinyarwanda : selectedOpt.text}
                      </p>
                      <p className={cn(
                        'text-xs',
                        answer.isCorrect ? 'text-green-700' : 'text-red-700'
                      )}>
                        {isKinyarwanda && selectedOpt.feedbackKinyarwanda ? selectedOpt.feedbackKinyarwanda : selectedOpt.feedback}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      );
    }

    // Show daily quiz view - OPTIMIZED with auto-advance and step indicators
    if (showDailyQuiz && todaysQuestions.length > 0) {
      const currentScenario = todaysQuestions[todaySession.currentIndex];
      const currentAnswer = todaySession.answers[currentScenario.id];
      const isAnswered = !!currentAnswer;
      const progress = ((todaySession.currentIndex + (isAnswered ? 1 : 0)) / 3) * 100;
      const isLastQuestion = todaySession.currentIndex === 2;

      return (
        <div className="space-y-4">
          {/* Header with step indicators */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setShowDailyQuiz(false)}
              className="flex items-center gap-2 text-srhr hover:text-srhr-dark transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">{isKinyarwanda ? 'Garuka' : 'Back'}</span>
            </button>
            <div className="flex items-center gap-1">
              {[0, 1, 2].map((step) => (
                <div
                  key={step}
                  className={cn(
                    'w-8 h-2 rounded-full transition-all duration-300',
                                        step < todaySession.currentIndex 
                      ? 'bg-green-500' 
                      : step === todaySession.currentIndex 
                        ? 'bg-srhr' 
                        : 'bg-slate-200'
                  )}
                />
              ))}
            </div>
          </div>

          {/* Step number badge */}
          <div className="flex items-center justify-center">
            <div className="bg-srhr text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-md">
              {isKinyarwanda 
                ? `Ikibazo ${todaySession.currentIndex + 1} cya 3` 
                : `Question ${todaySession.currentIndex + 1} of 3`}
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-srhr to-pink-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Question card with transition */}
          <div className={cn(
            "bg-white rounded-2xl p-6 border-2 shadow-lg transition-all duration-300",
            questionTransition ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0",
            isAnswered 
              ? currentAnswer?.isCorrect 
                ? "border-green-400 shadow-green-100" 
                : "border-red-400 shadow-red-100"
              : "border-srhr/20"
          )}>
            {/* Category badge */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-srhr to-pink-500 rounded-full flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-sm">Q</span>
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-srhr bg-srhr/10 px-3 py-1 rounded-full">
                {currentScenario.category}
              </span>
            </div>

            <h3 className="text-xl font-bold text-slate-800 mb-3 leading-tight">
              {isKinyarwanda && currentScenario.titleKinyarwanda 
                ? currentScenario.titleKinyarwanda 
                : currentScenario.title}
            </h3>
            
            <p className="text-slate-600 mb-6 text-base leading-relaxed">
              {isKinyarwanda && currentScenario.descriptionKinyarwanda
                ? currentScenario.descriptionKinyarwanda
                : currentScenario.description}
            </p>

            {/* Options */}
            <div className="space-y-3">
              {currentScenario.options.map((option, idx) => {
                const hasAnswered = isAnswered;
                const isSelected = hasAnswered && currentAnswer!.optionIndex === idx;
                
                return (
                  <button
                    key={idx}
                    onClick={() => !hasAnswered && handleDailyAnswer(idx)}
                    disabled={hasAnswered}
                    className={cn(
                      'w-full p-4 rounded-xl text-left transition-all duration-200 border-2',
                      hasAnswered && isSelected
                        ? option.isCorrect 
                          ? 'bg-green-100 border-green-500 shadow-md' 
                          : 'bg-red-100 border-red-500 shadow-md'
                        : hasAnswered
                          ? option.isCorrect
                            ? 'bg-green-50 border-green-300 opacity-80'
                            : 'opacity-40 bg-slate-50 border-transparent'
                          : 'bg-slate-50 hover:bg-srhr/10 border-transparent hover:border-srhr/30'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-sm transition-colors',
                        hasAnswered && isSelected
                          ? option.isCorrect 
                            ? 'bg-green-500 text-white' 
                            : 'bg-red-500 text-white'
                          : hasAnswered && option.isCorrect
                            ? 'bg-green-200 text-green-700'
                            : 'bg-srhr/20 text-srhr-dark'
                      )}>
                        {hasAnswered && isSelected
                          ? option.isCorrect 
                            ? <CheckCircle className="w-4 h-4" /> 
                            : <X className="w-4 h-4" />
                          : String.fromCharCode(65 + idx)}
                      </div>
                      <span className={cn(
                        "text-slate-700 font-medium",
                        hasAnswered && !isSelected && !option.isCorrect && "text-slate-400"
                      )}>
                        {isKinyarwanda && option.textKinyarwanda ? option.textKinyarwanda : option.text}
                      </span>
                    </div>

                    {/* Feedback - show for selected option */}
                    {hasAnswered && isSelected && (
                      <div className={cn(
                        'mt-3 p-3 rounded-lg text-sm font-medium',
                        option.isCorrect 
                          ? 'bg-green-50 text-green-800 border border-green-200' 
                          : 'bg-red-50 text-red-800 border border-red-200'
                      )}>
                        {isKinyarwanda && option.feedbackKinyarwanda ? option.feedbackKinyarwanda : option.feedback}
                      </div>
                    )}
                    {/* Show correct answer if wrong was selected */}
                    {hasAnswered && isSelected && !option.isCorrect && (
                      <div className="mt-2 p-2 rounded-lg text-sm bg-green-50 text-green-700 border border-green-200">
                        <span className="font-bold">{isKinyarwanda ? 'Igisubizo cyiza:' : 'Correct answer:'}</span>{' '}
                        {isKinyarwanda && currentScenario.options.find(o => o.isCorrect)?.textKinyarwanda 
                          || currentScenario.options.find(o => o.isCorrect)?.text}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Continue Button - PROMINENT with live countdown */}
            {isAnswered && !isLastQuestion && (
              <div className="mt-6 space-y-3">
                <button
                  onClick={handleNextQuestion}
                  className="w-full py-4 bg-gradient-to-r from-srhr to-pink-600 text-white rounded-xl font-bold text-lg hover:shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                  style={{
                    animation: countdown > 0 ? 'pulse 1s infinite' : 'none'
                  }}
                >
                  {isKinyarwanda ? 'Komeza ku Gikurikira' : 'Continue to Next'} 
                  <ChevronRight className="w-6 h-6" />
                </button>
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs font-medium text-slate-600">
                      {isKinyarwanda 
                        ? `Igikurikira muri ${countdown}...` 
                        : `Next question in ${countdown}s...`}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Completion view */}
            {isLastQuestion && isAnswered && (
              <div className="mt-6 p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl text-center border-2 border-green-200 shadow-lg">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <h4 className="text-xl font-bold text-green-800 mb-2">
                  {isKinyarwanda 
                    ? 'Byiza cyane! Wasoje ibibazo!'
                    : 'Excellent! Quiz Complete!'}
                </h4>
                <p className="text-green-600 mb-4">
                  {isKinyarwanda 
                    ? "Wize uko uvuga OYA mu byo mu buzima bwawe."
                    : "You've practiced saying NO in SRHR situations."}
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setShowDailyQuiz(false)}
                    className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-md"
                  >
                    {isKinyarwanda ? 'Garuka ku Menu' : 'Back to Menu'}
                  </button>
                  {Object.keys(answerHistory).length >= 10 && (
                    <button
                      onClick={() => { reshuffleQuestions(); setShowDailyQuiz(false); }}
                      className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-md"
                    >
                      {isKinyarwanda ? 'Tangira Bishya' : 'Start New Quiz'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Default menu view
    return (
      <div className="space-y-4">
        {/* Header with new questions badge */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">
                {isKinyarwanda ? 'Inama z\'Umunsi' : 'Daily Quiz'}
              </h3>
              <p className="text-purple-100 text-sm">
                {isKinyarwanda 
                  ? `Igana ibibazo ${consentScenarios.length}+ by\'ubumenyi`
                  : `Learn from ${consentScenarios.length}+ scenarios`}
              </p>
            </div>
            {unansweredCount > 0 && (
              <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                {unansweredCount} {isKinyarwanda ? 'Bishya' : 'New'}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid gap-3">
          <button
            onClick={startDailyQuiz}
            className="w-full p-4 bg-white rounded-xl border-2 border-purple-100 hover:border-purple-300 transition-all flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Brain className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="font-semibold text-slate-800">
                {isKinyarwanda ? 'Tangira Quiz y\'Uyu Munsi' : 'Start Today\'s Quiz'}
              </h4>
              <p className="text-sm text-slate-500">
                {isKinyarwanda 
                  ? `${3 - unansweredCount}/3 byasigaye`
                  : `${3 - unansweredCount}/3 remaining`}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>

          <button
            onClick={viewAnswerHistory}
            className="w-full p-4 bg-white rounded-xl border-2 border-slate-100 hover:border-slate-300 transition-all flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
              <History className="w-6 h-6 text-slate-600" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="font-semibold text-slate-800">
                {isKinyarwanda ? 'Ibisubizo Byose' : 'All Answers'}
              </h4>
              <p className="text-sm text-slate-500">
                {isKinyarwanda 
                  ? `${Object.keys(answerHistory).length} ${consentScenarios.length}+ byasubijwe`
                  : `${Object.keys(answerHistory).length}/${consentScenarios.length}+ answered`}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>

          {/* Browse all topics button - links to SRHR navbar */}
          <a
            href="/srhr"
            className="w-full p-4 bg-white rounded-xl border-2 border-slate-100 hover:border-slate-300 transition-all flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="font-semibold text-slate-800">
                {isKinyarwanda ? 'Reba Ibisigo Byose' : 'Browse All Topics'}
              </h4>
              <p className="text-sm text-slate-500">
                {isKinyarwanda ? 'Soma ibyerekeye indwara, uburenganzira...' : 'Read about health, rights, safety...'}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-600">
              {Object.values(answerHistory).filter((a: DailyAnswer) => a.isCorrect).length}
            </p>
            <p className="text-xs text-green-700">{isKinyarwanda ? 'Nibyiza' : 'Correct'}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {Object.keys(answerHistory).length}
            </p>
            <p className="text-xs text-blue-700">{isKinyarwanda ? 'Byose' : 'Total'}</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-purple-600">{consentScenarios.length}+</p>
            <p className="text-xs text-purple-700">{isKinyarwanda ? 'Ibibazo' : 'Questions'}</p>
          </div>
        </div>
      </div>
    );
  };

  // Content Management Handlers (for Big Sisters with S badge)
  const addEducationalContent = () => {
    if (!newContentTitle.trim() || !newContentUrl.trim()) return;
    
    const newContent: EducationalContent = {
      id: Date.now().toString(),
      title: newContentTitle,
      titleKinyarwanda: newContentTitleKinyarwanda || newContentTitle,
      type: newContentType,
      url: newContentUrl,
      duration: newContentDuration || undefined,
      category: newContentCategory,
      uploadedBy: session?.user?.name || 'Unknown',
      uploadedAt: new Date().toISOString(),
      description: newContentDescription || undefined,
      descriptionKinyarwanda: newContentDescriptionKinyarwanda || undefined
    };
    
    const updated = [...educationalContent, newContent];
    setEducationalContent(updated);
    localStorage.setItem('girlsRoom_educationalContent', JSON.stringify(updated));
    
    // Reset form
    setNewContentTitle('');
    setNewContentTitleKinyarwanda('');
    setNewContentUrl('');
    setNewContentDuration('');
    setNewContentDescription('');
    setNewContentDescriptionKinyarwanda('');
    setShowContentManager(false);
  };

  const deleteEducationalContent = (id: string) => {
    if (!confirm(isKinyarwanda ? 'Emeza ko ushaka gusiba?' : 'Confirm deletion?')) return;
    const updated = educationalContent.filter(c => c.id !== id);
    setEducationalContent(updated);
    localStorage.setItem('girlsRoom_educationalContent', JSON.stringify(updated));
  };

  // Helper to extract YouTube video ID from various URL formats
  const getYouTubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
      /youtube\.com\/shorts\/([^&\s?]+)/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  // Helper to check if URL is a direct video file
  const isDirectVideoUrl = (url: string): boolean => {
    return /\.(mp4|webm|ogg|mov)$/i.test(url);
  };

  // Helper to check if URL is a direct audio file
  const isDirectAudioUrl = (url: string): boolean => {
    return /\.(mp3|wav|ogg|m4a)$/i.test(url);
  };

  // Helper to check if URL is a PDF
  const isPdfUrl = (url: string): boolean => {
    return /\.pdf$/i.test(url);
  };

  // Render inline content player based on type
  const renderInlinePlayer = (content: EducationalContent) => {
    const videoId = getYouTubeVideoId(content.url);
    const isDirectVideo = isDirectVideoUrl(content.url);
    const isDirectAudio = isDirectAudioUrl(content.url);
    const isPdf = isPdfUrl(content.url);

    // YouTube Video
    if (content.type === 'video' && videoId) {
      return (
        <div className="mt-3 rounded-xl overflow-hidden bg-black aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
            title={content.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    // Direct Video File (MP4, WebM, etc.)
    if (content.type === 'video' && isDirectVideo) {
      return (
        <div className="mt-3 rounded-xl overflow-hidden bg-black aspect-video">
          <video
            src={content.url}
            controls
            className="w-full h-full"
            playsInline
          >
            {isKinyarwanda ? 'Video ntishobora gukorerwa' : 'Video not supported'}
          </video>
        </div>
      );
    }

    // Audio File
    if (content.type === 'audio' || isDirectAudio) {
      return (
        <div className="mt-3 p-4 bg-slate-100 rounded-xl">
          <audio
            src={content.url}
            controls
            className="w-full"
          >
            {isKinyarwanda ? 'Audio ntishobora gukorerwa' : 'Audio not supported'}
          </audio>
        </div>
      );
    }

    // PDF Document
    if (content.type === 'document' && isPdf) {
      return (
        <div className="mt-3 rounded-xl overflow-hidden border border-slate-200 bg-white" style={{ height: '500px' }}>
          <iframe
            src={content.url}
            title={content.title}
            className="w-full h-full"
          />
        </div>
      );
    }

    // Word/Excel/PPT or other documents - use Google Docs viewer
    if (content.type === 'document') {
      return (
        <div className="mt-3 rounded-xl overflow-hidden border border-slate-200 bg-white" style={{ height: '500px' }}>
          <iframe
            src={`https://docs.google.com/gview?url=${encodeURIComponent(content.url)}&embedded=true`}
            title={content.title}
            className="w-full h-full"
          />
        </div>
      );
    }

    // Fallback - open link
    return (
      <div className="mt-3 p-4 bg-slate-50 rounded-xl text-center">
        <p className="text-sm text-slate-600 mb-2">
          {isKinyarwanda ? 'Iki gikoresho ntikibasha kwerekanwa hano' : 'This content cannot be displayed inline'}
        </p>
        <a
          href={content.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-srhr text-white rounded-lg text-sm hover:bg-srhr-dark"
        >
          {isKinyarwanda ? 'Fungura' : 'Open Content'}
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    );
  };

  const getContentTypeIcon = (type: EducationalContent['type']) => {
    switch (type) {
      case 'audio': return <Volume2 className="w-5 h-5" />;
      case 'video': return <Play className="w-5 h-5" />;
      case 'document': return <BookOpen className="w-5 h-5" />;
    }
  };

  const getCategoryColor = (category: EducationalContent['category']) => {
    switch (category) {
      case 'puberty': return 'bg-pink-100 text-pink-700';
      case 'rights': return 'bg-blue-100 text-blue-700';
      case 'relationships': return 'bg-purple-100 text-purple-700';
      case 'health': return 'bg-green-100 text-green-700';
      case 'safety': return 'bg-orange-100 text-orange-700';
      case 'mental_health': return 'bg-teal-100 text-teal-700';
    }
  };

  const renderEducationalContent = () => {
    // Content Manager View (for Big Sisters)
    if (showContentManager && isBigSister) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowContentManager(false)}
              className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700"
            >
              <ArrowLeft className="w-4 h-4" />
              {isKinyarwanda ? 'Garuka' : 'Back'}
            </button>
            <span className="text-sm font-medium text-indigo-600">
              {isKinyarwanda ? 'Shangazi' : 'Big Sister'}
            </span>
          </div>

          <div className="bg-indigo-50 rounded-xl p-4 mb-4">
            <h3 className="font-semibold text-indigo-800 mb-1">
              {isKinyarwanda ? 'Shyiraho Amahugurwa' : 'Add New Content'}
            </h3>
            <p className="text-sm text-indigo-600">
              {isKinyarwanda 
                ? 'Shyiraho amahugurwa (audio, video, inyandiko)' 
                : 'Upload audio, video, or document links'}
            </p>
          </div>

          <div className="space-y-4 bg-white rounded-xl p-4 border border-slate-200">
            {/* Title inputs */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {isKinyarwanda ? 'Umutwe (Icyongereza)' : 'Title (English)'}
              </label>
              <input
                type="text"
                value={newContentTitle}
                onChange={(e) => setNewContentTitle(e.target.value)}
                placeholder={isKinyarwanda ? 'Andika umutwe' : 'Enter title'}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {isKinyarwanda ? 'Umutwe (Kinyarwanda)' : 'Title (Kinyarwanda)'}
              </label>
              <input
                type="text"
                value={newContentTitleKinyarwanda}
                onChange={(e) => setNewContentTitleKinyarwanda(e.target.value)}
                placeholder={isKinyarwanda ? 'Andika umutwe mu Kinyarwanda' : 'Enter Kinyarwanda title'}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Content Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {isKinyarwanda ? 'Ubwoko' : 'Type'}
              </label>
              <div className="flex gap-2">
                {(['audio', 'video', 'document'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setNewContentType(type)}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm capitalize',
                      newContentType === type
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-700'
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* URL */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {isKinyarwanda ? 'Link (URL)' : 'Link (URL)'}
              </label>
              <input
                type="url"
                value={newContentUrl}
                onChange={(e) => setNewContentUrl(e.target.value)}
                placeholder={isKinyarwanda ? 'Shyiraho link' : 'Paste link here'}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-srhr"
              />
              <p className="text-xs text-slate-500 mt-1">
                {isKinyarwanda 
                  ? 'Audio: mp3 link, Video: YouTube embed, Inyandiko: PDF link'
                  : 'Audio: mp3 link, Video: YouTube embed, Document: PDF link'}
              </p>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {isKinyarwanda ? 'Icyiciro' : 'Category'}
              </label>
              <select
                value={newContentCategory}
                onChange={(e) => setNewContentCategory(e.target.value as EducationalContent['category'])}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-srhr"
              >
                <option value="puberty">{isKinyarwanda ? 'Kubukira' : 'Puberty'}</option>
                <option value="rights">{isKinyarwanda ? 'Uburenganzira' : 'Rights'}</option>
                <option value="relationships">{isKinyarwanda ? 'Imibanire' : 'Relationships'}</option>
                <option value="health">{isKinyarwanda ? 'Ubuzima' : 'Health'}</option>
                <option value="safety">{isKinyarwanda ? 'Umutekano' : 'Safety'}</option>
                <option value="mental_health">{isKinyarwanda ? 'Ubuzima bw\'Ubwonko' : 'Mental Health'}</option>
              </select>
            </div>

            {/* Duration (optional) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {isKinyarwanda ? 'Igihe (Niba biraho)' : 'Duration (Optional)'}
              </label>
              <input
                type="text"
                value={newContentDuration}
                onChange={(e) => setNewContentDuration(e.target.value)}
                placeholder="5:30"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-srhr"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {isKinyarwanda ? 'Ibisobanuro (Icyongereza)' : 'Description (English)'}
              </label>
              <textarea
                value={newContentDescription}
                onChange={(e) => setNewContentDescription(e.target.value)}
                placeholder={isKinyarwanda ? 'Sobanura igikoresho' : 'Describe the content'}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-srhr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {isKinyarwanda ? 'Ibisobanuro (Kinyarwanda)' : 'Description (Kinyarwanda)'}
              </label>
              <textarea
                value={newContentDescriptionKinyarwanda}
                onChange={(e) => setNewContentDescriptionKinyarwanda(e.target.value)}
                placeholder={isKinyarwanda ? 'Sobanura mu Kinyarwanda' : 'Kinyarwanda description'}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-srhr"
              />
            </div>

            <button
              onClick={addEducationalContent}
              disabled={!newContentTitle.trim() || !newContentUrl.trim()}
              className="w-full py-3 bg-srhr text-white rounded-lg font-medium disabled:opacity-50 hover:bg-srhr-dark"
            >
              {isKinyarwanda ? 'Shyiraho' : 'Add Content'}
            </button>
          </div>
        </div>
      );
    }

    // Default Content Viewer - Only shows uploaded content, no defaults
    const contentToDisplay = educationalContent;
    
    return (
      <div className="space-y-3">
        {/* Header with Big Sister manage button */}
        <div className="flex items-center justify-between mb-4">
          <div className="bg-srhr/5 rounded-xl p-4 flex-1">
            <div className="flex items-center gap-2 text-srhr">
              <GraduationCap className="w-5 h-5" />
              <span className="text-sm font-medium">
                {isKinyarwanda ? 'Amahugurwa - ntakibazo' : 'Lessons - completely private'}
              </span>
            </div>
          </div>
          {isBigSister && (
            <button
              onClick={() => setShowContentManager(true)}
              className="ml-3 px-4 py-2 bg-srhr text-white rounded-lg text-sm hover:bg-srhr-dark"
            >
              {isKinyarwanda ? 'Shangazi' : 'Manage'}
            </button>
          )}
        </div>

        {contentToDisplay.map((content) => {
          const isActive = activeContentId === content.id;
          
          return (
            <div 
              key={content.id}
              className={cn(
                "bg-white rounded-xl p-4 border border-srhr/20 shadow-sm transition-all",
                isActive && "ring-2 ring-srhr"
              )}
            >
              <div className="flex items-start gap-4">
                {/* Play/View button */}
                <button
                  onClick={() => setActiveContentId(isActive ? null : content.id)}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                    isActive ? "bg-srhr text-white" : "bg-srhr/10 hover:bg-srhr/20"
                  )}
                >
                  {isActive ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : content.type === 'video' ? (
                    <Play className="w-5 h-5" />
                  ) : content.type === 'audio' ? (
                    <Volume2 className="w-5 h-5" />
                  ) : (
                    <BookOpen className="w-5 h-5" />
                  )}
                </button>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-cool-800 text-sm">
                    {isKinyarwanda && content.titleKinyarwanda ? content.titleKinyarwanda : content.title}
                  </h4>
                  {content.duration && (
                    <p className="text-xs text-cool-500 mt-0.5">{content.duration}</p>
                  )}
                  {content.description && !isActive && (
                    <p className="text-xs text-cool-600 mt-1 line-clamp-2">
                      {isKinyarwanda && content.descriptionKinyarwanda 
                        ? content.descriptionKinyarwanda 
                        : content.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full', getCategoryColor(content.category))}>
                      {content.category}
                    </span>
                    <span className="text-xs text-cool-400 capitalize">{content.type}</span>
                    {isActive && (
                      <span className="text-xs text-srhr font-medium">
                        {isKinyarwanda ? 'Birimo' : 'Playing'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete button for Big Sisters */}
                {isBigSister && (
                  <button
                    onClick={() => deleteEducationalContent(content.id)}
                    className="text-red-400 hover:text-red-600 p-1"
                    title={isKinyarwanda ? 'Siba' : 'Delete'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Inline Player - shown when active */}
              {isActive && renderInlinePlayer(content)}
            </div>
          );
        })}

        {contentToDisplay.length === 0 && (
          <div className="text-center py-12">
            <GraduationCap className="w-16 h-16 mx-auto mb-4 text-cool-300" />
            <p className="text-cool-500 mb-2">
              {isKinyarwanda ? 'Nta mahugurwa ahari ubu' : 'No lessons available yet'}
            </p>
            {isBigSister ? (
              <button
                onClick={() => setShowContentManager(true)}
                className="mt-2 px-4 py-2 bg-srhr text-white rounded-lg text-sm hover:bg-srhr-dark"
              >
                {isKinyarwanda ? 'Shyiraho amahugurwa' : 'Add first lesson'}
              </button>
            ) : (
              <p className="text-xs text-cool-400">
                {isKinyarwanda 
                  ? 'Shangazi azashyiraho amahugurwa vuba' 
                  : 'Big Sister will add content soon'}
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cool-50 via-white to-cool-100 pb-24">
      {/* Privacy Warning Modal */}
      {showPrivacyWarning && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-srhr-dark/10 rounded-full flex items-center justify-center">
                <Lock className="w-5 h-5 text-srhr-dark" />
              </div>
              <h3 className="font-bold text-cool-800">
                {isKinyarwanda ? 'Icyumba Gitagira' : 'Private Space'}
              </h3>
            </div>
            <p className="text-cool-600 text-sm mb-4">
              {isKinyarwanda 
                ? 'Iri cyumba ni ryihishe. Ntakibazo wabaza kivugwa hanze.'
                : 'This room is private. Questions you ask are not shared.'}
            </p>
            <button 
              onClick={() => setShowPrivacyWarning(false)}
              className="w-full py-3 bg-srhr-dark text-white rounded-xl font-medium hover:bg-cool-800 transition-colors"
            >
              {isKinyarwanda ? 'Nbyemeye' : 'I Understand'}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-srhr-dark/20">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            {/* Back to Home button - always visible */}
            <button 
              onClick={() => navigate('/')}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-cool-100 transition-colors"
              title="Back to Home"
            >
              <Home className="w-5 h-5 text-cool-600" />
            </button>
            
            {activeTab !== 'home' && (
              <button 
                onClick={() => setActiveTab('home')}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-cool-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-cool-600" />
              </button>
            )}
            <div className="w-12 h-12 bg-gradient-to-r from-srhr-dark to-cool-700 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
              <GirlIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-cool-900">
                {activeTab === 'home' && (isKinyarwanda ? 'Icyumba cy\'Abakobwa' : 'Girls Room')}
                {activeTab === 'sister' && (isKinyarwanda ? 'Baza Shangazi' : 'Baza Shangazi')}
                {activeTab === 'consent' && (isKinyarwanda ? 'Umubiri Wange' : 'My Body, My Rules')}
                {activeTab === 'audio' && (isKinyarwanda ? 'Amahugurwa' : 'Lessons')}
              </h1>
              <p className="text-sm text-cool-500">
                {isKinyarwanda ? 'Ahantu heza, hwihishe' : 'Safe & Private Space'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'sister' && renderBazaShangazi()}
        {activeTab === 'consent' && renderConsentSimulator()}
        {activeTab === 'audio' && renderEducationalContent()}
      </main>

    </div>
  );
}
