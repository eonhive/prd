# NEXT STEPS

1. Add CLI snapshot tests for text and JSON outputs to guard against accidental output-contract drift.
2. Add command-level integration tests that execute the built `prd` binary end-to-end (not just `runCli`) for `pack`, `validate`, and `inspect`.
3. Document the stable CLI output contract in package-level CLI docs so downstream tooling can rely on it explicitly.
4. Add table-driven tests for every `entry-*` path validation code (`entry-absolute`, `entry-backslash`, `entry-url`, `entry-directory`, etc.).
5. Add a dedicated validator test matrix for profile-specific entry compatibility across `general-document`, `comic`, and `storyboard`.
6. Add CLI integration tests that assert machine-readable issue codes are emitted unchanged by CLI formatting.
