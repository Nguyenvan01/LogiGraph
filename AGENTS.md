# AGENTS.md 


<!-- - Không đọc thư mục orca -->

## Commands

- Cài: `python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt`
- Kiểm tra: `.venv/bin/pytest -q` (gồm test cấm dict/set trong `logigraph/core/`)

## Agent skills

### Issue tracker

Local markdown issue tracker under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical triage roles mapped to standard labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`CONTEXT.md` + `docs/adr/`). See `docs/agents/domain.md`.