# Runtime evidence

GitHub Actions creates and uploads the `ci-evidence` artifact during the Docker
integration job. The generated CI files are temporary workflow output and do
not need to be committed to this repository.

For an academic submission, verified screenshots or selected redacted logs may
be placed in this directory. Before committing them, confirm that they contain
no `.env` values, API keys, session cookies, access tokens, email credentials,
payment secrets, personal information, or other sensitive data.
