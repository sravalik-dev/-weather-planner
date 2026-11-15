const h = require('/tmp/helpers_under_test.js');
let bad = 0; const eq = (a, b, m) => { const ok = JSON.stringify(a) === JSON.stringify(b); console.log((ok ? '  ok   ' : '  FAIL ') + m + (ok ? '' : `  got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`)); if (!ok) bad++; };

// trip days: dates win over a stale noOfDays
eq(h.getTripDays({ startDate: '2026-12-20', endDate: '2026-12-27', noOfDays: 3 }), 8, 'getTripDays uses the date range (8), not stale noOfDays (3)');
eq(h.getTripDays({ startDate: '2026-12-20', endDate: '2026-12-20' }), 1, 'one-day trip = 1 day');
eq(h.getTripDays({ noOfDays: 4 }), 4, 'falls back to noOfDays when dates are missing');
eq(h.getTripDays({ startDate: '2026-12-27', endDate: '2026-12-20', noOfDays: 2 }), 2, 'end before start falls back safely');
eq(h.getTripDays({}), 1, 'empty trip = 1 day');

// activity crossing midnight as the backend returns it (Jackson ISO strings, seconds included)
const travel = { activityId: 9, activityDate: '2026-12-20', startTime: '16:50:00', endDate: '2026-12-21', endTime: '00:20:00', duration: 450, activityName: 'Travel to Chennai', category: 'TRAVEL', activityType: 'TRAVEL', distanceKm: 505.0, estimated: false, routeSource: 'OSRM', generated: true, locked: false };
const n = h.normalizeActivity(travel, 1);
eq([n.time, n.endTime, n.crossesMidnight, n.endDayOffset], ['16:50', '00:20', true, 1], 'midnight-crossing activity: 16:50 -> 00:20 (+1 day)');
eq([n.activityType, n.distanceKm, n.estimated, n.id], ['TRAVEL', 505, false, 9], 'type, distance, estimate flag, id mapped');

// legacy row from before the migration: no endDate/type/etc.
const legacy = h.normalizeActivity({ activityId: 3, activityDate: '2026-12-20', startTime: '09:00:00', endTime: '10:00:00', duration: 60, activityName: 'beach', category: 'Custom', destinationId: null }, 1);
eq([legacy.crossesMidnight, legacy.endDayOffset, legacy.activityType, legacy.distanceKm, legacy.estimated], [false, 0, 'CUSTOM', null, false], 'legacy row (no new columns) still normalises');
eq(h.normalizeActivity({ activityId: 4, activityDate: '2026-12-20', startTime: '12:00', endTime: '12:45', category: 'MEAL' }, 1).activityType, 'MEAL', 'legacy MEAL category -> MEAL');
eq(h.normalizeActivity({ activityId: 5, activityDate: '2026-12-20', startTime: '12:00', endTime: '12:45', category: 'BREAK' }, 1).activityType, 'REST', 'legacy BREAK category -> REST');
eq(h.normalizeActivity({ activityId: 6, activityDate: '2026-12-20', startTime: '12:00', endTime: '13:00', category: 'Beach', destinationId: 2 }, 1).activityType, 'VISIT', 'legacy destination row -> VISIT');
eq(h.normalizeActivity({ activityType: 'RETURN', activityDate: '2026-12-20', startTime: '08:00', endTime: '09:00' }, 1).activityType, 'RETURN', 'RETURN type kept');

// grouping into day cards: an activity that crosses midnight sits on its START day
const items = [travel, { ...travel, activityId: 10, activityDate: '2026-12-21', startTime: '07:00:00', endDate: '2026-12-21', endTime: '12:00:00', orderIndex: 1, activityType: 'VISIT' }];
const days = h.normalizeItinerary(items, 3, '2026-12-20');
eq(days.map(d => d.activities.length), [1, 1, 0], 'activities grouped under their start date');

// formatting
eq(h.formatMinutesLong(450), '7 h 30 min', 'formatMinutesLong 450 -> 7 h 30 min');
eq([h.formatMinutesLong(60), h.formatMinutesLong(45), h.formatMinutesLong(null)], ['1 h', '45 min', '--'], 'formatMinutesLong edge cases');
eq(h.formatShortDate('2026-12-20'), '20 Dec', 'formatShortDate');
eq(h.toInputTime('00:20:00'), '00:20', 'toInputTime strips seconds, keeps 00:20');
eq(h.daysBetweenDates('2026-12-31', '2027-01-02'), 2, 'daysBetweenDates across a year boundary');

console.log(bad === 0 ? '\nALL FRONTEND HELPER CHECKS PASSED' : `\n${bad} FAILED`); process.exit(bad ? 1 : 0);
