package backend.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import backend.service.MlServiceClient;

@RestController
@RequestMapping("/api/ml")
public class MlServiceController {

    private final MlServiceClient mlServiceClient;

    public MlServiceController(MlServiceClient mlServiceClient) {
        this.mlServiceClient = mlServiceClient;
    }

    @GetMapping("/health")
    public Map checkMlServiceHealth() {
        return mlServiceClient.checkHealth();
    }
}
