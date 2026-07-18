import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { usePersistentStore } from '../store';
import { Video, Calendar, Users, Shield, CameraOff, Radio, ArrowLeft, Clock, Lock } from 'lucide-react';

// Rwandan Time Utilities (CAT - Central Africa Time, UTC+2)
// Rwanda is always UTC+2 (no DST)
const getRwandanTime = () => {
  return new Date();
};

// Use Intl.DateTimeFormat for reliable timezone conversion
const getRwandanDateParts = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Kigali',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
    weekday: 'short'
  });
  
  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => {
    const part = parts.find(p => p.type === type);
    return part ? parseInt(part.value, 10) : 0;
  };
  
  // Map weekday short names to numbers (Sun=0, Mon=1, ..., Fri=5, Sat=6)
  const weekdayPart = parts.find(p => p.type === 'weekday');
  const weekdayMap: Record<string, number> = {
    'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
  };
  const day = weekdayPart ? (weekdayMap[weekdayPart.value] ?? 0) : 0;
  
  return {
    day,
    hour: getPart('hour'),
    minute: getPart('minute'),
    second: getPart('second')
  };
};

const getRwandanDay = () => getRwandanDateParts().day;
const getRwandanHours = () => getRwandanDateParts().hour;
const getRwandanMinutes = () => getRwandanDateParts().minute;

export default function BazaMugangaPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { bazaMugangaLink, bazaMugangaTopic } = usePersistentStore();
  
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isLive, setIsLive] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [meetingEnded, setMeetingEnded] = useState(false);

  // Check if currently live (Friday 7-11PM CAT - link stays open)
  // UI shows 7-8 PM as official time, but link available until 11 PM
  const checkIsLive = useCallback(() => {
    const day = getRwandanDay(); // 5 = Friday
    const hour = getRwandanHours();
    const minute = getRwandanMinutes();
    
    // Friday (5) between 7:00 PM (19:00) and 11:00 PM (23:00)
    const isFriday = day === 5;
    const isInWindow = hour >= 19 && hour < 23;
    const isExactly11PM = hour === 23 && minute === 0;
    
    return isFriday && (isInWindow || isExactly11PM);
  }, []);

  // Check if within official session time (7-8 PM) for countdown display
  const checkIsOfficialSession = useCallback(() => {
    const day = getRwandanDay();
    const hour = getRwandanHours();
    
    // Friday 7-8 PM is the "official" session time
    return day === 5 && hour === 19; // 7:00-7:59 PM
  }, []);

  // Check if meeting has ended (after 11 PM)
  const checkMeetingEnded = useCallback(() => {
    const day = getRwandanDay();
    const hour = getRwandanHours();
    const minute = getRwandanMinutes();
    
    // After 11:00 PM, session is considered ended
    return day === 5 && (hour > 23 || (hour === 23 && minute > 0));
  }, []);

  // Calculate next Friday 7PM CAT
  const getNextSession = useCallback(() => {
    // Get current UTC time and adjust to Rwanda time (UTC+2)
    const now = new Date();
    const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
    const rwandaMs = utcMs + (2 * 3600000); // Add 2 hours for CAT
    const rwandaNow = new Date(rwandaMs);
    
    // Calculate next Friday in Rwanda time
    const currentRwandaDay = rwandaNow.getDay(); // 0-6, 5 = Friday
    let daysUntilFriday = (5 - currentRwandaDay + 7) % 7;
    
    // If it's Friday after 8PM, or currently live (7-8PM), next session is next week
    const currentRwandaHour = rwandaNow.getHours();
    const currentRwandaMinute = rwandaNow.getMinutes();
    if (currentRwandaDay === 5 && (currentRwandaHour > 20 || (currentRwandaHour === 20 && currentRwandaMinute > 0))) {
      daysUntilFriday = 7;
    } else if (currentRwandaDay === 5 && currentRwandaHour >= 19) {
      daysUntilFriday = 7;
    }
    
    // Create the next Friday at 7PM CAT by adding days to Rwanda time
    const nextFridayRwanda = new Date(rwandaMs + (daysUntilFriday * 24 * 3600000));
    nextFridayRwanda.setHours(19, 0, 0, 0); // 7:00 PM CAT
    
    // Convert back to local time for the Date object
    const nextFriday = new Date(nextFridayRwanda.getTime() - (2 * 3600000) - (now.getTimezoneOffset() * 60000));
    
    return nextFriday;
  }, []);

  // Get official session end time (8 PM CAT) - for countdown display
  const getOfficialSessionEnd = useCallback(() => {
    const currentDay = getRwandanDay();
    const hour = getRwandanHours();
    
    // Get current time in Rwanda
    const now = new Date();
    const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
    const rwandaMs = utcMs + (2 * 3600000);
    
    let endRwandaMs;
    
    // Official session ends at 8 PM
    if (currentDay === 5 && hour >= 19 && hour < 20) {
      // This Friday at 8 PM - end is today at 8 PM Rwanda time
      endRwandaMs = rwandaMs - (hour - 20) * 3600000 - now.getMinutes() * 60000 - now.getSeconds() * 1000;
    } else {
      // Next Friday at 8 PM
      const daysUntilFriday = (5 - currentDay + 7) % 7 || 7;
      endRwandaMs = rwandaMs + (daysUntilFriday * 24 * 3600000);
      // Adjust to 8 PM (20:00) Rwanda time
      const tempDate = new Date(endRwandaMs);
      tempDate.setHours(20, 0, 0, 0);
      endRwandaMs = tempDate.getTime();
    }
    
    // Convert Rwanda time back to local time
    return new Date(endRwandaMs - (2 * 3600000) - (now.getTimezoneOffset() * 60000));
  }, []);

  // Generate random guest name
  useEffect(() => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setGuestName(`Guest-${randomNum}`);
  }, []);

  // Calculate remaining official session time (7-8 PM)
  // Shows countdown only during official 7-8 PM window
  const getSessionRemaining = useCallback(() => {
    const rwandaNow = getRwandanTime();
    const end = getOfficialSessionEnd();
    const diff = end.getTime() - rwandaNow.getTime();
    
    if (diff > 0 && diff <= 60 * 60 * 1000) { // Max 1 hour (official session)
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      return { hours, minutes, seconds };
    }
    return { hours: 0, minutes: 0, seconds: 0 };
  }, [getOfficialSessionEnd]);

  const [sessionRemaining, setSessionRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [currentKigaliTime, setCurrentKigaliTime] = useState(() => getRwandanTime());
  const [isOfficialSession, setIsOfficialSession] = useState(false);

  // Format Kigali time for display
  const formatKigaliTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Africa/Kigali'
    });
  };

  // Update countdown
  useEffect(() => {
    const updateCountdown = () => {
      const rwandaNow = getRwandanTime();
      setCurrentKigaliTime(rwandaNow);
      
      const live = checkIsLive();
      const ended = checkMeetingEnded();
      const official = checkIsOfficialSession();
      
      setIsLive(live);
      setMeetingEnded(ended);
      setIsOfficialSession(official);
      
      if (live && official) {
        // Only update countdown during official 7-8 PM session
        setSessionRemaining(getSessionRemaining());
      }
      
      if (!live) {
        const nextSession = getNextSession();
        const diff = nextSession.getTime() - rwandaNow.getTime();
        
        if (diff > 0) {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          
          setCountdown({ days, hours, minutes, seconds });
        }
      }
    };

    // Run immediately on mount
    updateCountdown();
    
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [checkIsLive, checkMeetingEnded, checkIsOfficialSession, getNextSession, getSessionRemaining]);

  const joinMeeting = () => {
    if (!isLive) return; // Extra safety check
    const url = `${bazaMugangaLink}#userInfo.displayName="${guestName}"&config.startWithVideoMuted=true`;
    window.open(url, '_blank');
  };

  // Format time unit with leading zero
  const formatTime = (value: number) => String(value).padStart(2, '0');

  return (
    <div className="page-container">
      {/* Back button */}
      <button
        onClick={() => navigate('/services')}
        className="flex items-center gap-2 text-rm-gray-600 hover:text-rm-gray-900 mb-4 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Back to Services</span>
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
            <Video className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('baza.title')}</h1>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Kigali Time (CAT UTC+2)
            </p>
          </div>
        </div>
        {/* Live Kigali Time Clock */}
        <div className="text-right">
          <div className="text-xs text-gray-400 uppercase tracking-wider">Current Time</div>
          <div className="text-lg font-mono font-bold text-gray-700">
            {formatKigaliTime(currentKigaliTime)}
          </div>
        </div>
      </div>

      <p className="text-gray-600 mb-6">{t('baza.subtitle')}</p>

      {/* Live Status Card */}
      <div className="card mb-6 overflow-hidden border border-gray-200">
        {isLive ? (
          <div className="text-center py-8">
            {/* LIVE Badge */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-5 py-2.5 rounded-full mb-6 shadow-lg shadow-red-200">
              <Radio className="w-5 h-5 animate-pulse" />
              <span className="font-bold text-lg tracking-wide">IT IS LIVE</span>
              <span className="w-2 h-2 bg-white rounded-full animate-bounce"></span>
            </div>

            {/* Meeting Active Info */}
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-3 mx-4">
              <p className="text-green-700 font-medium text-sm flex items-center justify-center gap-2">
                <Calendar className="w-4 h-4" />
                Friday Session Active — Join Now
              </p>
            </div>

            {/* Session Ends Countdown - Only during official 7-8 PM */}
            {isOfficialSession ? (
              <div className="mb-8">
                <p className="text-sm text-gray-500 mb-3 font-medium">Official session ends in:</p>
                <div className="flex justify-center gap-2 sm:gap-3">
                  <div className="bg-gradient-to-b from-gray-900 to-gray-800 text-white rounded-xl px-3 sm:px-4 py-3 min-w-[55px] sm:min-w-[70px] shadow-lg">
                    <div className="text-xl sm:text-3xl font-bold">{formatTime(sessionRemaining.hours)}</div>
                    <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider mt-1">hrs</div>
                  </div>
                  <div className="text-xl sm:text-3xl font-bold text-gray-300 self-center">:</div>
                  <div className="bg-gradient-to-b from-gray-900 to-gray-800 text-white rounded-xl px-3 sm:px-4 py-3 min-w-[55px] sm:min-w-[70px] shadow-lg">
                    <div className="text-xl sm:text-3xl font-bold">{formatTime(sessionRemaining.minutes)}</div>
                    <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider mt-1">min</div>
                  </div>
                  <div className="text-xl sm:text-3xl font-bold text-gray-300 self-center">:</div>
                  <div className="bg-gradient-to-b from-gray-900 to-gray-800 text-white rounded-xl px-3 sm:px-4 py-3 min-w-[55px] sm:min-w-[70px] shadow-lg">
                    <div className="text-xl sm:text-3xl font-bold">{formatTime(sessionRemaining.seconds)}</div>
                    <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider mt-1">sec</div>
                  </div>
                </div>
              </div>
            ) : (
              /* After 8 PM - Official session ended, link still open */
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 mx-4">
                <p className="text-blue-700 font-medium text-sm text-center">
                  Official session ended at 8:00 PM
                </p>
                <p className="text-blue-600 text-xs text-center mt-1">
                  Link stays open until 11:00 PM for late joiners
                </p>
              </div>
            )}

            {/* Red Join Button */}
            <button
              onClick={joinMeeting}
              className="inline-flex items-center gap-3 bg-gradient-to-r from-red-500 via-red-600 to-red-700 hover:from-red-600 hover:via-red-700 hover:to-red-800 text-white font-bold text-lg px-10 py-5 rounded-xl shadow-xl shadow-red-200 transform hover:scale-105 transition-all duration-200"
            >
              <Radio className="w-6 h-6 animate-pulse" />
              JOIN DISCUSSION — IT IS LIVE
              <span className="w-3 h-3 bg-white rounded-full animate-ping"></span>
            </button>

            <p className="text-xs text-gray-400 mt-4">
              {isOfficialSession 
                ? "Click to enter the meeting room • Camera starts muted • Official session: 7-8 PM" 
                : "Click to enter the meeting room • Camera starts muted • Link closes at 11 PM"}
            </p>
          </div>
        ) : meetingEnded ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-500 px-4 py-2 rounded-full mb-4">
              <Clock className="w-5 h-5" />
              <span className="font-semibold">Session Ended</span>
            </div>
            <p className="text-gray-500 mb-6">This week&apos;s session has concluded.</p>
            <p className="text-sm text-gray-400">Next session: Next Friday 7:00 — 8:00 PM Kigali time (Link until 11 PM)</p>
          </div>
        ) : (
          <div className="text-center py-8">
            {/* Locked State */}
            <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-500 px-4 py-2 rounded-full mb-4">
              <Lock className="w-4 h-4" />
              <span className="font-medium">Meeting Locked</span>
            </div>

            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2 font-medium">Every Friday 7:00 — 8:00 PM</p>
            <p className="text-gray-500 text-sm mb-6">Kigali Time (CAT, UTC+2)</p>

            {/* Countdown with Seconds */}
            <div className="text-center mb-6">
              <p className="text-sm text-gray-500 mb-3 font-medium">Next session starts in:</p>
              <div className="flex justify-center gap-2 sm:gap-3">
                <div className="text-center bg-gray-50 rounded-lg px-3 py-2 min-w-[55px]">
                  <div className="text-xl sm:text-2xl font-bold text-gray-900">{formatTime(countdown.days)}</div>
                  <div className="text-[10px] sm:text-xs text-gray-500 uppercase">days</div>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-gray-300 self-center">:</div>
                <div className="text-center bg-gray-50 rounded-lg px-3 py-2 min-w-[55px]">
                  <div className="text-xl sm:text-2xl font-bold text-gray-900">{formatTime(countdown.hours)}</div>
                  <div className="text-[10px] sm:text-xs text-gray-500 uppercase">hrs</div>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-gray-300 self-center">:</div>
                <div className="text-center bg-gray-50 rounded-lg px-3 py-2 min-w-[55px]">
                  <div className="text-xl sm:text-2xl font-bold text-gray-900">{formatTime(countdown.minutes)}</div>
                  <div className="text-[10px] sm:text-xs text-gray-500 uppercase">min</div>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-gray-300 self-center">:</div>
                <div className="text-center bg-gray-50 rounded-lg px-3 py-2 min-w-[55px]">
                  <div className="text-xl sm:text-2xl font-bold text-gray-900">{formatTime(countdown.seconds)}</div>
                  <div className="text-[10px] sm:text-xs text-gray-500 uppercase">sec</div>
                </div>
              </div>
            </div>

            {/* Disabled Join Button */}
            <button
              disabled
              className="inline-flex items-center gap-2 bg-gray-200 text-gray-400 font-semibold px-8 py-4 rounded-xl cursor-not-allowed"
            >
              <Lock className="w-5 h-5" />
              Join Discussion — Locked
            </button>

            <p className="text-xs text-gray-400 mt-4 max-w-xs mx-auto">
              The meeting link unlocks at 7:00 PM and stays open until 11:00 PM for late joiners.
            </p>
          </div>
        )}
      </div>

      {/* Topic of the Week */}
      {bazaMugangaTopic && (
        <div className="card mb-6 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
            <h2 className="font-semibold text-gray-900">{t('baza.topicThisWeek')}</h2>
          </div>
          <p className="text-gray-600">{bazaMugangaTopic}</p>
        </div>
      )}

      {/* Privacy Features */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="text-center p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <CameraOff className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-xs text-gray-600 font-medium">{t('baza.cameraOff')}</p>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <Shield className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-xs text-gray-600 font-medium">{t('baza.noRecording')}</p>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-xs text-gray-600 font-medium">{t('baza.encrypted')}</p>
        </div>
      </div>

      {/* How It Works */}
      <div className="card border border-gray-200">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs">?</span>
          How Baza Muganga Works
        </h2>
        <ul className="space-y-3 text-sm text-gray-600">
          <li className="flex items-start gap-3">
            <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 font-medium">1</span>
            <span>Join every <strong>Friday 7:00 — 8:00 PM</strong> Rwanda time (CAT, UTC+2)</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 font-medium">2</span>
            <span>Use a pseudonym — your real identity stays private</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 font-medium">3</span>
            <span>Ask questions anonymously in the group discussion</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 font-medium">4</span>
            <span>Health professionals provide answers and guidance</span>
          </li>
        </ul>
      </div>

    </div>
  );
}
