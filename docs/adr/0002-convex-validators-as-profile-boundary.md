# Convex Validators As Profile Boundary

Candidate Profile data and Imported CV snapshots are validated at the Convex boundary, including concrete query return validators and rejection of invalid calendar month values. We chose strict runtime validation over permissive snapshots because Imported CV extraction and manual editing both feed the same source of truth, and malformed profile facts should fail before they are stored or applied.
