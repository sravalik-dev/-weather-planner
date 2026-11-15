import backend.dto.*;
import backend.entity.*;
import backend.exception.ItineraryException;
import backend.repository.*;
import backend.service.*;
import backend.service.itinerary.ItineraryProperties;
import org.springframework.transaction.support.TransactionTemplate;
import java.lang.reflect.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;

public class ServiceHarness {

    // ---------- in-memory persistence via dynamic proxies ----------
    static final List<ItineraryActivity> ACT = new ArrayList<>();
    static final List<ItineraryHistory> HIST = new ArrayList<>();
    static final List<TripDestination> DEST = new ArrayList<>();
    static Trip TRIP; static int nextId = 1;
    static volatile CountDownLatch gate = null, entered = null;

    @SuppressWarnings("unchecked")
    static <T> T proxy(Class<T> type, InvocationHandler h) {
        return (T) Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[]{type}, h);
    }

    static ItineraryActivityRepository actRepo = proxy(ItineraryActivityRepository.class, (p, m, a) -> {
        switch (m.getName()) {
            case "findByTrip_TripIdOrderByActivityDateAscOrderIndexAsc": {
                if (entered != null) { entered.countDown(); gate.await(); }
                List<ItineraryActivity> l = new ArrayList<>(ACT);
                l.sort(Comparator.comparing(ItineraryActivity::getActivityDate).thenComparing(x -> x.getOrderIndex() == null ? 0 : x.getOrderIndex()));
                return l; }
            case "findByTrip_TripIdAndActivityDateOrderByOrderIndexAsc": {
                List<ItineraryActivity> l = new ArrayList<>();
                for (ItineraryActivity x : ACT) if (x.getActivityDate().equals(a[1])) l.add(x);
                return l; }
            case "findByActivityIdAndTrip_TripId":
                for (ItineraryActivity x : ACT) if (x.getActivityId().equals(a[0])) return Optional.of(x);
                return Optional.empty();
            case "deleteAll": ACT.removeAll((Collection<?>) a[0]); return null;
            case "delete": ACT.remove(a[0]); return null;
            case "flush": return null;
            case "save": { ItineraryActivity x = (ItineraryActivity) a[0]; if (x.getActivityId() == null) { x.setActivityId(nextId++); ACT.add(x);} return x; }
            case "saveAll": { List<ItineraryActivity> out = new ArrayList<>(); for (Object o : (Iterable<?>) a[0]) { ItineraryActivity x = (ItineraryActivity) o; if (x.getActivityId() == null) { x.setActivityId(nextId++); ACT.add(x);} out.add(x);} return out; }
        }
        throw new UnsupportedOperationException(m.getName()); });

    static TripRepository tripRepo = proxy(TripRepository.class, (p, m, a) -> {
        if (m.getName().equals("findByTripIdAndUser_UserId")) return TRIP.getTripId().equals(a[0]) && a[1].equals(7) ? Optional.of(TRIP) : Optional.empty();
        throw new UnsupportedOperationException(m.getName()); });

    static TripDestinationRepository destRepo = proxy(TripDestinationRepository.class, (p, m, a) -> {
        if (m.getName().equals("findByTrip_TripIdOrderByDestinationOrderAsc")) { List<TripDestination> l = new ArrayList<>(DEST); l.sort(Comparator.comparing(TripDestination::getDestinationOrder)); return l; }
        if (m.getName().equals("findByDestinationIdAndTrip_TripId")) { for (TripDestination d : DEST) if (d.getDestinationId().equals(a[0])) return Optional.of(d); return Optional.empty(); }
        throw new UnsupportedOperationException(m.getName()); });

    static ItineraryHistoryRepository histRepo = proxy(ItineraryHistoryRepository.class, (p, m, a) -> {
        if (m.getName().equals("save")) { HIST.add((ItineraryHistory) a[0]); return a[0]; }
        if (m.getName().equals("findByTrip_TripIdOrderByCreatedAtDesc")) { List<ItineraryHistory> l = new ArrayList<>(HIST); Collections.reverse(l); return l; }
        throw new UnsupportedOperationException(m.getName()); });

    static AccommodationHistoryRepository accRepo = proxy(AccommodationHistoryRepository.class, (p, m, a) -> {
        if (m.getName().equals("findUserTripHistory")) return List.of();
        throw new UnsupportedOperationException(m.getName()); });

    static class FakeLocations extends LocationService {
        @Override public List<Map<String, Object>> searchLocations(String name) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("latitude", 16.5062); m.put("longitude", 80.6480); return List.of(m); } }

    static ItineraryService service() throws Exception {
        ItineraryProperties props = new ItineraryProperties();
        Object[][] v = {{"departureTime","07:00"},{"earliestVisitTime","07:00"},{"defaultVisitMinutes",90},{"travelBufferPercent",10.0},{"travelBufferMinutes",0},
            {"maxContinuousTravelMinutes",300},{"restStopMinutes",20},{"maxAwakeMinutes",960},{"overnightRestMinutes",480},
            {"breakfast","07:00-10:30/30"},{"lunch","12:00-15:00/45"},{"dinner","19:00-22:30/45"}};
        for (Object[] kv : v) { Field f = ItineraryProperties.class.getDeclaredField((String) kv[0]); f.setAccessible(true); f.set(props, kv[1]); }
        // port 9 = nothing listens: exercises the real OSRM-failure fallback
        return new ItineraryService(tripRepo, destRepo, actRepo, histRepo, accRepo,
                new OriginLocationResolver(new FakeLocations()), props, new TransactionTemplate(), "http://127.0.0.1:9", 2);
    }

    static void reset(LocalDate start, LocalDate end) {
        ACT.clear(); HIST.clear(); DEST.clear(); nextId = 1;
        User u = new User(); u.setUserId(7);
        TRIP = new Trip(); TRIP.setTripId(56); TRIP.setUser(u); TRIP.setOrigin("Vijayawada"); TRIP.setStartDate(start); TRIP.setEndDate(end);
        dest(1, "Chennai", 13.08784, 80.27847, 120);
        dest(2, "Coimbatore", 11.00555, 76.96612, 120);
        dest(3, "Kochi", 9.9312, 76.2673, null);
    }
    static void dest(int id, String n, double la, double lo, Integer dur) {
        TripDestination d = new TripDestination(); d.setDestinationId(id); d.setTrip(TRIP); d.setDestinationName(n);
        d.setLatitude(la); d.setLongitude(lo); d.setDestinationOrder(id); d.setExpectedDuration(dur); DEST.add(d); }

    static int failures = 0;
    static void check(boolean ok, String what) { System.out.println((ok ? "  ok   " : "  FAIL ") + what); if (!ok) failures++; }

    static void print(List<ItineraryActivityResponse> list) {
        for (ItineraryActivityResponse r : list)
            System.out.printf("   %s %s -> %s %-13s %-42s %5s min %s%s%n", r.getActivityDate(), r.getStartTime(), (r.getCrossesMidnight() ? r.getEndDate() + " " : "") + r.getEndTime(),
                r.getActivityType(), r.getActivityName(), r.getDuration(), r.getDistanceKm() == null ? "" : r.getDistanceKm() + "km", Boolean.TRUE.equals(r.getEstimated()) ? " [est]" : "");
    }

    public static void main(String[] args) throws Exception {
        ItineraryService s = service();
        LocalDate d0 = LocalDate.of(2026, 12, 20);

        System.out.println("\n== S1: one-day trip that genuinely cannot fit");
        reset(d0, d0);
        try { s.generateItinerary(7, 56); check(false, "should have thrown"); }
        catch (ItineraryException e) { check(e.getStatus() == 422, "HTTP status 422, not 400 (was " + e.getStatus() + ")"); System.out.println("   message: " + e.getMessage());
            check(e.getMessage().contains("would fit it") || e.getMessage().contains("Extend"), "message gives a way forward"); }
        check(ACT.isEmpty(), "nothing was saved or deleted on failure");

        System.out.println("\n== S2: 8-day trip, OSRM unreachable -> flagged estimates");
        reset(d0, d0.plusDays(7));
        List<ItineraryActivityResponse> out = s.generateItinerary(7, 56);
        print(out);
        check(out.stream().anyMatch(r -> "RETURN".equals(r.getActivityType())), "return journey present as its own activity");
        check(out.stream().filter(r -> "VISIT".equals(r.getActivityType())).count() == 3, "all 3 destinations visited");
        check(out.stream().filter(r -> "VISIT".equals(r.getActivityType())).allMatch(r -> r.getDestinationId() != null), "visit activities carry destinationId");
        check(out.stream().filter(r -> r.getActivityType().equals("TRAVEL") || r.getActivityType().equals("RETURN")).allMatch(r -> r.getEstimated() && "ESTIMATE".equals(r.getRouteSource()) && r.getDuration() > 0), "every fallback travel is flagged estimated and > 0 min");
        long cross = out.stream().filter(ItineraryActivityResponse::getCrossesMidnight).count();
        System.out.println("   activities crossing midnight: " + cross);
        check(out.stream().allMatch(r -> r.getEndDateTime().isAfter(r.getStartDateTime())), "no activity ends before it starts");
        List<ItineraryActivityResponse> sorted = new ArrayList<>(out); sorted.sort(Comparator.comparing(ItineraryActivityResponse::getStartDateTime));
        boolean overlap = false; for (int i = 1; i < sorted.size(); i++) if (sorted.get(i).getStartDateTime().isBefore(sorted.get(i - 1).getEndDateTime())) overlap = true;
        check(!overlap, "no overlapping activities");
        check(out.stream().allMatch(r -> !r.getStartDateTime().toLocalDate().isBefore(d0) && !r.getEndDateTime().isAfter(d0.plusDays(7).atTime(23, 59))), "everything inside the trip dates");
        check(out.stream().allMatch(r -> r.getGenerated()), "all marked generated");
        ItinerarySummaryResponse sum = s.getSummary(7, 56);
        System.out.printf("   summary: %d activities, travel %d min, visits %d min, %.1f km, return %.1f km / %d min, estimated=%s%n", sum.getActivityCount(), sum.getTotalTravelMinutes(), sum.getTotalVisitMinutes(), sum.getTotalDistanceKm(), sum.getReturnDistanceKm(), sum.getReturnTravelMinutes(), sum.getHasEstimatedTravel());
        check(sum.getReturnIncluded() && sum.getHasEstimatedTravel(), "summary: return included, estimates flagged");
        check(sum.getWarnings().stream().anyMatch(w -> w.contains("straight-line")), "summary carries the routing-fallback warning");
        check(sum.getDays().stream().mapToLong(ItinerarySummaryResponse.Day::getScheduledMinutes).sum() > 0 && sum.getDays().size() >= 2, "per-day durations present");
        long dayTravel = sum.getDays().stream().mapToLong(ItinerarySummaryResponse.Day::getTravelMinutes).sum();
        check(dayTravel == sum.getTotalTravelMinutes(), "per-day travel adds up to total travel (midnight split loses nothing): " + dayTravel);

        System.out.println("\n== S3: locked + manual activities survive regeneration");
        // lock a generated visit? no: add a manual 'beach' and a locked appointment
        ItineraryActivityRequest manual = new ItineraryActivityRequest();
        manual.setDestinationId(null); manual.setActivityDate(d0.plusDays(3)); manual.setStartTime(LocalTime.of(9, 0)); manual.setEndTime(LocalTime.of(10, 0));
        manual.setActivityName("beach"); manual.setCategory("Custom"); manual.setDuration(60); manual.setLocked(false);
        ItineraryActivityResponse beach = s.addActivity(7, 56, manual);
        ItineraryActivityRequest lockReq = new ItineraryActivityRequest();
        lockReq.setActivityDate(d0.plusDays(1)); lockReq.setStartTime(LocalTime.of(8, 0)); lockReq.setEndTime(LocalTime.of(12, 0));
        lockReq.setActivityName("Family wedding"); lockReq.setCategory("Custom"); lockReq.setDuration(240); lockReq.setLocked(true);
        ItineraryActivityResponse wedding = s.addActivity(7, 56, lockReq);
        check(!beach.getGenerated() && "CUSTOM".equals(beach.getActivityType()), "manual activity is marked manual (destinationId null is intentional)");
        Set<Integer> oldGeneratedIds = new HashSet<>(); for (ItineraryActivity a : ACT) if (a.isGeneratedActivity()) oldGeneratedIds.add(a.getActivityId());
        List<ItineraryActivityResponse> again = s.generateItinerary(7, 56);
        print(again.stream().filter(r -> !r.getGenerated() || r.getLocked()).toList());
        check(again.stream().anyMatch(r -> r.getActivityId().equals(beach.getActivityId())), "manual 'beach' still exists (old code deleted it)");
        check(again.stream().anyMatch(r -> r.getActivityId().equals(wedding.getActivityId()) && r.getLocked()), "locked wedding still exists and locked");
        check(again.stream().noneMatch(r -> oldGeneratedIds.contains(r.getActivityId())), "old generated rows were replaced");
        List<ItineraryActivityResponse> others = again.stream().filter(r -> r.getGenerated() && !r.getLocked()).toList();
        boolean clash = false;
        for (ItineraryActivityResponse o : others) for (ItineraryActivityResponse f : again) if (!f.getGenerated() || f.getLocked())
            if (o.getStartDateTime().isBefore(f.getEndDateTime()) && o.getEndDateTime().isAfter(f.getStartDateTime())) clash = true;
        check(!clash, "no generated activity overlaps a locked/manual one");
        Map<LocalDate, Set<Integer>> idx = new HashMap<>(); boolean dup = false;
        for (ItineraryActivityResponse r : again) if (!idx.computeIfAbsent(r.getActivityDate(), k -> new HashSet<>()).add(r.getOrderIndex())) dup = true;
        check(!dup, "orderIndex unique per day");

        System.out.println("\n== S4: duplicate Generate request while one is running");
        entered = new CountDownLatch(1); gate = new CountDownLatch(1);
        ExecutorService ex = Executors.newSingleThreadExecutor();
        Future<?> first = ex.submit(() -> s.generateItinerary(7, 56));
        entered.await();
        try { s.generateItinerary(7, 56); check(false, "second call should be rejected"); }
        catch (ItineraryException e) { check(e.getStatus() == 409, "second concurrent call -> 409: " + e.getMessage()); }
        gate.countDown(); first.get(); entered = null;
        try { s.generateItinerary(7, 56); check(true, "lock released: a later call works"); } catch (Exception e) { check(false, "lock not released " + e); }
        ex.shutdown();

        System.out.println("\n== S5: manual activity crossing midnight / validation");
        ItineraryActivityRequest night = new ItineraryActivityRequest();
        night.setActivityDate(d0.plusDays(2)); night.setStartTime(LocalTime.of(23, 0)); night.setEndTime(LocalTime.of(1, 30)); night.setEndDate(d0.plusDays(3));
        night.setActivityName("Night market"); night.setCategory("Custom"); night.setDuration(150);
        ItineraryActivityResponse nm = s.addActivity(7, 56, night);
        check(nm.getCrossesMidnight() && nm.getEndDate().equals(d0.plusDays(3)), "23:00 -> 01:30 next day is stored and flagged as crossing midnight");
        night.setEndDate(null); night.setActivityName("bad");
        try { s.addActivity(7, 56, night); check(false, "wrapped time without endDate must be rejected"); } catch (RuntimeException e) { check(e.getMessage().contains("set the end date"), "wrapped time without endDate rejected: " + e.getMessage()); }
        ItineraryActivityRequest late = new ItineraryActivityRequest();
        late.setActivityDate(d0.plusDays(7)); late.setStartTime(LocalTime.of(23, 0)); late.setEndTime(LocalTime.of(1, 0)); late.setEndDate(d0.plusDays(8)); late.setActivityName("late"); late.setDuration(120);
        try { s.addActivity(7, 56, late); check(false, "past the trip end must be rejected"); } catch (RuntimeException e) { check(e.getMessage().contains("within the trip dates"), "activity ending after trip end rejected: " + e.getMessage()); }

        System.out.println("\n== S6: legacy rows (no new columns) are handled");
        reset(d0, d0.plusDays(7));
        ItineraryActivity legacyCustom = legacy("My custom", "Custom", null, LocalTime.of(14, 0), LocalTime.of(15, 0));
        ItineraryActivity legacyTravel = legacy("Travel to X", "TRAVEL", null, LocalTime.of(8, 0), LocalTime.of(9, 0));
        s.generateItinerary(7, 56);
        check(ACT.contains(legacyCustom), "legacy Custom row (generated=NULL) preserved");
        check(!ACT.contains(legacyTravel), "legacy TRAVEL row (generated=NULL) replaced");

        System.out.println("\n== S7: one-way + route optimisation options");
        reset(d0, d0.plusDays(7));
        GenerateItineraryRequest o = new GenerateItineraryRequest(); o.setRoundTrip(false); o.setOptimizeRoute(true);
        List<ItineraryActivityResponse> oneWay = s.generateItinerary(7, 56, o);
        check(oneWay.stream().noneMatch(r -> "RETURN".equals(r.getActivityType())), "round trip off -> no return journey");
        check(s.getSummary(7, 56).getWarnings().stream().anyMatch(w -> w.contains("optimisation")), "optimised order is announced");

        System.out.println("\n== S8: wrong user cannot generate");
        try { s.generateItinerary(99, 56); check(false, "must be rejected"); } catch (RuntimeException e) { check(e.getMessage().contains("not found"), "other user's trip rejected: " + e.getMessage()); }

        System.out.println("\n" + (failures == 0 ? "ALL SERVICE CHECKS PASSED" : failures + " CHECK(S) FAILED"));
        System.exit(failures == 0 ? 0 : 1);
    }

    static ItineraryActivity legacy(String name, String cat, TripDestination dest, LocalTime st, LocalTime en) {
        ItineraryActivity a = new ItineraryActivity(); a.setActivityId(nextId++); a.setTrip(TRIP); a.setDestination(dest);
        a.setActivityDate(LocalDate.of(2026, 12, 22)); a.setStartTime(st); a.setEndTime(en); a.setActivityName(name); a.setCategory(cat);
        a.setDuration(60); a.setOrderIndex(1); a.setLocked(false); ACT.add(a); return a; }
}
