# Runtime evidence

This directory is reserved for verified screenshots from a real project run.
GitHub Actions also creates a temporary `ci-evidence` artifact during the
Docker-integration job. Generated artifact files are ignored under `ci/` and do
not need to be committed.

## Evidence checklist

Use the following file names so that the evidence remains easy to review:

| File | What the screenshot must show | Suggested source |
| --- | --- | --- |
| `01-ci-pipeline-success.png` | One successful workflow run with `Lint`, `Unit tests`, `Frontend build`, and `Backend build and integration` green | GitHub Actions summary page |
| `02-ci-evidence-artifact.png` | The downloadable artifact named `ci-evidence` | Bottom of the same workflow summary |
| `03-microservices-containers.png` | Gateway and backend service replicas running; successful one-shot jobs may show `Exited (0)` | `docker compose ps -a` |
| `04-kafka-consumer-groups.png` | A required Kafka group with active members and offsets | `kafka-consumer-groups.sh --describe` output |
| `05-system-integration.png` | Successful system integration checks for scaling, Kafka, Elasticsearch, and AI grounding | `npm run system:integration` |
| `06-ai-product-assistant.png` | The chatbot returning real catalog product cards with usable product links | Storefront chatbot |
| `07-elasticsearch-count.png` | A non-zero count for the `products_v1` index | Elasticsearch `_count` response |
| `08-elasticsearch-product-search.png` | A keyword search showing matching catalog products | Storefront search or Search API response |

The first, third, sixth, seventh, and eighth images provide the minimum useful
coverage. The remaining images make the evidence more convincing.

## Capture commands

Run from `source/` after the stack is healthy:

```powershell
docker compose ps -a
docker compose exec -T kafka /opt/kafka/bin/kafka-consumer-groups.sh --bootstrap-server kafka:9092 --describe --group notification-order-group --members
npm run system:integration
docker compose exec -T elasticsearch curl -s http://localhost:9200/products_v1/_count
```

For the AI screenshot, sign in to the storefront, open the assistant, and ask
for a concrete catalog recommendation such as “gaming laptop under 35 million
VND”. Product names, prices, and links should match the catalog.

## Safety and Git checks

Crop screenshots to the relevant window. Do not expose `.env` values, API keys,
cookies, access tokens, SMTP credentials, payment secrets, personal browser
tabs, or private information. Verify a screenshot is allowed by Git with:

```powershell
git check-ignore -v Bonus/evidence/01-ci-pipeline-success.png
git status --short
```

The first command should produce no output, and the new screenshot should
appear as `??` in `git status`. Do not place manual screenshots inside
`Bonus/evidence/ci/`, because that generated directory is intentionally
ignored.
