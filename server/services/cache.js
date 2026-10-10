/**
 * Participant Cache Service
 * In-memory cache to avoid repeated Apps Script calls during search
 */

const NodeCache = require('node-cache');

// Cache with 5 minute TTL
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

const CACHE_KEY = 'participants';
const ATTENDANCE_KEY_PREFIX = 'attendance_today_';

function getParticipants() {
  return cache.get(CACHE_KEY) || null;
}

function setParticipants(data) {
  cache.set(CACHE_KEY, data);
}

function invalidateParticipants() {
  cache.del(CACHE_KEY);
}

function addParticipantToCache(participant) {
  const existing = cache.get(CACHE_KEY);
  if (existing && Array.isArray(existing)) {
    existing.push(participant);
    cache.set(CACHE_KEY, existing);
  }
}

function getAttendanceToday(eventId, date) {
  return cache.get(`${ATTENDANCE_KEY_PREFIX}${eventId}_${date}`) || null;
}

function setAttendanceToday(eventId, date, data) {
  cache.set(`${ATTENDANCE_KEY_PREFIX}${eventId}_${date}`, data, 120); // 2 min TTL
}

function invalidateAttendanceToday(eventId, date) {
  cache.del(`${ATTENDANCE_KEY_PREFIX}${eventId}_${date}`);
}

function clearAll() {
  cache.flushAll();
}

module.exports = {
  getParticipants,
  setParticipants,
  invalidateParticipants,
  addParticipantToCache,
  getAttendanceToday,
  setAttendanceToday,
  invalidateAttendanceToday,
  clearAll
};
