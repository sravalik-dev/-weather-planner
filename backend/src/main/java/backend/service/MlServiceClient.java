package backend.service;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MlServiceClient {

    private final RestClient restClient;

    public MlServiceClient(
            @Value("${ml.service.base-url:http://localhost:8000}") String mlServiceBaseUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(mlServiceBaseUrl)
                .build();
    }

    public Map<String, Object> checkHealth() {
        return get("/health");
    }

    public Map<String, Object> predictSuitability(
            Map<String, Object> payload) {
        return post("/ml/predict-suitability", payload);
    }

    public Map<String, Object> generateItinerary(
            Map<String, Object> payload) {
        return post("/ml/generate-itinerary", payload);
    }

    public Map<String, Object> replanItinerary(
            Map<String, Object> payload) {
        return post("/ml/replan-itinerary", payload);
    }

    private Map<String, Object> get(String path) {
        try {
            return restClient.get()
                    .uri(path)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});

        } catch (RestClientException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Unable to connect to the Python ML service.",
                    exception);
        }
    }

    private Map<String, Object> post(
            String path,
            Map<String, Object> payload) {
        try {
            return restClient.post()
                    .uri(path)
                    .body(payload)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});

        } catch (RestClientException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Python ML service request failed: " + path,
                    exception);
        }
    }
}
