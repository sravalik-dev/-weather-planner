package backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import backend.service.ItineraryScheduler.Block;
import backend.service.ItineraryScheduler.BlockType;
import backend.service.ItineraryScheduler.Fixed;
import backend.service.ItineraryScheduler.InsufficientTimeException;
import backend.service.ItineraryScheduler.Input;
import backend.service.ItineraryScheduler.Leg;
import backend.service.ItineraryScheduler.Plan;
import backend.service.ItineraryScheduler.Point;
import backend.service.ItineraryScheduler.Settings;
import backend.service.ItineraryScheduler.Stop;

/**
 * Tests for the pure scheduling engine. No Spring, no database, no network.
 *
 * Leg times used here are test fixtures, not live OSRM answers.
 */
class ItinerarySchedulerTest {

    private static final LocalDate D1 = LocalDate.of(2026, 12, 20);

    // -----------------------------------------------------------------
    // fixtures
    // -----------------------------------------------------------------

    private static final Point ORIGIN = new Point("Origin", 16.50, 80.65);
    private static final Point A = new Point("Chennai", 13.08784, 80.27847);
    private static final Point B = new Point("Coimbatore", 11.00555, 76.96612);
    private static final Point C = new Point("Kochi", 9.9312, 76.2673);

    /** Table-driven road legs: "From>To" -> minutes, km. Symmetric. */
    private static final class Roads implements ItineraryScheduler.LegProvider {
        private final Map<String, double[]> table = new HashMap<>();
        int calls = 0;

        Roads leg(Point a, Point b, double minutes, double km) {
            table.put(a.name() + ">" + b.name(), new double[] {minutes, km});
            table.put(b.name() + ">" + a.name(), new double[] {minutes, km});
            return this;
        }

        @Override
        public Leg leg(Point from, Point to) {
            calls++;
            double[] v = table.get(from.name() + ">" + to.name());
            if (v == null) {
                throw new IllegalStateException("No fixture leg " + from.name() + ">" + to.name());
            }
            return new Leg(v[1], v[0], false, "OSRM");
        }
    }

    private static Roads roads() {
        return new Roads()
                .leg(ORIGIN, A, 420, 505)     // a long leg
                .leg(A, B, 450, 505)          // exactly 450 minutes
                .leg(B, C, 240, 195)
                .leg(C, ORIGIN, 690, 840);
    }

    private static Stop stop(int id, Point p, Integer minutes) {
        return new Stop(id, p, minutes, null, null, "SIGHTSEEING");
    }

    private static Settings noBuffer() {
        Settings s = new Settings();
        s.travelBufferPercent = 0;
        return s;
    }

    private static Input input(LocalDate start, LocalDate end, List<Stop> stops, Settings s, Roads r, Fixed... fixed) {
        return new Input(start, end, ORIGIN, stops, null, List.of(fixed), s, r);
    }

    // -----------------------------------------------------------------
    // invariants checked on EVERY plan
    // -----------------------------------------------------------------

    private static void assertValid(Plan plan, Input in) {
        assertNotNull(plan);
        List<Block> blocks = plan.blocks();
        assertFalse(blocks.isEmpty(), "plan has no activities");

        LocalDateTime first = in.tripStart().atStartOfDay();
        LocalDateTime last = in.tripEnd().atTime(23, 59);

        for (int i = 0; i < blocks.size(); i++) {
            Block b = blocks.get(i);
            assertTrue(b.end().isAfter(b.start()), "end must be after start: " + b.name());
            assertTrue(b.minutes() >= 1, "zero-length activity: " + b.name());
            assertFalse(b.start().isBefore(first), "starts before the trip: " + b.name());
            assertFalse(b.end().isAfter(last), "ends after the trip: " + b.name() + " " + b.end());
            if (b.type() == BlockType.TRAVEL || b.type() == BlockType.RETURN) {
                assertTrue(b.distanceKm() != null && b.distanceKm() >= 0, "travel without distance: " + b.name());
            }
            if (i > 0) {
                Block prev = blocks.get(i - 1);
                assertFalse(b.start().isBefore(prev.end()),
                        "overlap: '" + prev.name() + "' ends " + prev.end() + " but '" + b.name()
                                + "' starts " + b.start());
            }
            for (Fixed f : in.fixed()) {
                boolean overlaps = b.start().isBefore(f.end()) && b.end().isAfter(f.start());
                assertFalse(overlaps, "'" + b.name() + "' overlaps fixed block '" + f.label() + "'");
            }
        }

        // no destination is silently lost
        for (Stop stop : in.stops()) {
            boolean lockedVisit = in.fixed().stream()
                    .anyMatch(f -> f.visit() && stop.destinationId().equals(f.destinationId()));
            boolean visited = blocks.stream().anyMatch(b ->
                    b.type() == BlockType.VISIT && stop.destinationId().equals(b.destinationId()));
            assertTrue(visited || lockedVisit, "destination lost: " + stop.point().name());
        }

        // return journey present and last in round-trip mode
        if (in.settings().roundTrip && !in.stops().get(in.stops().size() - 1).point().sameAs(in.origin())) {
            Block lastBlock = blocks.get(blocks.size() - 1);
            assertEquals(BlockType.RETURN, lastBlock.type(), "last activity must be the return journey");
            assertTrue(lastBlock.name().contains(in.origin().name()));
        }
    }

    private static long minutes(Plan plan, BlockType... types) {
        long total = 0;
        for (Block b : plan.blocks()) {
            for (BlockType t : types) {
                if (b.type() == t) {
                    total += b.minutes();
                }
            }
        }
        return total;
    }

    private static List<Block> of(Plan plan, BlockType type) {
        List<Block> list = new ArrayList<>();
        for (Block b : plan.blocks()) {
            if (b.type() == type) {
                list.add(b);
            }
        }
        return list;
    }

    // =================================================================
    // 1. one-day itinerary
    // =================================================================

    @Test
    void oneDayRoundTripFitsAndReturns() {
        Roads r = new Roads().leg(ORIGIN, A, 60, 60);
        Input in = input(D1, D1, List.of(stop(1, A, 90)), new Settings(), r);
        Plan plan = ItineraryScheduler.schedule(in);

        assertValid(plan, in);
        assertEquals(1, of(plan, BlockType.RETURN).size());
        assertEquals(D1, plan.blocks().get(plan.blocks().size() - 1).end().toLocalDate());
        // 07:00 breakfast, then travel 07:30 + 66 min planned (60 + 10% buffer)
        assertEquals(LocalTime.of(7, 0), plan.blocks().get(0).start().toLocalTime());
        assertEquals("Breakfast", plan.blocks().get(0).name());
    }

    // =================================================================
    // 2. multi-day, several destinations, spread over the trip days
    // =================================================================

    @Test
    void multiDayTripSpreadsDestinationsAndReturnsOnFinalDay() {
        Roads r = roads();
        LocalDate end = D1.plusDays(6);
        Input in = input(D1, end, List.of(stop(1, A, 120), stop(2, B, 120), stop(3, C, 120)),
                new Settings(), r);
        Plan plan = ItineraryScheduler.schedule(in);

        assertValid(plan, in);
        assertEquals("SPREAD", plan.mode());

        List<Block> visits = of(plan, BlockType.VISIT);
        assertEquals(3, visits.size());
        // spread: visits must not all be on the same day
        assertTrue(visits.get(0).start().toLocalDate().isBefore(visits.get(2).start().toLocalDate()));

        // the return journey reaches the origin on the final trip day
        Block lastBlock = plan.blocks().get(plan.blocks().size() - 1);
        assertEquals(BlockType.RETURN, lastBlock.type());
        assertEquals(end, lastBlock.end().toLocalDate());

        // never returns to origin in the middle of the trip: exactly one return LEG
        // (a long leg may be several chunks, but only the first is not "(continued)")
        long returnLegs = of(plan, BlockType.RETURN).stream()
                .filter(b -> !b.name().endsWith("(continued)")).count();
        assertEquals(1L, returnLegs);
        assertFalse(of(plan, BlockType.FREE_TIME).isEmpty(), "spare days should show free time");
    }

    // =================================================================
    // 3. full 24-hour window: activity that crosses midnight
    // =================================================================

    @Test
    void travelStartingAt1650CrossesMidnightCorrectly() {
        // This is the exact failure from Trip 56: a 450 minute leg starting at 16:50.
        Settings s = noBuffer();
        s.departureTime = LocalTime.of(16, 50);
        s.includeMeals = false;
        s.includeRestStops = false;
        s.includeOvernightRest = false;
        s.spreadAcrossTripDays = false;
        s.maxContinuousTravelMinutes = 600;
        s.roundTrip = false;

        Roads r = new Roads().leg(ORIGIN, A, 450, 505);
        Input in = input(D1, D1.plusDays(1), List.of(stop(1, A, 60)), s, r);
        Plan plan = ItineraryScheduler.schedule(in);
        assertValid(plan, in);

        Block travel = of(plan, BlockType.TRAVEL).get(0);
        assertEquals(LocalDateTime.of(2026, 12, 20, 16, 50), travel.start());
        assertEquals(LocalDateTime.of(2026, 12, 21, 0, 20), travel.end());
        assertEquals(450, travel.minutes());
        assertTrue(travel.end().isAfter(travel.start()), "must not wrap to an earlier time");
    }

    @Test
    void scheduleCanStartAtMidnightAndUseAllTwentyFourHours() {
        Settings s = noBuffer();
        s.departureTime = LocalTime.MIDNIGHT;
        s.includeOvernightRest = false;
        s.roundTrip = false;
        Roads r = new Roads().leg(ORIGIN, A, 300, 300);
        Input in = input(D1, D1, List.of(stop(1, A, 60)), s, r);
        Plan plan = ItineraryScheduler.schedule(in);
        assertValid(plan, in);
        assertEquals(LocalTime.MIDNIGHT, plan.blocks().get(0).start().toLocalTime());
    }

    // =================================================================
    // 4. long leg (450 min): split with rests, nothing double counted
    // =================================================================

    @Test
    void longLegIsSplitIntoChunksAndTotalsExactly450() {
        Settings s = noBuffer();
        s.roundTrip = false;
        s.maxContinuousTravelMinutes = 300;
        Roads r = new Roads().leg(ORIGIN, A, 450, 505);
        Input in = input(D1, D1.plusDays(1), List.of(stop(1, A, 60)), s, r);
        Plan plan = ItineraryScheduler.schedule(in);
        assertValid(plan, in);

        List<Block> travel = of(plan, BlockType.TRAVEL);
        assertTrue(travel.size() >= 2, "a 450 minute leg should be split");
        assertEquals(450, minutes(plan, BlockType.TRAVEL), "chunks must add up to the leg exactly");
        for (Block b : travel) {
            assertTrue(b.minutes() <= 300, "chunk longer than the continuous driving limit");
        }
        double km = 0;
        for (Block b : travel) {
            km += b.distanceKm();
        }
        assertEquals(505.0, km, 0.05);
    }

    // =================================================================
    // 5. round trip vs one way
    // =================================================================

    @Test
    void roundTripEndsAtOriginAndOneWayDoesNot() {
        Roads r = new Roads().leg(ORIGIN, A, 120, 100);

        Settings round = new Settings();
        Plan p1 = ItineraryScheduler.schedule(input(D1, D1.plusDays(1), List.of(stop(1, A, 60)), round, r));
        assertEquals(BlockType.RETURN, p1.blocks().get(p1.blocks().size() - 1).type());

        Settings oneWay = new Settings();
        oneWay.roundTrip = false;
        Plan p2 = ItineraryScheduler.schedule(input(D1, D1.plusDays(1), List.of(stop(1, A, 60)), oneWay, r));
        assertTrue(of(p2, BlockType.RETURN).isEmpty());
        assertEquals(BlockType.VISIT, p2.blocks().get(p2.blocks().size() - 1).type());
    }

    // =================================================================
    // 6/7. opening and closing hours / missing hours
    // =================================================================

    @Test
    void opensLaterIsWaitedForAndClosedForTheDayMovesToTomorrow() {
        Settings s = noBuffer();
        s.departureTime = LocalTime.of(0, 0);
        s.includeMeals = false;
        s.includeRestStops = false;
        s.includeOvernightRest = false;
        s.spreadAcrossTripDays = false;
        s.roundTrip = false;
        Roads r = new Roads().leg(ORIGIN, A, 180, 150);

        // arrives 03:00, opens 09:00
        Stop museum = new Stop(1, A, 120, LocalTime.of(9, 0), LocalTime.of(17, 0), "MUSEUM");
        Input in = input(D1, D1.plusDays(1), List.of(museum), s, r);
        Plan plan = ItineraryScheduler.schedule(in);
        assertValid(plan, in);
        Block visit = of(plan, BlockType.VISIT).get(0);
        assertEquals(LocalDateTime.of(2026, 12, 20, 9, 0), visit.start());
        assertFalse(of(plan, BlockType.REST).isEmpty(), "waiting for opening should be shown");

        // arrives 16:00 (after a 16 h departure), 2 h visit cannot finish before 17:00 -> next day 09:00
        Settings late = noBuffer();
        late.departureTime = LocalTime.of(13, 0);
        late.includeMeals = false;
        late.includeRestStops = false;
        late.includeOvernightRest = false;
        late.spreadAcrossTripDays = false;
        late.roundTrip = false;
        Input in2 = input(D1, D1.plusDays(1), List.of(museum), late, r);
        Plan plan2 = ItineraryScheduler.schedule(in2);
        assertValid(plan2, in2);
        Block visit2 = of(plan2, BlockType.VISIT).get(0);
        assertEquals(LocalDateTime.of(2026, 12, 21, 9, 0), visit2.start());
        assertFalse(visit2.end().toLocalTime().isAfter(LocalTime.of(17, 0)));
    }

    @Test
    void destinationWithoutOpeningHoursIsScheduledFreely() {
        Roads r = new Roads().leg(ORIGIN, A, 60, 60);
        Input in = input(D1, D1, List.of(new Stop(1, A, 60, null, null, null)), new Settings(), r);
        Plan plan = ItineraryScheduler.schedule(in);
        assertValid(plan, in);
        assertEquals("SIGHTSEEING", of(plan, BlockType.VISIT).get(0).category());
    }

    @Test
    void visitsWithoutOpeningHoursWaitForTheEarliestVisitTimeUnlessItIsMidnight() {
        Roads r = new Roads().leg(ORIGIN, A, 180, 150);
        Settings s = noBuffer();
        s.departureTime = LocalTime.MIDNIGHT;
        s.includeMeals = false;
        s.includeRestStops = false;
        s.includeOvernightRest = false;
        s.spreadAcrossTripDays = false;
        s.roundTrip = false;

        // default: no sightseeing before 07:00 -> arrives 03:00, waits
        Input in = input(D1, D1.plusDays(1), List.of(stop(1, A, 60)), s, r);
        Plan plan = ItineraryScheduler.schedule(in);
        assertValid(plan, in);
        assertEquals(LocalTime.of(7, 0), of(plan, BlockType.VISIT).get(0).start().toLocalTime());
        assertTrue(of(plan, BlockType.REST).get(0).name().contains("sightseeing start"));

        // true 24-hour mode: visit immediately on arrival at 03:00
        s.earliestVisitTime = LocalTime.MIDNIGHT;
        Plan plan24 = ItineraryScheduler.schedule(in);
        assertValid(plan24, in);
        assertEquals(LocalTime.of(3, 0), of(plan24, BlockType.VISIT).get(0).start().toLocalTime());
    }

    // =================================================================
    // 8. locked / manual / overlapping fixed blocks
    // =================================================================

    @Test
    void lockedActivityIsNeverOverlappedOrMoved() {
        Roads r = new Roads().leg(ORIGIN, A, 240, 200);
        Fixed locked = new Fixed(LocalDateTime.of(2026, 12, 20, 9, 0),
                LocalDateTime.of(2026, 12, 20, 11, 0), "Locked lunch meeting", null, false);
        Input in = input(D1, D1.plusDays(1), List.of(stop(1, A, 60)), new Settings(), r, locked);
        Plan plan = ItineraryScheduler.schedule(in);
        assertValid(plan, in); // checks no overlap with the fixed block
        // the 07:30 departure had to stop at 09:00 and continue after 11:00
        List<Block> travel = of(plan, BlockType.TRAVEL);
        assertTrue(travel.size() >= 2, "travel should be split around the locked activity");
        assertEquals(LocalDateTime.of(2026, 12, 20, 9, 0), travel.get(0).end());
        assertFalse(travel.get(1).start().isBefore(LocalDateTime.of(2026, 12, 20, 11, 0)));
    }

    @Test
    void manualAndLockedActivitiesThatOverlapEachOtherStillWork() {
        Roads r = new Roads().leg(ORIGIN, A, 60, 60);
        Fixed locked = new Fixed(LocalDateTime.of(2026, 12, 20, 8, 0),
                LocalDateTime.of(2026, 12, 20, 10, 0), "Locked", null, false);
        Fixed manual = new Fixed(LocalDateTime.of(2026, 12, 20, 9, 0),
                LocalDateTime.of(2026, 12, 20, 11, 0), "Manual beach", null, false);
        Input in = input(D1, D1.plusDays(1), List.of(stop(1, A, 60)), new Settings(), r, locked, manual);
        Plan plan = ItineraryScheduler.schedule(in);
        assertValid(plan, in);
        for (Block b : plan.blocks()) {
            boolean inUnion = b.start().isBefore(LocalDateTime.of(2026, 12, 20, 11, 0))
                    && b.end().isAfter(LocalDateTime.of(2026, 12, 20, 8, 0));
            assertFalse(inUnion, "'" + b.name() + "' sits inside the 08:00-11:00 blocked period");
        }
    }

    @Test
    void lockedVisitOfASavedDestinationCountsAsItsVisit() {
        Roads r = new Roads().leg(ORIGIN, A, 60, 60);
        Fixed lockedVisit = new Fixed(LocalDateTime.of(2026, 12, 20, 12, 0),
                LocalDateTime.of(2026, 12, 20, 13, 30), "Visit Chennai", 1, true);
        Input in = input(D1, D1.plusDays(1), List.of(stop(1, A, 90)), new Settings(), r, lockedVisit);
        Plan plan = ItineraryScheduler.schedule(in);
        assertValid(plan, in);
        assertTrue(of(plan, BlockType.VISIT).isEmpty(), "no duplicate visit should be generated");
        assertEquals(BlockType.RETURN, plan.blocks().get(plan.blocks().size() - 1).type());
        assertTrue(plan.blocks().get(plan.blocks().size() - 1).start()
                .isBefore(LocalDateTime.of(2026, 12, 20, 13, 30)) == false);
    }

    // =================================================================
    // 9. missing expected duration
    // =================================================================

    @Test
    void missingExpectedDurationUsesConfigurableDefaultAndSaysSo() {
        Roads r = new Roads().leg(ORIGIN, A, 60, 60);
        Settings s = new Settings();
        s.defaultVisitMinutes = 75;
        Input in = input(D1, D1.plusDays(1), List.of(new Stop(1, A, null, null, null, null)), s, r);
        Plan plan = ItineraryScheduler.schedule(in);
        assertValid(plan, in);
        Block visit = of(plan, BlockType.VISIT).get(0);
        assertEquals(75, visit.minutes());
        assertTrue(visit.estimated());
        assertTrue(plan.warnings().stream().anyMatch(w -> w.contains("75 minutes")));
    }

    @Test
    void userDurationIsNeverReplaced() {
        Roads r = new Roads().leg(ORIGIN, A, 60, 60);
        Input in = input(D1, D1.plusDays(1), List.of(stop(1, A, 137)), new Settings(), r);
        Plan plan = ItineraryScheduler.schedule(in);
        assertEquals(137, of(plan, BlockType.VISIT).get(0).minutes());
        assertFalse(of(plan, BlockType.VISIT).get(0).estimated());
    }

    // =================================================================
    // 10. routing service failure: real RouteCalculator, unreachable OSRM
    // =================================================================

    @Test
    void routingFailureFallsBackToFlaggedEstimatesInsteadOfFailingOrUsingZero() {
        RouteCalculator calc = new RouteCalculator("http://127.0.0.1:9", Duration.ofSeconds(2));
        ItineraryScheduler.LegProvider provider = (from, to) -> {
            RouteCalculator.Result res = calc.calculate(List.of(
                    new RouteCalculator.Stop(null, from.name(), from.latitude(), from.longitude()),
                    new RouteCalculator.Stop(null, to.name(), to.latitude(), to.longitude())));
            RouteCalculator.Leg leg = res.legs.get(0);
            return new Leg(leg.distanceKm, leg.durationMinutes, res.isApproximate(), res.source);
        };

        Input in = new Input(D1, D1.plusDays(6), ORIGIN,
                List.of(stop(1, A, 120), stop(2, B, 120), stop(3, C, 120)),
                null, List.of(), new Settings(), provider);
        Plan plan = ItineraryScheduler.schedule(in);
        assertValid(plan, in);

        for (Block b : plan.blocks()) {
            if (b.type() == BlockType.TRAVEL || b.type() == BlockType.RETURN) {
                assertTrue(b.estimated(), "fallback travel must be flagged as estimated");
                assertEquals("ESTIMATE", b.routeSource());
                assertTrue(b.minutes() > 0);
                assertTrue(b.description().contains("ESTIMATED"));
            }
        }
        assertTrue(plan.warnings().stream().anyMatch(w -> w.contains("straight-line")));
    }

    // =================================================================
    // 11. insufficient dates: honest error, and the suggestion really works
    // =================================================================

    @Test
    void oneDayCannotFitTheLongRoundTripAndTheErrorSaysWhy() {
        Roads r = roads();
        Input in = input(D1, D1, List.of(stop(1, A, 120), stop(2, B, 120), stop(3, C, 120)),
                new Settings(), r);
        InsufficientTimeException e = assertThrows(InsufficientTimeException.class,
                () -> ItineraryScheduler.schedule(in));

        assertTrue(e.getRequiredMinutes() > e.getAvailableMinutes());
        assertTrue(e.getSuggestedExtraDays() >= 1);
        assertTrue(e.getMessage().contains("Origin \u2192 Chennai \u2192 Coimbatore \u2192 Kochi \u2192 Origin"),
                e.getMessage());
        assertTrue(e.getMessage().contains("would fit it"), e.getMessage());

        // The suggestion must be real: extend by that many days and it schedules.
        Input longer = input(D1, D1.plusDays(e.getSuggestedExtraDays()),
                List.of(stop(1, A, 120), stop(2, B, 120), stop(3, C, 120)), new Settings(), r);
        assertValid(ItineraryScheduler.schedule(longer), longer);
    }

    @Test
    void tightTripFallsBackToLeanerPlanAndReportsWhatWasDropped() {
        // Needs ~35 h of pure travel + visits; 2 days = 41 h available from 07:00.
        // With 8 h overnight rest + meals it cannot fit, so rest must be dropped.
        Roads r = new Roads().leg(ORIGIN, A, 1000, 700);
        Settings s = noBuffer();
        Input in = input(D1, D1.plusDays(1), List.of(stop(1, A, 120)), s, r);
        Plan plan = ItineraryScheduler.schedule(in);
        assertValid(plan, in);
        assertFalse(plan.warnings().isEmpty());
        assertTrue(plan.mode().equals("COMPACT") || plan.mode().equals("NO_REST") || plan.mode().equals("NON_STOP"));
    }

    // =================================================================
    // 12. overnight handling and accommodation
    // =================================================================

    @Test
    void overnightStayIsInsertedWhenTravellerWouldBeAwakeTooLong() {
        Roads r = new Roads().leg(ORIGIN, A, 900, 900).leg(A, ORIGIN, 900, 900);
        Settings s = noBuffer();
        Input in = input(D1, D1.plusDays(4), List.of(stop(1, A, 60)), s, r);
        Plan plan = ItineraryScheduler.schedule(in);
        assertValid(plan, in);
        assertFalse(of(plan, BlockType.ACCOMMODATION).isEmpty());
        assertEquals(1800, minutes(plan, BlockType.TRAVEL, BlockType.RETURN));
    }

    @Test
    void selectedAccommodationIsUsedForTheOvernightStay() {
        Point hotel = new Point("Hotel Sea View", 13.05, 80.28);
        Roads r = new Roads().leg(ORIGIN, A, 480, 500).leg(A, ORIGIN, 480, 500)
                .leg(A, hotel, 450, 500).leg(hotel, ORIGIN, 470, 495).leg(hotel, A, 450, 500);
        Settings s = noBuffer();
        Input in = new Input(D1, D1.plusDays(3), ORIGIN, List.of(stop(1, A, 600)), hotel,
                List.of(), s, r);
        Plan plan = ItineraryScheduler.schedule(in);
        assertValid(plan, in);
        assertTrue(plan.blocks().stream().anyMatch(b ->
                b.type() == BlockType.ACCOMMODATION && b.name().contains("Hotel Sea View")));
        List<Block> hotelTravel = plan.blocks().stream()
                .filter(b -> b.type() == BlockType.TRAVEL && b.name().contains("overnight accommodation"))
                .toList();
        assertTrue(hotelTravel.size() > 1, "long hotel journeys should be split into driving chunks");
        assertEquals(450, hotelTravel.stream().mapToInt(Block::minutes).sum());
        assertTrue(hotelTravel.stream().allMatch(b -> b.minutes() <= s.maxContinuousTravelMinutes));
        assertTrue(of(plan, BlockType.REST).stream().anyMatch(b -> b.name().equals("Rest stop")));
    }

    // =================================================================
    // 13. no double counting, determinism, edge cases
    // =================================================================

    @Test
    void travelTimeIsCountedOnceAndMatchesThePlannedLegs() {
        Roads r = roads();
        Settings s = noBuffer();
        s.spreadAcrossTripDays = false;
        Input in = input(D1, D1.plusDays(6), List.of(stop(1, A, 100), stop(2, B, 100), stop(3, C, 100)), s, r);
        Plan plan = ItineraryScheduler.schedule(in);
        assertValid(plan, in);
        assertEquals(420 + 450 + 240 + 690, minutes(plan, BlockType.TRAVEL, BlockType.RETURN));
        assertEquals(300, minutes(plan, BlockType.VISIT));
        double km = 0;
        for (Block b : plan.blocks()) {
            if (b.distanceKm() != null) {
                km += b.distanceKm();
            }
        }
        assertEquals(505 + 505 + 195 + 840, km, 0.2);
    }

    @Test
    void sameInputGivesSamePlan() {
        Input in = input(D1, D1.plusDays(4), List.of(stop(1, A, 100), stop(2, B, 100)), new Settings(),
                roads().leg(B, ORIGIN, 500, 600));
        assertEquals(ItineraryScheduler.schedule(in).blocks(), ItineraryScheduler.schedule(in).blocks());
    }

    @Test
    void firstDestinationAtTheOriginNeedsNoTravelLeg() {
        Point sameAsOrigin = new Point("Home city", ORIGIN.latitude(), ORIGIN.longitude());
        Roads r = new Roads().leg(ORIGIN, B, 120, 100).leg(sameAsOrigin, B, 120, 100);
        Input in = input(D1, D1.plusDays(2), List.of(stop(1, sameAsOrigin, 60), stop(2, B, 60)), new Settings(), r);
        Plan plan = ItineraryScheduler.schedule(in);
        assertValid(plan, in);
        assertTrue(of(plan, BlockType.TRAVEL).stream().noneMatch(b -> b.name().contains("Home city")));
    }

    // =================================================================
    // 14. randomised: every outcome is a valid plan or an honest, correct error
    // =================================================================

    @Test
    void randomisedTripsAreAlwaysValidOrFailHonestly() {
        java.util.Random rnd = new java.util.Random(20261220L);
        Point[] places = {A, B, C, new Point("Madurai", 9.92, 78.12), new Point("Mysuru", 12.30, 76.64)};
        int planned = 0;
        int rejected = 0;

        for (int round = 0; round < 400; round++) {
            Roads r = new Roads();
            int stopCount = 1 + rnd.nextInt(4);
            List<Stop> stops = new ArrayList<>();
            List<Point> chain = new ArrayList<>();
            chain.add(ORIGIN);
            for (int i = 0; i < stopCount; i++) {
                Point p = places[i];
                chain.add(p);
                LocalTime opens = rnd.nextInt(3) == 0 ? LocalTime.of(6 + rnd.nextInt(5), 0) : null;
                LocalTime closes = opens != null ? opens.plusHours(6 + rnd.nextInt(8)) : null;
                Integer visit = rnd.nextInt(5) == 0 ? null : 30 + rnd.nextInt(300);
                stops.add(new Stop(i + 1, p, visit, opens, closes, null));
            }
            chain.add(ORIGIN);
            for (int i = 0; i + 1 < chain.size(); i++) {
                if (!chain.get(i).sameAs(chain.get(i + 1))) {
                    r.leg(chain.get(i), chain.get(i + 1), 10 + rnd.nextInt(890), 10 + rnd.nextInt(900));
                }
            }

            Settings s = new Settings();
            s.roundTrip = rnd.nextInt(4) != 0;
            s.spreadAcrossTripDays = rnd.nextBoolean();
            s.includeOvernightRest = rnd.nextBoolean();
            s.departureTime = LocalTime.of(rnd.nextInt(24), rnd.nextInt(4) * 15);
            s.travelBufferPercent = rnd.nextInt(3) * 10;
            s.maxContinuousTravelMinutes = 120 + rnd.nextInt(400);

            LocalDate end = D1.plusDays(rnd.nextInt(8));
            List<Fixed> fixed = new ArrayList<>();
            for (int i = rnd.nextInt(4); i > 0; i--) {
                LocalDateTime st = D1.atStartOfDay().plusMinutes(rnd.nextInt(8 * 24 * 60));
                fixed.add(new Fixed(st, st.plusMinutes(20 + rnd.nextInt(400)), "fixed" + i, null, false));
            }

            Input in = new Input(D1, end, ORIGIN, stops, null, fixed, s, r);
            try {
                Plan plan = ItineraryScheduler.schedule(in);
                assertValid(plan, in);
                planned++;
            } catch (InsufficientTimeException e) {
                rejected++;
                assertTrue(e.getMessage().length() > 40, "error should explain itself");
                if (e.getSuggestedExtraDays() > 0) {
                    Input longer = new Input(D1, end.plusDays(e.getSuggestedExtraDays()), ORIGIN, stops,
                            null, fixed, s, r);
                    assertValid(ItineraryScheduler.schedule(longer), longer);
                }
            }
        }
        assertTrue(planned > 50, "expected a healthy mix of fitting trips, got " + planned);
        assertTrue(rejected > 10, "expected some genuinely impossible trips, got " + rejected);
    }

    @Test
    void invalidInputsAreRejectedClearly() {
        Roads r = roads();
        assertThrows(IllegalArgumentException.class, () -> ItineraryScheduler.schedule(
                input(D1.plusDays(1), D1, List.of(stop(1, A, 60)), new Settings(), r)));
        assertThrows(IllegalArgumentException.class, () -> ItineraryScheduler.schedule(
                input(D1, D1, List.of(), new Settings(), r)));
    }
}
