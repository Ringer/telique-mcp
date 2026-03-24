# CPR URL Map Addition — Handoff for Frontend Team

## Context

The telique-mcp server includes a `routelink_cpr` tool that retrieves Call Processing Records (CPR decision trees) for toll-free numbers. All other RouteLink endpoints have canonical `/v1/telique/*` paths in the load balancer URL map, but CPR currently does not.

## What's Needed

Add a path rule to `ringer-telique-frontend/terraform/url-map.tf` that routes `/v1/telique/cpr/*` to the RouteLink backend with a rewrite to `/cpr/`.

### Suggested Terraform Change

In `url-map.tf`, within the `path_matcher` block that handles `/v1/telique/*` routes, add a new `path_rule`:

```hcl
path_rule {
  paths = ["/v1/telique/cpr/*"]
  service = google_compute_backend_service.routelink.id
  route_action {
    url_rewrite {
      path_prefix_rewrite = "/cpr/"
    }
  }
}
```

This follows the same pattern as the existing RouteLink rules for `/v1/telique/cic/*`, `/v1/telique/cicror/*`, and `/v1/telique/ror/*`.

### Existing RouteLink Path Rules (for reference)

```
/v1/telique/ror/*    → /ror/     → routelink backend
/v1/telique/cic/*    → /cic/     → routelink backend
/v1/telique/cicror/* → /cicror/  → routelink backend
```

### New Rule

```
/v1/telique/cpr/*    → /cpr/     → routelink backend
```

## Impact

- The `routelink_cpr` MCP tool currently falls back to `/cpr/{crn}` via the default backend, which happens to route to LERG. Once this path rule is added, CPR requests will correctly route to the RouteLink backend.
- No changes needed to the RouteLink API itself — it already serves `/cpr/{crn}` on its internal port.

## Endpoints Affected

```
GET /v1/telique/cpr/{crn}?format=json&expand=true
```

Where `crn` is a 1-10 digit toll-free number or template CRN.
