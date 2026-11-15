import backend.dto.*; import backend.exception.ItineraryException; import backend.service.ItineraryService;
import java.time.*; import java.util.*;
public class Trip56Matrix { public static void main(String[] a) throws Exception {
  ItineraryService s = ServiceHarness.service(); LocalDate d0 = LocalDate.of(2026,12,20);
  for (int days = 1; days <= 6; days++) {
    ServiceHarness.reset(d0, d0.plusDays(days-1));
    try { List<ItineraryActivityResponse> r = s.generateItinerary(7, 56);
      ItinerarySummaryResponse m = s.getSummary(7, 56);
      long cross = r.stream().filter(ItineraryActivityResponse::getCrossesMidnight).count();
      String mode = s.getSummary(7,56).getWarnings().stream().filter(w -> w.contains("tight") || w.contains("removed")).findFirst().orElse("comfortable plan");
      System.out.printf("%d day(s): FITS  %d activities, travel %s, ends %s, midnight-crossers=%d  [%s]%n", days, r.size(), fmt(m.getTotalTravelMinutes()), m.getLastEnd(), cross, mode.length()>70?mode.substring(0,70)+"...":mode);
    } catch (ItineraryException e) { String msg=e.getMessage(); System.out.printf("%d day(s): HTTP %d  %s%n", days, e.getStatus(), msg.substring(msg.indexOf("It needs"), Math.min(msg.length(), msg.indexOf("It needs")+330))); }
  } }
  static String fmt(long m){ return (m/60)+"h"+(m%60)+"m"; } }
