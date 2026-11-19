package backend.service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Builds a continuous, round-trip itinerary on a real date-time line.
 *
 * <p>This class has NO Spring or JPA dependency on purpose, so the whole
 * scheduling algorithm can be unit tested on its own
 * (see ItinerarySchedulerTest).</p>
 *
 * <h3>Why this exists</h3>
 * The previous generator stored a LocalDate plus LocalTime start/end values
 * and refused to let anything cross midnight. Long road legs (for example a
 * 450 minute drive that starts at 16:50) were therefore pushed to "tomorrow
 * morning", and on the final day the generator gave up with
 * "The trip dates are too short...". Here every activity has a full
 * LocalDateTime start and end, so an activity that crosses midnight is
 * perfectly valid and is simply stored with an end date one day later.
 *
 * <h3>How it works</h3>
 * <ol>
 *   <li>The traveller leaves the origin on the first trip day at the
 *       configured departure time (the usable window is 00:00 on the first
 *       day to 23:59 on the last day; nothing else is a cut-off).</li>
 *   <li>Stops are visited in the given order:
 *       travel leg (real OSRM time via {@link LegProvider}) then visit
 *       (expected duration, opening and closing hours respected).</li>
 *   <li>For a round trip the last activity is the return leg to the origin.</li>
 *   <li>Long legs are split into driving chunks with a rest stop or meal in
 *       between; meals are placed in configurable windows; an overnight
 *       stay is inserted when the traveller has been awake too long.</li>
 *   <li>Fixed blocks (locked and manual activities) are never overlapped.
 *       The generator schedules around them.</li>
 *   <li>If the comfortable plan does not fit inside the trip dates, it is
 *       retried with less slack (and the user is told what was dropped).
 *       Only when even the leanest plan cannot fit does it fail, with the
 *       exact numbers and the number of extra days that would work.</li>
 * </ol>
 */
public final class ItineraryScheduler {

    private ItineraryScheduler() {
    }

    // =====================================================================
    // PUBLIC MODEL
    // =====================================================================

    public enum BlockType {
        TRAVEL, RETURN, VISIT, MEAL, REST, FREE_TIME, ACCOMMODATION
    }

    public record Point(String name, double latitude, double longitude) {
        public boolean sameAs(Point other) {
            return other != null
                    && Math.abs(latitude - other.latitude) < 0.0001
                    && Math.abs(longitude - other.longitude) < 0.0001;
        }
    }

    /** One road leg. {@code minutes} is the raw routing time (no buffer). */
    public record Leg(double distanceKm, double minutes, boolean estimated, String source) {
    }

    @FunctionalInterface
    public interface LegProvider {
        Leg leg(Point from, Point to);
    }

    public record Stop(
            Integer destinationId,
            Point point,
            Integer expectedMinutes,
            LocalTime opens,
            LocalTime closes,
            String category) {
    }

    /**
     * A block that already exists and must not be moved or overlapped:
     * a locked activity or a manually created one.
     * {@code destinationId} + {@code visit} mark a locked visit of a saved
     * destination, which then counts as that destination's visit.
     */
    public record Fixed(
            LocalDateTime start,
            LocalDateTime end,
            String label,
            Integer destinationId,
            boolean visit) {
    }

    public record Meal(String name, LocalTime earliest, LocalTime latest, int minutes) {
    }

    public static final class Settings {
        public LocalTime departureTime = LocalTime.of(7, 0);
        /**
         * Earliest clock time a visit may start on any day when the destination
         * has no opening time of its own. Set to 00:00 for true round-the-clock
         * planning; the default stops the generator from sightseeing at dawn.
         */
        public LocalTime earliestVisitTime = LocalTime.of(7, 0);
        public boolean roundTrip = true;
        public boolean spreadAcrossTripDays = true;
        public int defaultVisitMinutes = 90;
        public double travelBufferPercent = 10;
        public int travelBufferMinutes = 0;
        public int maxContinuousTravelMinutes = 300;
        public int restStopMinutes = 20;
        public int maxAwakeMinutes = 16 * 60;
        public int overnightRestMinutes = 8 * 60;
        public boolean includeMeals = true;
        public boolean includeRestStops = true;
        public boolean includeOvernightRest = true;
        public List<Meal> meals = defaultMeals();

        public static List<Meal> defaultMeals() {
            return new ArrayList<>(List.of(
                    new Meal("Breakfast", LocalTime.of(7, 0), LocalTime.of(10, 30), 30),
                    new Meal("Lunch", LocalTime.of(12, 0), LocalTime.of(15, 0), 45),
                    new Meal("Dinner", LocalTime.of(19, 0), LocalTime.of(22, 30), 45)));
        }

        void validate() {
            if (departureTime == null) {
                throw new IllegalArgumentException("Departure time is required.");
            }
            if (earliestVisitTime == null) {
                earliestVisitTime = LocalTime.MIN;
            }
            if (defaultVisitMinutes <= 0) {
                throw new IllegalArgumentException("The default visit duration must be greater than zero.");
            }
            if (maxContinuousTravelMinutes < 30) {
                throw new IllegalArgumentException("The maximum continuous travel time must be at least 30 minutes.");
            }
            if (restStopMinutes <= 0 || overnightRestMinutes <= 0 || maxAwakeMinutes < 120) {
                throw new IllegalArgumentException("Rest durations must be positive and the awake limit at least 2 hours.");
            }
            if (travelBufferPercent < 0 || travelBufferMinutes < 0) {
                throw new IllegalArgumentException("Travel buffers cannot be negative.");
            }
            for (Meal m : meals) {
                if (m.minutes() <= 0 || m.latest().isBefore(m.earliest())) {
                    throw new IllegalArgumentException("Meal '" + m.name() + "' has an invalid window or duration.");
                }
            }
        }
    }

    public record Input(
            LocalDate tripStart,
            LocalDate tripEnd,
            Point origin,
            List<Stop> stops,
            Point accommodation,
            List<Fixed> fixed,
            Settings settings,
            LegProvider legs) {
    }

    public record Block(
            BlockType type,
            LocalDateTime start,
            LocalDateTime end,
            String name,
            String description,
            Integer destinationId,
            String category,
            Double distanceKm,
            boolean estimated,
            String routeSource) {

        public int minutes() {
            return (int) Duration.between(start, end).toMinutes();
        }
    }

    public record Plan(
            List<Block> blocks,
            List<String> warnings,
            String mode,
            LocalDateTime finishesAt) {
    }

    /** Thrown only when the selected trip dates genuinely cannot fit the plan. */
    public static class InsufficientTimeException extends RuntimeException {
        private static final long serialVersionUID = 1L;
        private final long requiredMinutes;
        private final long availableMinutes;
        private final int suggestedExtraDays;

        public InsufficientTimeException(
                String message, long requiredMinutes, long availableMinutes, int suggestedExtraDays) {
            super(message);
            this.requiredMinutes = requiredMinutes;
            this.availableMinutes = availableMinutes;
            this.suggestedExtraDays = suggestedExtraDays;
        }

        public long getRequiredMinutes() {
            return requiredMinutes;
        }

        public long getAvailableMinutes() {
            return availableMinutes;
        }

        public int getSuggestedExtraDays() {
            return suggestedExtraDays;
        }
    }

    // =====================================================================
    // ENTRY POINT
    // =====================================================================

    public static Plan schedule(Input in) {
        validate(in);

        LocalDateTime departure = in.tripStart().atTime(in.settings().departureTime);
        LocalDateTime windowEnd = in.tripEnd().atTime(23, 59);

        long required = requiredMinutes(in);
        long available = Math.max(0, Duration.between(departure, windowEnd).toMinutes());

        if (required > available) {
            throw insufficient(in, required, available, windowEnd, null);
        }

        DoesNotFit last = null;
        for (Attempt attempt : attempts(in.settings())) {
            try {
                return new Run(in, attempt, windowEnd).run();
            } catch (DoesNotFit e) {
                last = e;
            }
        }
        throw insufficient(in, required, available, windowEnd, last);
    }

    // =====================================================================
    // FEASIBILITY / ERROR MESSAGE
    // =====================================================================

    /** Pure travel + visit time. The least time the plan can possibly need. */
    private static long requiredMinutes(Input in) {
        Settings s = in.settings();
        long total = 0;
        Point where = in.origin();
        for (Stop stop : in.stops()) {
            if (!where.sameAs(stop.point())) {
                total += planned(s, in.legs().leg(where, stop.point()).minutes());
            }
            if (!hasLockedVisit(in, stop)) {
                total += visitMinutes(s, stop);
            }
            where = stop.point();
        }
        if (s.roundTrip && !where.sameAs(in.origin())) {
            total += planned(s, in.legs().leg(where, in.origin()).minutes());
        }
        return total;
    }

    private static boolean hasLockedVisit(Input in, Stop stop) {
        if (stop.destinationId() == null) {
            return false;
        }
        for (Fixed f : in.fixed()) {
            if (f.visit() && stop.destinationId().equals(f.destinationId())) {
                return true;
            }
        }
        return false;
    }

    private static InsufficientTimeException insufficient(
            Input in, long required, long available, LocalDateTime windowEnd, DoesNotFit last) {

        int extra = suggestExtraDays(in);
        Settings s = in.settings();

        StringBuilder route = new StringBuilder(in.origin().name());
        long travel = 0;
        long visits = 0;
        Point where = in.origin();
        for (Stop stop : in.stops()) {
            route.append(" \u2192 ").append(stop.point().name());
            if (!where.sameAs(stop.point())) {
                travel += planned(s, in.legs().leg(where, stop.point()).minutes());
            }
            if (!hasLockedVisit(in, stop)) {
                visits += visitMinutes(s, stop);
            }
            where = stop.point();
        }
        if (s.roundTrip && !where.sameAs(in.origin())) {
            route.append(" \u2192 ").append(in.origin().name());
            travel += planned(s, in.legs().leg(where, in.origin()).minutes());
        }

        StringBuilder msg = new StringBuilder();
        msg.append("The selected trip dates cannot fit this ")
                .append(s.roundTrip ? "round trip" : "route")
                .append(" (").append(route).append("). ");
        msg.append("It needs about ").append(formatMinutes(travel)).append(" of road travel plus ")
                .append(formatMinutes(visits)).append(" of visits (")
                .append(formatMinutes(travel + visits)).append(" in total, before meals and rest). ");
        msg.append("Available time: ").append(formatMinutes(available))
                .append(" between the ").append(s.departureTime).append(" departure on ")
                .append(in.tripStart()).append(" and 23:59 on ").append(in.tripEnd()).append(". ");
        if (required <= available) {
            msg.append("That fits in principle, but once opening hours, locked or manual activities and ")
                    .append("breaks are included it still runs past the end of the trip");
            if (last != null) {
                msg.append(": ").append(last.getMessage());
            }
            msg.append(". ");
        }
        if (extra > 0) {
            msg.append("Extending the trip by ").append(extra).append(" day")
                    .append(extra == 1 ? "" : "s").append(" would fit it.");
        } else {
            msg.append("Extend the trip, start earlier, or remove a destination.");
        }
        return new InsufficientTimeException(msg.toString(), required, available, extra);
    }

    /** Smallest number of extra days (1..30) for which a plan exists, or 0 if none. */
    private static int suggestExtraDays(Input in) {
        for (int extra = 1; extra <= 30; extra++) {
            LocalDate end = in.tripEnd().plusDays(extra);
            LocalDateTime windowEnd = end.atTime(23, 59);
            for (Attempt attempt : attempts(in.settings())) {
                try {
                    Input longer = new Input(in.tripStart(), end, in.origin(), in.stops(),
                            in.accommodation(), in.fixed(), in.settings(), in.legs());
                    new Run(longer, attempt, windowEnd).run();
                    return extra;
                } catch (DoesNotFit ignored) {
                    // try the next, leaner attempt
                }
            }
        }
        return 0;
    }

    // =====================================================================
    // ATTEMPT TIERS
    // =====================================================================

    private record Attempt(
            String mode,
            boolean spread,
            boolean meals,
            boolean restStops,
            boolean overnight,
            String warning) {
    }

    private static List<Attempt> attempts(Settings s) {
        List<Attempt> list = new ArrayList<>();
        if (s.spreadAcrossTripDays) {
            list.add(new Attempt("SPREAD", true, s.includeMeals, s.includeRestStops,
                    s.includeOvernightRest, null));
        }
        list.add(new Attempt("COMPACT", false, s.includeMeals, s.includeRestStops,
                s.includeOvernightRest,
                s.spreadAcrossTripDays
                        ? "The trip dates are tight, so destinations were scheduled back-to-back "
                        + "instead of being spread across all trip days." : null));
        if (s.includeRestStops || s.includeOvernightRest) {
            list.add(new Attempt("NO_REST", false, s.includeMeals, false, false,
                    "Rest stops and overnight rest were removed because the schedule did not "
                            + "fit the trip dates otherwise. This plan leaves no time to sleep, so it "
                            + "is not realistic for real driving: extend the trip if you can."));
        }
        if (s.includeMeals) {
            list.add(new Attempt("NON_STOP", false, false, false, false,
                    "Meal breaks, rest stops and overnight rest were all removed because the "
                            + "schedule did not fit the trip dates otherwise. This is a non-stop plan "
                            + "that is not realistic for real driving: extend the trip if you can."));
        }
        return list;
    }

    // =====================================================================
    // SHARED HELPERS
    // =====================================================================

    private static void validate(Input in) {
        if (in == null || in.tripStart() == null || in.tripEnd() == null) {
            throw new IllegalArgumentException("Trip start and end dates are required.");
        }
        if (in.tripEnd().isBefore(in.tripStart())) {
            throw new IllegalArgumentException("The trip end date cannot be before the start date.");
        }
        if (in.origin() == null) {
            throw new IllegalArgumentException("The trip starting point is required.");
        }
        if (in.stops() == null || in.stops().isEmpty()) {
            throw new IllegalArgumentException("At least one destination is required.");
        }
        if (in.legs() == null || in.settings() == null) {
            throw new IllegalArgumentException("A route provider and settings are required.");
        }
        in.settings().validate();
        for (Fixed f : in.fixed()) {
            if (f.start() == null || f.end() == null || !f.end().isAfter(f.start())) {
                throw new IllegalArgumentException("Fixed block '" + f.label() + "' has an invalid time range.");
            }
        }
    }

    /** Planned minutes for a routing time: OSRM minutes plus the configured buffer. */
    static int planned(Settings s, double rawMinutes) {
        double buffered = rawMinutes * (1 + s.travelBufferPercent / 100.0);
        return Math.max(1, (int) Math.ceil(buffered) + s.travelBufferMinutes);
    }

    private static int visitMinutes(Settings s, Stop stop) {
        return stop.expectedMinutes() != null && stop.expectedMinutes() > 0
                ? stop.expectedMinutes() : s.defaultVisitMinutes;
    }

    static String formatMinutes(long minutes) {
        long h = minutes / 60;
        long m = minutes % 60;
        if (h == 0) {
            return m + " min";
        }
        return m == 0 ? h + " h" : h + " h " + m + " min";
    }

    private static final DateTimeFormatter WHEN = DateTimeFormatter.ofPattern("d MMM yyyy HH:mm", Locale.ENGLISH);

    private static String when(LocalDateTime t) {
        return WHEN.format(t);
    }

    private static LocalDateTime max(LocalDateTime a, LocalDateTime b) {
        return a.isAfter(b) ? a : b;
    }

    private static LocalDateTime min(LocalDateTime a, LocalDateTime b) {
        return a.isBefore(b) ? a : b;
    }

    private static long between(LocalDateTime a, LocalDateTime b) {
        return Duration.between(a, b).toMinutes();
    }

    /** Internal: this attempt ran past the end of the trip. */
    private static final class DoesNotFit extends RuntimeException {
        private static final long serialVersionUID = 1L;

        DoesNotFit(String message) {
            super(message, null, false, false);
        }
    }

    // =====================================================================
    // ONE ATTEMPT
    // =====================================================================

    private static final class Run {

        private final Input in;
        private final Settings s;
        private final Attempt at;
        private final LocalDateTime windowEnd;
        private final List<Fixed> fixed;
        private final List<Block> out = new ArrayList<>();
        private final Set<String> warnings = new LinkedHashSet<>();
        private final Set<String> mealsTaken = new HashSet<>();
        private final Set<String> defaultedVisits = new LinkedHashSet<>();
        private int estimatedLegs = 0;

        private LocalDateTime clock;
        private LocalDateTime lastWake;
        private Point where;
        private boolean midLeg = false;

        Run(Input in, Attempt at, LocalDateTime windowEnd) {
            this.in = in;
            this.s = in.settings();
            this.at = at;
            this.windowEnd = windowEnd;
            this.fixed = new ArrayList<>(in.fixed());
            this.fixed.sort(Comparator.comparing(Fixed::start));
        }

        Plan run() {
            clock = in.tripStart().atTime(s.departureTime);
            lastWake = clock;
            where = in.origin();

            if (clock.isAfter(windowEnd)) {
                throw new DoesNotFit("the departure time is after the end of the trip");
            }

            int n = in.stops().size();
            for (int i = 0; i < n; i++) {
                Stop stop = in.stops().get(i);
                if (at.spread()) {
                    idleUntil(notBefore(i, n));
                }
                if (!where.sameAs(stop.point())) {
                    travel(BlockType.TRAVEL, stop.point(), "Travel to " + stop.point().name());
                }
                visit(stop);
            }

            if (s.roundTrip) {
                if (where.sameAs(in.origin())) {
                    warnings.add("The last destination is the same place as the starting point, "
                            + "so no return journey was needed.");
                } else {
                    if (at.spread()) {
                        idleUntil(returnNotBefore());
                    }
                    travel(BlockType.RETURN, in.origin(), "Return to " + in.origin().name());
                }
            }

            if (estimatedLegs > 0) {
                warnings.add("Road routing was unavailable for " + estimatedLegs
                        + " travel leg(s), so those times are straight-line estimates and should be "
                        + "treated as rough.");
            }
            if (!defaultedVisits.isEmpty()) {
                warnings.add("No expected duration is saved for " + String.join(", ", defaultedVisits)
                        + ", so the default of " + s.defaultVisitMinutes + " minutes was used.");
            }
            if (at.warning() != null) {
                warnings.add(at.warning());
            }

            return new Plan(List.copyOf(out), List.copyOf(warnings), at.mode(), clock);
        }

        // -----------------------------------------------------------------
        // pacing
        // -----------------------------------------------------------------

        /** Earliest departure towards stop i so destinations spread over the trip days. */
        private LocalDateTime notBefore(int i, int n) {
            int days = (int) (in.tripEnd().toEpochDay() - in.tripStart().toEpochDay()) + 1;
            int offset;
            if (s.roundTrip) {
                offset = (i * (days - 1)) / n;
            } else {
                offset = n <= 1 ? 0 : (i * (days - 1)) / (n - 1);
            }
            return in.tripStart().plusDays(offset).atTime(s.departureTime);
        }

        /** The return leg starts on the final day, but never so late that it cannot finish. */
        private LocalDateTime returnNotBefore() {
            Leg leg = in.legs().leg(where, in.origin());
            int plannedMinutes = planned(s, leg.minutes());
            long reserve = (long) (plannedMinutes * 1.25) + 120;
            if (at.overnight() && reserve > s.maxAwakeMinutes - 60) {
                // A return this long needs a night's sleep part-way through.
                reserve += s.overnightRestMinutes;
            }
            LocalDateTime latestStart = windowEnd.minusMinutes(reserve);
            LocalDateTime finalDayStart = in.tripEnd().atTime(s.departureTime);
            return min(finalDayStart, latestStart);
        }

        private void idleUntil(LocalDateTime target) {
            int guard = 0;
            while (clock.isBefore(target) && guard++ < 10_000) {
                maintain(0);
                if (!clock.isBefore(target)) {
                    break;
                }
                LocalDateTime next = target;
                if (at.overnight()) {
                    next = min(next, lastWake.plusMinutes(s.maxAwakeMinutes - 29));
                }
                if (at.meals()) {
                    LocalDateTime mealStart = nextMealStart();
                    if (mealStart != null) {
                        next = min(next, mealStart);
                    }
                }
                if (!next.isAfter(clock)) {
                    next = min(target, clock.plusMinutes(30));
                }
                fillGap(BlockType.FREE_TIME, clock, next,
                        "Free time in " + where.name(),
                        "Spare time at " + where.name() + " before the next part of the trip.");
            }
        }

        // -----------------------------------------------------------------
        // low level placement
        // -----------------------------------------------------------------

        /** Earliest start at or after {@code from} where [start, start+minutes) hits no fixed block. */
        private LocalDateTime freeSlot(LocalDateTime from, int minutes) {
            LocalDateTime start = from;
            boolean moved;
            do {
                moved = false;
                LocalDateTime end = start.plusMinutes(minutes);
                for (Fixed f : fixed) {
                    if (start.isBefore(f.end()) && end.isAfter(f.start())) {
                        start = f.end();
                        moved = true;
                        break;
                    }
                }
            } while (moved);
            return start;
        }

        private Block place(
                BlockType type, String name, String description, int minutes,
                Integer destinationId, String category,
                Double km, boolean estimated, String source) {

            if (minutes <= 0) {
                throw new IllegalStateException("Activity '" + name + "' has no duration.");
            }
            LocalDateTime start = freeSlot(clock, minutes);
            LocalDateTime end = start.plusMinutes(minutes);
            if (end.isAfter(windowEnd)) {
                throw new DoesNotFit("'" + name + "' would end on " + when(end)
                        + ", after the trip ends on " + when(windowEnd));
            }
            Block block = new Block(type, start, end, name, description, destinationId,
                    category, km, estimated, source);
            out.add(block);
            clock = end;
            if (type == BlockType.ACCOMMODATION) {
                lastWake = end;
            }
            return block;
        }

        /** Fills [from, to) with blocks in the gaps between fixed blocks, then moves the clock to {@code to}. */
        private void fillGap(BlockType type, LocalDateTime from, LocalDateTime to, String name, String description) {
            LocalDateTime cur = from;
            for (Fixed f : fixed) {
                if (!f.end().isAfter(cur)) {
                    continue;
                }
                if (!f.start().isBefore(to)) {
                    break;
                }
                if (f.start().isAfter(cur)) {
                    emitGap(type, cur, min(f.start(), to), name, description);
                }
                cur = max(cur, f.end());
                if (!cur.isBefore(to)) {
                    break;
                }
            }
            if (cur.isBefore(to)) {
                emitGap(type, cur, to, name, description);
            }
            clock = max(clock, to);
            if (type == BlockType.ACCOMMODATION) {
                lastWake = clock;
            }
        }

        private void emitGap(BlockType type, LocalDateTime from, LocalDateTime to, String name, String description) {
            if (!to.isAfter(from)) {
                return;
            }
            if (to.isAfter(windowEnd)) {
                throw new DoesNotFit("'" + name + "' would end on " + when(to)
                        + ", after the trip ends on " + when(windowEnd));
            }
            out.add(new Block(type, from, to, name, description, null,
                    type.name(), null, false, null));
        }

        // -----------------------------------------------------------------
        // sleep and meals
        // -----------------------------------------------------------------

        private long awakeMinutes() {
            return between(lastWake, clock);
        }

        private boolean sleepNeeded() {
            return at.overnight() && awakeMinutes() >= s.maxAwakeMinutes - 29;
        }

        private void sleep() {
            Point accommodation = in.accommodation();
            if (!midLeg && accommodation != null && !where.sameAs(accommodation)) {
                Leg leg = in.legs().leg(where, accommodation);
                int minutes = planned(s, leg.minutes());
                trackEstimate(leg);
                travelToAccommodation(accommodation, leg, minutes);
                where = accommodation;
            }
            String name = midLeg
                    ? "Overnight rest en route"
                    : "Overnight stay at " + where.name();
            place(BlockType.ACCOMMODATION, name,
                    "Overnight rest of " + formatMinutes(s.overnightRestMinutes)
                            + (midLeg ? " part-way through a long journey." : " at " + where.name() + "."),
                    s.overnightRestMinutes, null, "ACCOMMODATION", null, false, null);
        }

        private void travelToAccommodation(Point accommodation, Leg leg, int totalMinutes) {
            int remaining = totalMinutes;
            boolean first = true;
            while (remaining > 0) {
                int upcoming = Math.min(remaining, s.maxContinuousTravelMinutes);
                Meal meal = mealDue(upcoming);
                if (meal != null) {
                    eat(meal);
                    continue;
                }

                int chunk = trimForFixed(trimForMeal(upcoming));
                boolean hitDrivingLimit = chunk >= s.maxContinuousTravelMinutes;
                double km = leg.distanceKm() * chunk / totalMinutes;
                String label = "Travel to overnight accommodation: " + accommodation.name()
                        + (first ? "" : " (continued)");
                place(BlockType.TRAVEL, label,
                        "Road trip from " + (first ? where.name() : "the previous stop")
                                + " to the accommodation selected for this trip"
                                + routeNote(leg, leg.minutes(), totalMinutes),
                        chunk, null, "TRAVEL", round2(km), leg.estimated(), leg.source());
                remaining -= chunk;
                first = false;
                if (remaining > 0 && hitDrivingLimit && at.restStops()) {
                    place(BlockType.REST, "Rest stop",
                            "Short break on the way to " + accommodation.name() + ".",
                            s.restStopMinutes, null, "BREAK", null, false, null);
                }
            }
        }

        private Meal mealDue(int upcomingMinutes) {
            if (!at.meals()) {
                return null;
            }
            LocalDate day = clock.toLocalDate();
            for (Meal meal : sortedMeals()) {
                if (mealsTaken.contains(key(day, meal))) {
                    continue;
                }
                LocalDateTime ws = day.atTime(meal.earliest());
                LocalDateTime we = day.atTime(meal.latest());
                boolean crosses = clock.plusMinutes(upcomingMinutes).isAfter(we);
                LocalDateTime from = crosses ? ws.minusMinutes(120) : ws;
                if (!clock.isBefore(from) && !clock.isAfter(we)) {
                    return meal;
                }
            }
            return null;
        }

        private void eat(Meal meal) {
            mealsTaken.add(key(clock.toLocalDate(), meal));
            place(BlockType.MEAL, meal.name(),
                    meal.name() + " break near " + where.name() + ".",
                    meal.minutes(), null, "MEAL", null, false, null);
        }

        /** Next time a not-yet-taken meal window opens after the clock, or null. */
        private LocalDateTime nextMealStart() {
            LocalDateTime best = null;
            for (int d = 0; d <= 1; d++) {
                LocalDate day = clock.toLocalDate().plusDays(d);
                for (Meal meal : sortedMeals()) {
                    LocalDateTime ws = day.atTime(meal.earliest());
                    if (ws.isAfter(clock) && !mealsTaken.contains(key(day, meal))) {
                        best = best == null ? ws : min(best, ws);
                    }
                }
            }
            return best;
        }

        private List<Meal> sortedMeals() {
            List<Meal> list = new ArrayList<>(s.meals);
            list.sort(Comparator.comparing(Meal::earliest));
            return list;
        }

        private static String key(LocalDate day, Meal meal) {
            return day + "|" + meal.name();
        }

        /** Inserts any sleep or meal that is due before the next block. Returns true if something was added. */
        private boolean maintain(int upcomingMinutes) {
            boolean inserted = false;
            for (int guard = 0; guard < 12; guard++) {
                if (sleepNeeded()) {
                    sleep();
                    inserted = true;
                    continue;
                }
                Meal meal = mealDue(upcomingMinutes);
                if (meal != null) {
                    eat(meal);
                    inserted = true;
                    continue;
                }
                break;
            }
            return inserted;
        }

        // -----------------------------------------------------------------
        // travel
        // -----------------------------------------------------------------

        private void travel(BlockType type, Point to, String label) {
            Point startedAt = where;
            Leg leg = in.legs().leg(where, to);
            trackEstimate(leg);
            int total = planned(s, leg.minutes());
            int remaining = total;
            boolean first = true;
            boolean lastChunkHitLimit = false;

            while (remaining > 0) {
                int upcoming = Math.min(remaining, s.maxContinuousTravelMinutes);
                boolean inserted = maintain(upcoming);

                if (first && !where.sameAs(startedAt)) {
                    // An overnight stay moved the traveller to the accommodation, so the
                    // journey now starts from there. Re-route it from the new position.
                    if (where.sameAs(to)) {
                        break;
                    }
                    leg = in.legs().leg(where, to);
                    trackEstimate(leg);
                    total = planned(s, leg.minutes());
                    remaining = total;
                }

                if (!first && !inserted && lastChunkHitLimit && at.restStops()) {
                    place(BlockType.REST, "Rest stop",
                            "Short break on the way to " + to.name() + ".",
                            s.restStopMinutes, null, "BREAK", null, false, null);
                }

                int chunk = Math.min(remaining, s.maxContinuousTravelMinutes);
                if (at.overnight()) {
                    chunk = (int) Math.min(chunk, Math.max(1, s.maxAwakeMinutes - awakeMinutes()));
                }
                if (at.meals()) {
                    chunk = trimForMeal(chunk);
                }
                chunk = trimForFixed(chunk);

                lastChunkHitLimit = chunk >= s.maxContinuousTravelMinutes;
                double km = leg.distanceKm() * chunk / total;
                place(type, first ? label : label + " (continued)",
                        "Road trip from " + (first ? where.name() : "the previous stop") + " to " + to.name()
                                + routeNote(leg, leg.minutes(), total),
                        chunk, null, "TRAVEL", round2(km), leg.estimated(), leg.source());

                remaining -= chunk;
                first = false;
                midLeg = remaining > 0;
            }
            where = to;
            midLeg = false;
        }

        /** Stop for a meal when this chunk would otherwise drive straight through a whole meal window. */
        private int trimForMeal(int chunk) {
            LocalDate day = clock.toLocalDate();
            for (Meal meal : sortedMeals()) {
                if (mealsTaken.contains(key(day, meal))) {
                    continue;
                }
                LocalDateTime ws = day.atTime(meal.earliest());
                LocalDateTime we = day.atTime(meal.latest());
                if (clock.isBefore(ws) && clock.plusMinutes(chunk).isAfter(we)) {
                    long toWindow = between(clock, ws);
                    if (toWindow >= 30) {
                        return (int) Math.min(chunk, toWindow);
                    }
                }
            }
            return chunk;
        }

        /** Drive only until the next fixed block begins, then continue after it. */
        private int trimForFixed(int chunk) {
            LocalDateTime base = freeSlot(clock, 1);
            LocalDateTime end = base.plusMinutes(chunk);
            for (Fixed f : fixed) {
                if (f.start().isAfter(base) && f.start().isBefore(end)) {
                    long gap = between(base, f.start());
                    if (gap >= 30) {
                        return (int) gap;
                    }
                }
            }
            return chunk;
        }

        private void trackEstimate(Leg leg) {
            if (leg.estimated()) {
                estimatedLegs++;
            }
        }

        private String routeNote(Leg leg, double rawMinutes, int plannedMinutes) {
            StringBuilder sb = new StringBuilder();
            sb.append(" (").append(String.format(Locale.ROOT, "%.1f", leg.distanceKm())).append(" km; ");
            if (leg.estimated()) {
                sb.append("ESTIMATED from straight-line distance because road routing was unavailable: ");
            } else {
                sb.append("road routing time ");
            }
            sb.append(formatMinutes(Math.round(rawMinutes)));
            if (plannedMinutes != Math.round(rawMinutes)) {
                sb.append(", planned ").append(formatMinutes(plannedMinutes)).append(" with the travel buffer");
            }
            sb.append(")");
            return sb.toString();
        }

        // -----------------------------------------------------------------
        // visits
        // -----------------------------------------------------------------

        private void visit(Stop stop) {
            boolean defaulted = stop.expectedMinutes() == null || stop.expectedMinutes() <= 0;
            int minutes = visitMinutes(s, stop);
            if (defaulted) {
                defaultedVisits.add(stop.point().name());
            }

            maintain(minutes);
            LocalDateTime arrival = clock;

            // A locked visit of this saved destination counts as its visit.
            Fixed locked = lockedVisit(stop);
            if (locked != null) {
                if (!arrival.isAfter(locked.start())) {
                    clock = max(clock, locked.end());
                    where = stop.point();
                    return;
                }
                warnings.add("You arrive at " + stop.point().name() + " on " + when(arrival)
                        + ", after the locked visit there started on " + when(locked.start())
                        + ". A new visit was scheduled; unlock or move the locked activity if you "
                        + "do not want two visits.");
            }

            LocalTime dayOpens = stop.opens() == null ? s.earliestVisitTime : stop.opens();
            boolean tooShort = false;
            if (stop.closes() != null) {
                tooShort = Duration.between(dayOpens, stop.closes()).toMinutes() < minutes;
                if (tooShort) {
                    warnings.add(stop.point().name() + " is open for less time than the " + minutes
                            + " minute visit (open " + dayOpens + "\u2013" + stop.closes()
                            + "). The visit was scheduled from opening time anyway.");
                }
            }

            LocalDateTime cand = arrival;
            LocalDateTime start;
            String waitReason = null;
            while (true) {
                if (cand.isAfter(windowEnd)) {
                    throw new DoesNotFit("the visit to " + stop.point().name()
                            + " cannot start before the trip ends");
                }
                LocalDate day = cand.toLocalDate();
                LocalDateTime open = day.atTime(dayOpens);
                LocalDateTime s0 = cand.isBefore(open) ? open : cand;
                if (s0.isAfter(cand)) {
                    waitReason = stop.opens() != null
                            ? "Wait until " + stop.point().name() + " opens at " + stop.opens()
                            : "Wait until the usual sightseeing start time (" + dayOpens + ")";
                }
                LocalDateTime s1 = freeSlot(s0, minutes);
                if (s1.isAfter(s0) && waitReason == null) {
                    waitReason = "Wait for a free slot (another activity is already scheduled)";
                }
                if (!s1.toLocalDate().equals(day)) {
                    cand = s1;
                    continue;
                }
                if (stop.closes() != null && !tooShort
                        && s1.plusMinutes(minutes).isAfter(day.atTime(stop.closes()))) {
                    cand = day.plusDays(1).atStartOfDay();
                    waitReason = "Wait until " + stop.point().name() + " reopens on " + cand.toLocalDate();
                    continue;
                }
                start = s1;
                break;
            }

            if (start.isAfter(arrival)) {
                long wait = between(arrival, start);
                if (at.overnight() && wait >= 360) {
                    fillGap(BlockType.ACCOMMODATION, arrival, start,
                            "Overnight stay at " + where.name(),
                            waitReason + ". Staying overnight at " + where.name() + ".");
                } else {
                    fillGap(BlockType.REST, arrival, start,
                            waitReason == null ? "Wait" : waitReason,
                            waitReason + ".");
                }
            }
            clock = start;
            where = stop.point();

            String note = defaulted
                    ? " (visit duration estimated: no expected duration is saved for this destination)"
                    : "";
            place(BlockType.VISIT, "Visit " + stop.point().name(),
                    "Explore " + stop.point().name() + note + ".",
                    minutes, stop.destinationId(),
                    stop.category() == null || stop.category().isBlank() ? "SIGHTSEEING" : stop.category(),
                    null, defaulted, null);
        }

        private Fixed lockedVisit(Stop stop) {
            if (stop.destinationId() == null) {
                return null;
            }
            for (Fixed f : fixed) {
                if (f.visit() && stop.destinationId().equals(f.destinationId())) {
                    return f;
                }
            }
            return null;
        }

        private static double round2(double v) {
            return Math.round(v * 100.0) / 100.0;
        }
    }
}
