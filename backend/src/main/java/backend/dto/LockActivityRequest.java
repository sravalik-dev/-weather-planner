package backend.dto;

public class LockActivityRequest {

    private Boolean locked;

    public LockActivityRequest() {
    }

    public Boolean getLocked() {
        return locked;
    }

    public void setLocked(Boolean locked) {
        this.locked = locked;
    }
}