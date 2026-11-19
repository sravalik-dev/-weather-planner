These files are NOT part of your project. They are the evidence of what I ran.

engine-tests.log          the 24 tests in backend/src/test/.../ItinerarySchedulerTest.java, run in a sandbox
                          with a minimal stand-in for the JUnit API (the same file uses the real JUnit 5
                          annotations; run it yourself with: .\mvnw.cmd test -Dtest=ItinerarySchedulerTest)
service-end-to-end.log    the REAL ItineraryService run against in-memory fake repositories (ServiceHarness.java).
                          Spring/JPA were replaced by stubs, so this proves the logic, not the Spring wiring.
trip56-scenarios.log      your 3 destinations for 1..6 day trips (origin ASSUMED, straight-line fallback times
                          because OSRM was unreachable in the sandbox, so treat the hours as an upper bound)
frontend-helpers.log      the new React helper functions executed in Node (frontend-helpers = helpers_test.js)
